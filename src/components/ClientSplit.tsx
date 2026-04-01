import React from 'react';
import { ClientRevenue } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';

interface ClientSplitProps {
  clients: ClientRevenue[];
}

export function ClientSplit({ clients }: ClientSplitProps) {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(val);

  const sortedClients = [...clients].sort((a, b) => b.total - a.total).slice(0, 15);

  return (
    <div className="space-y-8">
      <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-sm">
        <h3 className="text-xl font-bold text-gray-900 mb-8">Top 15 Clients by Revenue Split</h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sortedClients}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" stroke="#888" fontSize={10} tickFormatter={(val) => `CHF ${val/1000}k`} />
              <YAxis dataKey="clientName" type="category" stroke="#888" fontSize={10} width={120} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ fontSize: '12px', color: '#111827' }}
                formatter={(val: number) => formatCurrency(val)}
              />
              <Legend />
              <Bar dataKey="arr" name="ARR" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
              <Bar dataKey="pilot" name="Pilot/Subscription" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="onetime" name="One-time" stackId="a" fill="#a855f7" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-widest font-bold">
              <th className="px-6 py-4">Client</th>
              <th className="px-6 py-4 text-right">ARR</th>
              <th className="px-6 py-4 text-right">Pilot</th>
              <th className="px-6 py-4 text-right">One-time</th>
              <th className="px-6 py-4 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[...clients].sort((a, b) => b.total - a.total).map((client, i) => (
              <motion.tr 
                key={client.clientId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4 font-medium text-gray-900">{client.clientName}</td>
                <td className="px-6 py-4 text-right text-green-600">{formatCurrency(client.arr)}</td>
                <td className="px-6 py-4 text-right text-blue-600">{formatCurrency(client.pilot)}</td>
                <td className="px-6 py-4 text-right text-purple-600">{formatCurrency(client.onetime)}</td>
                <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(client.total)}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
