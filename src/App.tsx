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
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
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
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight text-gray-900">Bexio Insights</h1>
          </div>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Revenue Intelligence</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group",
                activeTab === tab.id 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? "text-white" : "text-gray-400 group-hover:text-gray-600")} />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-4 py-3 mb-4">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full border border-gray-200" />
            ) : (
              <div className="w-8 h-8 rounded-full border border-gray-200 bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                {user.displayName?.charAt(0) || user.email?.charAt(0) || '?'}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate text-gray-900">{user.displayName}</p>
              <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-600 text-sm"
            >
              <AlertCircle className="w-5 h-5" />
              {error}
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
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
