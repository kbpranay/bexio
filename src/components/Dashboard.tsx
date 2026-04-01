import React from 'react';
import { Summary } from '../types';
import { TrendingUp, CreditCard, Clock, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

interface DashboardProps {
  summary: Summary | null;
  onSync: () => void;
  isSyncing: boolean;
  syncMetadata?: any;
}

export function Dashboard({ summary, onSync, isSyncing, syncMetadata }: DashboardProps) {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(val);

  const lastSyncDate = syncMetadata?.lastSync ? new Date(syncMetadata.lastSync) : null;
  const isSyncError = syncMetadata?.status === 'error';

  const [testResult, setTestResult] = React.useState<any>(null);
  const [isTesting, setIsTesting] = React.useState(false);

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const res = await fetch('/api/test-bexio');
      const data = await res.json();
      if (res.ok) setTestResult(data);
      else throw new Error(data.error);
    } catch (err: any) {
      alert(`Test failed: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const [generaliDebug, setGeneraliDebug] = React.useState<any>(null);
  const [isDebugLoading, setIsDebugLoading] = React.useState(false);

  const handleDebugGenerali = async () => {
    setIsDebugLoading(true);
    try {
      const res = await fetch('/api/debug/generali');
      const data = await res.json();
      setGeneraliDebug(data);
    } catch (err: any) {
      alert(`Debug failed: ${err.message}`);
    } finally {
      setIsDebugLoading(false);
    }
  };

  if (!summary) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Revenue Overview</h2>
            <div className="text-sm text-gray-500">
              {isSyncError ? (
                <span className="text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Sync failed: {syncMetadata.error}
                </span>
              ) : (
                'No data synced yet.'
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleDebugGenerali}
              disabled={isDebugLoading}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", isDebugLoading && "animate-spin")} />
              {isDebugLoading ? 'Fetching...' : 'Debug: Inspect Invoice Data'}
            </button>
            <button 
              onClick={handleTest}
              disabled={isTesting}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", isTesting && "animate-spin")} />
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
            <button 
              onClick={onSync}
              disabled={isSyncing}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50"
            >
              <RefreshCw className={cn("w-5 h-5", isSyncing && "animate-spin")} />
              {isSyncing ? 'Syncing...' : 'Sync with Bexio Now'}
            </button>
          </div>
        </div>

        {generaliDebug && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-blue-200 p-6 rounded-2xl space-y-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-blue-600 uppercase tracking-widest">Raw Invoice Data (Debug)</h3>
              <button onClick={() => setGeneraliDebug(null)} className="text-gray-400 hover:text-gray-600">Close</button>
            </div>
            <pre className="bg-gray-50 p-4 rounded-xl text-[10px] font-mono text-gray-600 overflow-x-auto border border-gray-100">
              {JSON.stringify(generaliDebug, null, 2)}
            </pre>
          </motion.div>
        )}

        {testResult && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-green-200 p-6 rounded-2xl space-y-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <h3 className="text-sm font-bold uppercase tracking-widest">Connection successful!</h3>
              </div>
              <button onClick={() => setTestResult(null)} className="text-gray-400 hover:text-gray-600">Close</button>
            </div>
            <pre className="bg-gray-50 p-4 rounded-xl text-[10px] font-mono text-gray-600 overflow-x-auto border border-gray-100">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </motion.div>
        )}

        <div className="flex flex-col items-center justify-center h-96 bg-white border border-gray-200 rounded-3xl p-12 text-center border-dashed">
          <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-6">
            <RefreshCw className="w-10 h-10 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-500 max-w-sm mb-8">
            Your dashboard is currently empty. Connect to Bexio to import your revenue, invoices, and client data.
          </p>
          <button 
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center gap-2 bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50"
          >
            {isSyncing ? <RefreshCw className="w-5 h-5 animate-spin" /> : null}
            {isSyncing ? 'Syncing Data...' : 'Start Initial Sync'}
          </button>
        </div>
      </div>
    );
  }

  const cards = [
    { 
      title: 'ARR BOOKED (YTD)', 
      value: summary.arr, 
      icon: TrendingUp, 
      color: 'text-green-500', 
      bg: 'bg-green-500/10',
      target: 6000000,
      description: 'Annual Recurring Revenue'
    },
    { 
      title: 'PROFESSIONAL SERVICES / PILOT (YTD)', 
      value: summary.pilot, 
      icon: CreditCard, 
      color: 'text-blue-500', 
      bg: 'bg-blue-500/10',
      target: 3000000,
      description: 'Pilot & Subscription revenue'
    },
    { 
      title: 'OTHER REVENUE (YTD)', 
      value: summary.onetime, 
      icon: CheckCircle, 
      color: 'text-purple-500', 
      bg: 'bg-purple-500/10',
      description: 'Unclassified — check invoice position labels'
    }
  ];

  const cashflow = [
    { title: 'CASHFLOW RECEIVED', value: summary.cashflowReceived, icon: CheckCircle, color: 'text-emerald-500' },
    { title: 'CASHFLOW PENDING', value: summary.cashflowPending, icon: Clock, color: 'text-orange-500' }
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Revenue Overview</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {isSyncError ? (
              <span className="text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Last sync failed
              </span>
            ) : (
              <span>Last synced: {lastSyncDate && !isNaN(lastSyncDate.getTime()) ? format(lastSyncDate, 'MMM d, HH:mm') : 'Unknown'}</span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleDebugGenerali}
            disabled={isDebugLoading}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", isDebugLoading && "animate-spin")} />
            {isDebugLoading ? 'Fetching...' : 'Debug: Inspect Invoice Data'}
          </button>
          <button 
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {generaliDebug && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-blue-200 p-6 rounded-2xl space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-blue-600 uppercase tracking-widest">Raw Invoice Data (Debug)</h3>
            <button onClick={() => setGeneraliDebug(null)} className="text-gray-400 hover:text-gray-600">Close</button>
          </div>
          <pre className="bg-gray-50 p-4 rounded-xl text-[10px] font-mono text-gray-600 overflow-x-auto border border-gray-100">
            {JSON.stringify(generaliDebug, null, 2)}
          </pre>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card, i) => (
          <motion.div 
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white border border-gray-200 p-6 rounded-2xl flex flex-col justify-between shadow-sm"
          >
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{card.title}</p>
              <h3 className={cn("text-4xl font-bold mb-2", card.color)}>{formatCurrency(card.value)}</h3>
              {card.target && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Target: {formatCurrency(card.target)}</span>
                    <span>{((card.value / card.target) * 100).toFixed(1)}% achieved</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (card.value / card.target) * 100)}%` }}
                      className={cn("h-full", card.color.replace('text-', 'bg-'))}
                    />
                  </div>
                </div>
              )}
              <p className="mt-4 text-xs text-gray-600">{card.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cashflow.map((item, i) => (
          <motion.div 
            key={item.title}
            initial={{ opacity: 0, x: i === 0 ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white border border-gray-200 p-6 rounded-2xl flex items-center gap-6 shadow-sm"
          >
            <div className={cn("p-4 rounded-xl bg-gray-50", item.color)}>
              <item.icon className="w-8 h-8" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{item.title}</p>
              <h3 className="text-3xl font-bold text-gray-900">{formatCurrency(item.value)}</h3>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
