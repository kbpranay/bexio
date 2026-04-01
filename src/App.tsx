import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, logout } from './firebase';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { ClientSplit } from './components/ClientSplit';
import { OutstandingInvoices } from './components/OutstandingInvoices';
import { Settings } from './components/Settings';
import { Summary, ClientRevenue, Invoice } from './types';
import { LayoutDashboard, Users, FileText, LogOut, RefreshCw, AlertCircle, Settings as SettingsIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, setError: (msg: string) => void) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  setError(`Firestore error on ${path}: ${errInfo.error}`);
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'invoices' | 'settings'>('dashboard');
  
  const [summary, setSummary] = useState<Summary | null>(null);
  const [clients, setClients] = useState<ClientRevenue[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [syncMetadata, setSyncMetadata] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        // Ensure user document exists in Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          if (!userDoc.exists()) {
            await setDoc(doc(db, 'users', u.uid), {
              uid: u.uid,
              email: u.email,
              displayName: u.displayName,
              role: 'user' // Default role
            });
          }
        } catch (err) {
          console.error('Error creating user doc:', err);
        }
      }
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Listen for summary
    const unsubSummary = onSnapshot(doc(db, 'summary', 'latest'), (snap) => {
      if (snap.exists()) setSummary(snap.data() as Summary);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'summary/latest', setError);
    });

    // Listen for clients
    const unsubClients = onSnapshot(collection(db, 'clients'), (snap) => {
      setClients(snap.docs.map(d => d.data() as ClientRevenue));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients', setError);
    });

    // Listen for invoices
    const unsubInvoices = onSnapshot(collection(db, 'invoices'), (snap) => {
      setInvoices(snap.docs.map(d => d.data() as Invoice));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'invoices', setError);
    });

    // Listen for sync metadata
    const unsubSync = onSnapshot(doc(db, 'metadata', 'sync'), (snap) => {
      if (snap.exists()) setSyncMetadata(snap.data());
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'metadata/sync', setError);
    });

    return () => {
      unsubSummary();
      unsubClients();
      unsubInvoices();
      unsubSync();
    };
  }, [user]);

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      const res = await fetch('/api/sync');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Sync failed');
      
      // The server handles writing to Firestore, so we just need to wait for the API to complete.
      // The onSnapshot listeners will automatically update the UI.
      console.log('Sync successful:', json.status);
    } catch (err: any) {
      console.error('Sync error:', err);
      setError(err.message || 'Failed to sync with Bexio.');
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) return <Auth />;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'Client Split', icon: Users },
    { id: 'invoices', label: 'Outstanding', icon: FileText },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fb] text-gray-900 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-60 bg-white border-b md:border-b-0 md:border-r border-gray-100 flex flex-col shrink-0">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <LayoutDashboard className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-sm text-gray-900 leading-none">Bexio Insights</h1>
              <p className="text-[10px] text-gray-400 mt-0.5">Revenue Intelligence</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              )}
            >
              <tab.icon className="w-4 h-4 shrink-0" />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-gray-100 space-y-1">
          <div className="flex items-center gap-2.5 px-3 py-2">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full border border-gray-200 shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[11px] font-bold text-blue-600 shrink-0">
                {user.displayName?.charAt(0) || user.email?.charAt(0) || '?'}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-xs font-semibold truncate text-gray-800">{user.displayName}</p>
              <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-red-50 border border-red-100 px-4 py-3 rounded-xl flex items-center gap-3 text-red-600 text-sm"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'dashboard' && <Dashboard summary={summary} onSync={handleSync} isSyncing={isSyncing} syncMetadata={syncMetadata} />}
              {activeTab === 'clients' && <ClientSplit clients={clients} />}
              {activeTab === 'invoices' && <OutstandingInvoices invoices={invoices} />}
              {activeTab === 'settings' && <Settings user={user} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
