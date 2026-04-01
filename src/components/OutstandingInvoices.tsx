import React from 'react';
import { Invoice } from '../types';
import { AlertCircle, Clock, CheckCircle, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

interface OutstandingInvoicesProps {
  invoices: Invoice[];
}

export function OutstandingInvoices({ invoices }: OutstandingInvoicesProps) {
  const formatCurrency = (val: number, currency: string) => 
    new Intl.NumberFormat('de-CH', { style: 'currency', currency }).format(val);

  const sortedInvoices = [...invoices].sort((a, b) => b.daysOutstanding - a.daysOutstanding);

  const getStatusColor = (days: number) => {
    if (days > 30) return 'text-red-500 bg-red-500/10 border-red-500/20';
    if (days > 0) return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    return 'text-green-500 bg-green-500/10 border-green-500/20';
  };

  const getStatusIcon = (days: number) => {
    if (days > 30) return <AlertCircle className="w-4 h-4" />;
    if (days > 0) return <Clock className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const totalOutstanding = invoices.reduce((acc, inv) => acc + inv.amount, 0);

  return (
    <div className="space-y-8">
      <div className="bg-white border border-gray-200 p-8 rounded-2xl flex items-center justify-between shadow-sm">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">Outstanding Invoices</h3>
          <p className="text-sm text-gray-500">{invoices.length} invoices pending payment</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Outstanding</p>
          <h3 className="text-3xl font-bold text-gray-900">{formatCurrency(totalOutstanding, 'CHF')}</h3>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-widest font-bold">
              <th className="px-6 py-4">Invoice</th>
              <th className="px-6 py-4">Client</th>
              <th className="px-6 py-4 text-right">Amount</th>
              <th className="px-6 py-4 text-right">Due Date</th>
              <th className="px-6 py-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedInvoices.map((inv, i) => (
              <motion.tr 
                key={inv.invoiceId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4 font-mono text-xs text-blue-600 flex items-center gap-2">
                  {inv.invoiceNumber}
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                </td>
                <td className="px-6 py-4 font-medium text-gray-900">{inv.clientName}</td>
                <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(inv.amount, inv.currency)}</td>
                <td className="px-6 py-4 text-right text-gray-500 text-sm">
                  {inv.dueDate && !isNaN(new Date(inv.dueDate).getTime()) ? format(new Date(inv.dueDate), 'MMM d, yyyy') : 'Unknown'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center">
                    <span className={cn(
                      "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border",
                      getStatusColor(inv.daysOutstanding)
                    )}>
                      {getStatusIcon(inv.daysOutstanding)}
                      {inv.daysOutstanding > 0 ? `+${inv.daysOutstanding} days` : 'Due today'}
                    </span>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
