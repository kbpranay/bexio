import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import { format, isSameDay, parseISO } from "date-fns";
import cors from "cors";
import morgan from "morgan";
import fs from "fs";
import dotenv from "dotenv";
import cron from "node-cron";
import admin from "firebase-admin";

dotenv.config();

// Initialize Firebase Admin
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
admin.initializeApp({
  projectId: firebaseConfig.projectId,
});

const db = admin.firestore(firebaseConfig.firestoreDatabaseId);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

const BEXIO_API_URL = "https://api.bexio.com/2.0";

// Bexio Sync Logic
async function syncBexioData() {
  const apiKey = process.env.BEXIO_API_KEY;
  if (!apiKey) {
    throw new Error("BEXIO_API_KEY environment variable is not set. Please add it to the Secrets panel.");
  }

  console.log("Starting Bexio sync...");

  try {
    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    // 1. Fetch Invoices (with pagination)
    let invoices: any[] = [];
    try {
      let offset = 0;
      const limit = 500;
      let hasMore = true;

      while (hasMore) {
        const invoicesRes = await axios.get(`${BEXIO_API_URL}/kb_invoice`, { 
          headers,
          params: { offset, limit }
        });
        const batch = invoicesRes.data;
        
        if (!batch || !Array.isArray(batch)) {
          hasMore = false;
          break;
        }

        invoices = invoices.concat(batch);
        
        if (batch.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        throw new Error("Bexio API Key is invalid or unauthorized. Please check your secret.");
      }
      throw err;
    }

    // 2. Fetch Contacts (with pagination)
    let contacts: any[] = [];
    try {
      let offset = 0;
      const limit = 500;
      let hasMore = true;

      while (hasMore) {
        const contactsRes = await axios.get(`${BEXIO_API_URL}/contact`, { 
          headers,
          params: { offset, limit }
        });
        const batch = contactsRes.data;
        
        if (!batch || !Array.isArray(batch)) {
          hasMore = false;
          break;
        }

        contacts = contacts.concat(batch);
        
        if (batch.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }
    } catch (err) {
      console.warn("Error fetching contacts, continuing with empty contacts map", err);
    }
    
    const contactMap = new Map<number, string>(contacts.map((c: any) => [c.id, c.name_1 || c.name_2 || "Unknown Client"]));

    let totalArr = 0;
    let totalPilot = 0;
    let totalOnetime = 0;
    let cashflowReceived = 0;
    let cashflowPending = 0;

    const clientRevenueMap = new Map<string, { name: string; arr: number; pilot: number; onetime: number }>();
    const outstandingInvoices: any[] = [];

    // Filter for 2026 data only using 'is_valid_from'
    const currentYear = new Date().getFullYear().toString();
    const filteredInvoices = invoices.filter((inv: any) => (inv.is_valid_from || "").startsWith(currentYear));

    console.log(`Fetched ${invoices.length} total invoices. Found ${filteredInvoices.length} invoices for ${currentYear}.`);

    for (const inv of filteredInvoices) {
      const clientName = contactMap.get(inv.contact_id) || "Unknown Client";
      const amount = parseFloat(inv.total);
      
      // Use kb_item_status_id instead of status_id
      const isPaid = inv.kb_item_status_id === 9;
      const isOutstanding = inv.kb_item_status_id === 8 || inv.kb_item_status_id === 7 || inv.kb_item_status_id === 16; // 16 is sometimes used for partially paid

      const title = (inv.title || "").toLowerCase();
      const ref = (inv.reference || "").toLowerCase();
      
      let category: "arr" | "pilot" | "onetime" = "onetime";
      if (title.includes("arr") || title.includes("subscription") || ref.includes("arr")) {
        category = "arr";
      } else if (title.includes("pilot") || title.includes("professional") || ref.includes("pilot")) {
        category = "pilot";
      }

      if (category === "arr") totalArr += amount;
      else if (category === "pilot") totalPilot += amount;
      else totalOnetime += amount;

      if (isPaid) {
        cashflowReceived += amount;
      } else if (isOutstanding) {
        cashflowPending += amount;
        // Use is_valid_to instead of date_due
        const dueDate = inv.is_valid_to || inv.is_valid_from;
        const daysOutstanding = Math.max(0, Math.floor((Date.now() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)));

        outstandingInvoices.push({
          invoiceId: inv.id.toString(),
          invoiceNumber: inv.document_nr,
          clientName,
          amount,
          currency: inv.currency_id === 1 ? "CHF" : "EUR", // Fallback mapping, usually 1 is CHF
          dueDate: dueDate,
          daysOutstanding,
          status: inv.kb_item_status_id === 8 ? "Overdue" : "Open"
        });
      }

      const clientId = inv.contact_id.toString();
      const existing = clientRevenueMap.get(clientId);
      const clientData = existing || { name: clientName, arr: 0, pilot: 0, onetime: 0 };
      
      if (category === "arr") clientData.arr += amount;
      else if (category === "pilot") clientData.pilot += amount;
      else clientData.onetime += amount;
      
      clientRevenueMap.set(clientId, clientData);
    }

    const summary = {
      arr: totalArr,
      pilot: totalPilot,
      onetime: totalOnetime,
      cashflowReceived,
      cashflowPending,
      updatedAt: new Date().toISOString()
    };

    const clients = Array.from(clientRevenueMap.values()).map((data, idx) => ({
      clientId: Array.from(clientRevenueMap.keys())[idx],
      clientName: data.name,
      arr: data.arr,
      pilot: data.pilot,
      onetime: data.onetime,
      total: data.arr + data.pilot + data.onetime
    }));

    // 4. Write to Firestore
    console.log("Writing sync results to Firestore...");
    const batch = db.batch();

    // Summary
    batch.set(db.doc("summary/latest"), summary);

    // Clients
    for (const client of clients) {
      const safeId = client.clientId.replace(/[^a-zA-Z0-9]/g, '_');
      batch.set(db.doc(`clients/${safeId}`), client);
    }

    // Invoices
    // Clear existing invoices first
    const invoicesSnap = await db.collection("invoices").get();
    invoicesSnap.docs.forEach(d => batch.delete(d.ref));
    
    for (const inv of outstandingInvoices) {
      batch.set(db.doc(`invoices/${inv.invoiceId}`), inv);
    }

    // Metadata
    batch.set(db.doc("metadata/sync"), {
      lastSync: new Date().toISOString(),
      status: "success"
    });

    await batch.commit();
    console.log("Sync completed and stored in Firestore.");

    return {
      summary,
      clients,
      invoices: outstandingInvoices
    };
  } catch (error) {
    console.error("Error during Bexio sync:", error);
    // Log failure to metadata
    try {
      await db.doc("metadata/sync").set({
        lastSync: new Date().toISOString(),
        status: "error",
        error: error instanceof Error ? error.message : String(error)
      }, { merge: true });
    } catch (e) {
      console.error("Failed to log sync error to Firestore:", e);
    }
    throw error;
  }
}

// Schedule daily sync at 6 AM (Europe/Zurich)
cron.schedule('0 6 * * *', async () => {
  console.log("Running scheduled daily sync at 6 AM...");
  try {
    await syncBexioData();
  } catch (err) {
    console.error("Scheduled sync failed:", err);
  }
}, {
  timezone: "Europe/Zurich"
});

// API Routes
app.get("/api/debug/generali", async (req, res) => {
  const apiKey = process.env.BEXIO_API_KEY;
  if (!apiKey) return res.status(400).json({ error: "BEXIO_API_KEY not set" });

  try {
    const headers = { Accept: "application/json", Authorization: `Bearer ${apiKey}` };
    const invoicesRes = await axios.get(`${BEXIO_API_URL}/kb_invoice`, { headers });
    const invoices = invoicesRes.data;
    
    if (invoices.length === 0) {
      return res.json({ message: "No invoices found at all." });
    }

    // Return the first invoice to inspect its structure
    res.json(invoices[0]);
  } catch (err: any) {
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

app.get("/api/test-bexio", async (req, res) => {
  const apiKey = process.env.BEXIO_API_KEY;
  if (!apiKey) return res.status(400).json({ error: "BEXIO_API_KEY not set" });

  try {
    const headers = { Accept: "application/json", Authorization: `Bearer ${apiKey}` };
    const invoicesRes = await axios.get(`${BEXIO_API_URL}/kb_invoice`, { headers });
    const invoices = invoicesRes.data;
    
    if (invoices.length === 0) {
      return res.json({ status: "success", message: "No invoices found." });
    }

    const firstInvoice = invoices[0];
    const dateFields = {
      date: firstInvoice.date,
      document_date: firstInvoice.document_date,
      is_valid_from: firstInvoice.is_valid_from,
      created_at: firstInvoice.created_at,
      issue_date: firstInvoice.issue_date
    };

    res.json({ 
      status: "success", 
      totalInvoices: invoices.length,
      availableKeys: Object.keys(firstInvoice),
      sampleDateFields: dateFields
    });
  } catch (err: any) {
    res.status(err.response?.status || 500).json({ error: err.message, details: err.response?.data });
  }
});

app.get("/api/sync", async (req, res) => {
  try {
    const data = await syncBexioData();
    res.json({ status: "success", data });
  } catch (err) {
    console.error("Sync API error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Sync failed" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // Serve index.html for all non-API routes in dev mode
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith("/api")) return next();
      
      try {
        let template = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        res.status(500).end(e.stack);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Trigger initial sync if DB is empty
    try {
      const summarySnap = await db.doc("summary/latest").get();
      if (!summarySnap.exists) {
        console.log("Database is empty. Triggering initial sync...");
        await syncBexioData();
      }
    } catch (err) {
      console.error("Initial sync check failed:", err);
    }
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
