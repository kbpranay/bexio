import express from "express";
import axios from "axios";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config();

// Lazy-initialize Firebase Admin (safe for serverless cold starts)
let db: ReturnType<typeof getFirestore>;

function getDb() {
  if (!db) {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: firebaseConfig.projectId });
    }
    db = getFirestore(admin.app(), firebaseConfig.firestoreDatabaseId);
  }
  return db;
}

const app = express();
app.use(express.json());

const BEXIO_API_URL = "https://api.bexio.com/2.0";

async function syncBexioData() {
  const apiKey = process.env.BEXIO_API_KEY;
  if (!apiKey) {
    throw new Error("BEXIO_API_KEY environment variable is not set. Please add it to your Vercel project settings.");
  }

  const firestore = getDb();
  console.log("Starting Bexio sync...");

  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  // 1. Fetch Invoices (paginated)
  let invoices: any[] = [];
  try {
    let offset = 0;
    const limit = 500;
    let hasMore = true;
    while (hasMore) {
      const res = await axios.get(`${BEXIO_API_URL}/kb_invoice`, { headers, params: { offset, limit } });
      const batch = res.data;
      if (!batch || !Array.isArray(batch)) { hasMore = false; break; }
      invoices = invoices.concat(batch);
      if (batch.length < limit) hasMore = false;
      else offset += limit;
    }
  } catch (err: any) {
    if (err.response?.status === 401) throw new Error("Bexio API Key is invalid or unauthorized.");
    throw err;
  }

  // 2. Fetch Contacts (paginated)
  let contacts: any[] = [];
  try {
    let offset = 0;
    const limit = 500;
    let hasMore = true;
    while (hasMore) {
      const res = await axios.get(`${BEXIO_API_URL}/contact`, { headers, params: { offset, limit } });
      const batch = res.data;
      if (!batch || !Array.isArray(batch)) { hasMore = false; break; }
      contacts = contacts.concat(batch);
      if (batch.length < limit) hasMore = false;
      else offset += limit;
    }
  } catch (err) {
    console.warn("Error fetching contacts, continuing with empty map", err);
  }

  const contactMap = new Map<number, string>(
    contacts.map((c: any) => [c.id, c.name_1 || c.name_2 || "Unknown Client"])
  );

  let totalArr = 0, totalPilot = 0, totalOnetime = 0;
  let cashflowReceived = 0, cashflowPending = 0;
  const clientRevenueMap = new Map<string, { name: string; arr: number; pilot: number; onetime: number }>();
  const outstandingInvoices: any[] = [];

  // Filter current year for YTD revenue totals
  const currentYear = new Date().getFullYear().toString();
  const filteredInvoices = invoices.filter((inv: any) => (inv.is_valid_from || "").startsWith(currentYear));
  const allOutstandingInvoices = invoices.filter((inv: any) =>
    inv.kb_item_status_id === 8 || inv.kb_item_status_id === 7 || inv.kb_item_status_id === 16
  );

  console.log(`Fetched ${invoices.length} total invoices. ${filteredInvoices.length} for ${currentYear}. ${allOutstandingInvoices.length} outstanding across all years.`);

  for (const inv of filteredInvoices) {
    const clientName = contactMap.get(inv.contact_id) || "Unknown Client";
    const amount = parseFloat(inv.total);
    const isPaid = inv.kb_item_status_id === 9;
    const isOutstanding = inv.kb_item_status_id === 8 || inv.kb_item_status_id === 7 || inv.kb_item_status_id === 16;

    const title = (inv.title || "").toLowerCase();
    const ref = (inv.reference || "").toLowerCase();
    let category: "arr" | "pilot" | "onetime" = "onetime";
    if (title.includes("arr") || title.includes("subscription") || ref.includes("arr")) category = "arr";
    else if (title.includes("pilot") || title.includes("professional") || ref.includes("pilot")) category = "pilot";

    if (category === "arr") totalArr += amount;
    else if (category === "pilot") totalPilot += amount;
    else totalOnetime += amount;

    if (isPaid) cashflowReceived += amount;
    else if (isOutstanding) cashflowPending += amount;

    const clientId = inv.contact_id.toString();
    const existing = clientRevenueMap.get(clientId);
    const clientData = existing || { name: clientName, arr: 0, pilot: 0, onetime: 0 };
    if (category === "arr") clientData.arr += amount;
    else if (category === "pilot") clientData.pilot += amount;
    else clientData.onetime += amount;
    clientRevenueMap.set(clientId, clientData);
  }

  for (const inv of allOutstandingInvoices) {
    const clientName = contactMap.get(inv.contact_id) || "Unknown Client";
    const amount = parseFloat(inv.total);
    const dueDate = inv.is_valid_to || inv.is_valid_from;
    const daysOutstanding = Math.max(0, Math.floor((Date.now() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)));
    outstandingInvoices.push({
      invoiceId: inv.id.toString(),
      invoiceNumber: inv.document_nr,
      clientName,
      amount,
      currency: inv.currency_id === 1 ? "CHF" : "EUR",
      dueDate,
      daysOutstanding,
      status: inv.kb_item_status_id === 8 ? "Overdue" : "Open"
    });
  }

  const summary = { arr: totalArr, pilot: totalPilot, onetime: totalOnetime, cashflowReceived, cashflowPending, updatedAt: new Date().toISOString() };
  const clients = Array.from(clientRevenueMap.entries()).map(([clientId, data]) => ({
    clientId, clientName: data.name, arr: data.arr, pilot: data.pilot, onetime: data.onetime,
    total: data.arr + data.pilot + data.onetime
  }));

  // Write to Firestore
  const batch = firestore.batch();
  batch.set(firestore.doc("summary/latest"), summary);
  for (const client of clients) {
    const safeId = client.clientId.replace(/[^a-zA-Z0-9]/g, '_');
    batch.set(firestore.doc(`clients/${safeId}`), client);
  }
  const invoicesSnap = await firestore.collection("invoices").get();
  invoicesSnap.docs.forEach(d => batch.delete(d.ref));
  for (const inv of outstandingInvoices) {
    batch.set(firestore.doc(`invoices/${inv.invoiceId}`), inv);
  }
  batch.set(firestore.doc("metadata/sync"), { lastSync: new Date().toISOString(), status: "success" });
  await batch.commit();

  console.log("Sync complete.");
  return { summary, clients, invoices: outstandingInvoices };
}

// API Routes
app.get("/api/sync", async (_req, res) => {
  try {
    const data = await syncBexioData();
    res.json({ status: "success", data });
  } catch (err) {
    console.error("Sync error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Sync failed" });
  }
});

app.get("/api/test-bexio", async (_req, res) => {
  const apiKey = process.env.BEXIO_API_KEY;
  if (!apiKey) return res.status(400).json({ error: "BEXIO_API_KEY not set" });
  try {
    const headers = { Accept: "application/json", Authorization: `Bearer ${apiKey}` };
    const result = await axios.get(`${BEXIO_API_URL}/kb_invoice`, { headers });
    const invoices = result.data;
    if (!invoices.length) return res.json({ status: "success", message: "No invoices found." });
    const first = invoices[0];
    res.json({
      status: "success",
      totalInvoices: invoices.length,
      availableKeys: Object.keys(first),
      sampleDateFields: { date: first.date, is_valid_from: first.is_valid_from, is_valid_to: first.is_valid_to, created_at: first.created_at }
    });
  } catch (err: any) {
    res.status(err.response?.status || 500).json({ error: err.message, details: err.response?.data });
  }
});

app.get("/api/debug/generali", async (_req, res) => {
  const apiKey = process.env.BEXIO_API_KEY;
  if (!apiKey) return res.status(400).json({ error: "BEXIO_API_KEY not set" });
  try {
    const headers = { Accept: "application/json", Authorization: `Bearer ${apiKey}` };
    const result = await axios.get(`${BEXIO_API_URL}/kb_invoice`, { headers });
    const invoices = result.data;
    if (!invoices.length) return res.json({ message: "No invoices found." });
    res.json(invoices[0]);
  } catch (err: any) {
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

export default app;
