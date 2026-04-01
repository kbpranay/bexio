import { ClientRevenue } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';

interface ClientSplitProps {
  clients: ClientRevenue[];
}

export function ClientSplit({ clients }: ClientSplitProps) {
  const fmt = (val: number) =>
    new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(val);

  const sorted = [...clients].sort((a, b) => b.total - a.total);
  const top15 = sorted.slice(0, 15);

  if (!clients.length) {
    return (
      <div className="flex flex-col items-center justify-center h-80 bg-white border border-dashed border-gray-200 rounded-2xl text-center p-12">
        <p className="text-sm font-medium text-gray-400">No client data yet — sync with Bexio to populate.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Client Revenue</h2>
        <p className="text-sm text-gray-400 mt-0.5">Top 15 clients by total revenue</p>
      </div>

      {/* Chart */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div className="h-[420px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top15} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis
                type="number"
                stroke="#d1d5db"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickFormatter={(v) => `${v / 1000}k`}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                dataKey="clientName"
                type="category"
                width={130}
                stroke="transparent"
                tick={{ fontSize: 11, fill: '#6b7280' }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #f3f4f6', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: 12 }}
                formatter={(v: number) => fmt(v)}
                cursor={{ fill: '#f9fafb' }}
              />
              <Bar dataKey="arr" name="ARR" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="pilot" name="Pilot / Services" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="onetime" name="One-time" stackId="a" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-4 justify-center">
          {[
            { color: 'bg-emerald-500', label: 'ARR' },
            { color: 'bg-blue-500', label: 'Pilot / Services' },
            { color: 'bg-violet-500', label: 'One-time' },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-6 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Client</th>
              <th className="px-6 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-right">ARR</th>
              <th className="px-6 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-right">Pilot</th>
              <th className="px-6 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-right">One-time</th>
              <th className="px-6 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map((client, i) => (
              <motion.tr
                key={client.clientId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="hover:bg-gray-50/60 transition-colors"
              >
                <td className="px-6 py-3.5 text-sm font-medium text-gray-800">{client.clientName}</td>
                <td className="px-6 py-3.5 text-sm text-right text-emerald-600 tabular-nums">{fmt(client.arr)}</td>
                <td className="px-6 py-3.5 text-sm text-right text-blue-600 tabular-nums">{fmt(client.pilot)}</td>
                <td className="px-6 py-3.5 text-sm text-right text-violet-600 tabular-nums">{fmt(client.onetime)}</td>
                <td className="px-6 py-3.5 text-sm text-right font-semibold text-gray-900 tabular-nums">{fmt(client.total)}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
