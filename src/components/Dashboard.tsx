import { Summary } from '../types';
import { TrendingUp, CreditCard, Layers, CheckCircle, Clock, RefreshCw, AlertCircle, ArrowUpRight } from 'lucide-react';
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
  const fmt = (val: number) =>
    new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(val);

  const lastSyncDate = syncMetadata?.lastSync ? new Date(syncMetadata.lastSync) : null;
  const isSyncError = syncMetadata?.status === 'error';

  if (!summary) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Revenue Overview</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {isSyncError
                ? <span className="text-red-400">Sync failed — {syncMetadata.error}</span>
                : 'No data yet. Run your first sync to get started.'}
            </p>
          </div>
          <SyncButton onSync={onSync} isSyncing={isSyncing} />
        </div>

        {/* Empty state */}
        <div className="flex-1 flex flex-col items-center justify-center bg-white border border-dashed border-gray-200 rounded-2xl p-16 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-5">
            <RefreshCw className="w-7 h-7 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No data available</h3>
          <p className="text-sm text-gray-400 max-w-xs mb-8 leading-relaxed">
            Connect to Bexio and import your revenue, invoices, and client data.
          </p>
          <SyncButton onSync={onSync} isSyncing={isSyncing} large />
        </div>
      </div>
    );
  }

  const cards = [
    {
      label: 'ARR Booked (YTD)',
      value: summary.arr,
      icon: TrendingUp,
      accent: 'text-emerald-500',
      accentBg: 'bg-emerald-50',
      bar: 'bg-emerald-500',
      target: 6_000_000,
      sub: 'Annual Recurring Revenue',
    },
    {
      label: 'Professional Services (YTD)',
      value: summary.pilot,
      icon: CreditCard,
      accent: 'text-blue-500',
      accentBg: 'bg-blue-50',
      bar: 'bg-blue-500',
      target: 3_000_000,
      sub: 'Pilot & subscription revenue',
    },
    {
      label: 'Other Revenue (YTD)',
      value: summary.onetime,
      icon: Layers,
      accent: 'text-violet-500',
      accentBg: 'bg-violet-50',
      bar: null,
      target: null,
      sub: 'Unclassified invoices',
    },
  ];

  const cashflow = [
    { label: 'Received', value: summary.cashflowReceived, icon: CheckCircle, accent: 'text-emerald-500', accentBg: 'bg-emerald-50' },
    { label: 'Pending', value: summary.cashflowPending, icon: Clock, accent: 'text-amber-500', accentBg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Revenue Overview</h2>
          <p className="text-sm mt-0.5 flex items-center gap-1.5">
            {isSyncError ? (
              <span className="text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Last sync failed
              </span>
            ) : lastSyncDate && !isNaN(lastSyncDate.getTime()) ? (
              <span className="text-gray-400">
                Last synced {format(lastSyncDate, "MMM d 'at' HH:mm")}
              </span>
            ) : (
              <span className="text-gray-400">Never synced</span>
            )}
          </p>
        </div>
        <SyncButton onSync={onSync} isSyncing={isSyncing} />
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card, i) => {
          const pct = card.target ? Math.min(100, (card.value / card.target) * 100) : 0;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', card.accentBg)}>
                  <card.icon className={cn('w-4.5 h-4.5', card.accent)} size={18} />
                </div>
                {card.target && (
                  <span className={cn('text-xs font-semibold tabular-nums', card.accent)}>
                    {pct.toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-gray-400 mb-1">{card.label}</p>
              <p className={cn('text-3xl font-bold tracking-tight mb-1', card.accent)}>{fmt(card.value)}</p>
              {card.target && (
                <>
                  <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden mt-3 mb-1">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: i * 0.08 + 0.2 }}
                      className={cn('h-full rounded-full', card.bar)}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400">Target {fmt(card.target)}</p>
                </>
              )}
              {!card.target && <p className="text-[11px] text-gray-400 mt-1">{card.sub}</p>}
            </motion.div>
          );
        })}
      </div>

      {/* Cashflow */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cashflow.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.08 }}
            className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex items-center gap-5"
          >
            <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0', item.accentBg)}>
              <item.icon className={cn('w-5 h-5', item.accent)} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-400 mb-0.5">Cashflow {item.label}</p>
              <p className="text-2xl font-bold text-gray-900 tracking-tight">{fmt(item.value)}</p>
            </div>
            <ArrowUpRight className={cn('ml-auto w-4 h-4 shrink-0', item.accent)} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SyncButton({ onSync, isSyncing, large }: { onSync: () => void; isSyncing: boolean; large?: boolean }) {
  return (
    <button
      onClick={onSync}
      disabled={isSyncing}
      className={cn(
        'flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50',
        large ? 'px-6 py-3 text-sm' : 'px-4 py-2 text-sm'
      )}
    >
      <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} />
      {isSyncing ? 'Syncing…' : 'Sync Now'}
    </button>
  );
}
