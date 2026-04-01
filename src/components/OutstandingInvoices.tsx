import { Invoice } from '../types';
import { AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

interface OutstandingInvoicesProps {
  invoices: Invoice[];
}

export function OutstandingInvoices({ invoices }: OutstandingInvoicesProps) {
  const fmt = (val: number, currency: string) =>
    new Intl.NumberFormat('de-CH', { style: 'currency', currency, maximumFractionDigits: 0 }).format(val);

  const sorted = [...invoices].sort((a, b) => b.daysOutstanding - a.daysOutstanding);
  const total = invoices.reduce((acc, inv) => acc + inv.amount, 0);

  const badge = (days: number) => {
    if (days > 30) return { cls: 'text-red-600 bg-red-50 border-red-100', icon: <AlertCircle className="w-3.5 h-3.5" /> };
    if (days > 0)  return { cls: 'text-amber-600 bg-amber-50 border-amber-100', icon: <Clock className="w-3.5 h-3.5" /> };
    return           { cls: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: <CheckCircle className="w-3.5 h-3.5" /> };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Outstanding Invoices</h2>
          <p className="text-sm text-gray-400 mt-0.5">{invoices.length} invoices pending payment</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Total outstanding</p>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{fmt(total, 'CHF')}</p>
        </div>
      </div>

      {!invoices.length ? (
        <div className="flex flex-col items-center justify-center h-60 bg-white border border-dashed border-gray-200 rounded-2xl text-center p-12">
          <CheckCircle className="w-8 h-8 text-emerald-400 mb-3" />
          <p className="text-sm font-medium text-gray-500">All invoices are paid — great work!</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Invoice</th>
                <th className="px-6 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-right">Amount</th>
                <th className="px-6 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-right">Due date</th>
                <th className="px-6 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-center">Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map((inv, i) => {
                const b = badge(inv.daysOutstanding);
                return (
                  <motion.tr
                    key={inv.invoiceId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="px-6 py-3.5 font-mono text-xs text-blue-600">{inv.invoiceNumber}</td>
                    <td className="px-6 py-3.5 text-sm font-medium text-gray-800">{inv.clientName}</td>
                    <td className="px-6 py-3.5 text-sm font-semibold text-gray-900 text-right tabular-nums">{fmt(inv.amount, inv.currency)}</td>
                    <td className="px-6 py-3.5 text-sm text-gray-400 text-right tabular-nums">
                      {inv.dueDate && !isNaN(new Date(inv.dueDate).getTime())
                        ? format(new Date(inv.dueDate), 'MMM d, yyyy')
                        : '—'}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex justify-center">
                        <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border', b.cls)}>
                          {b.icon}
                          {inv.daysOutstanding > 0 ? `+${inv.daysOutstanding}d` : 'Today'}
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
