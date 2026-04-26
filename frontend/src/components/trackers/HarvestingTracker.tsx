'use client';

import { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { KPICard } from '@/components/layout/KPICard';
import { useStore } from '@/store/useStore';

const LOW_RESERVE_THRESHOLD = 0.2;

export function HarvestingTracker() {
  const [isMounted, setIsMounted] = useState(false);
  const systemState = useStore((state) => state.systemState);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const latestTanks = useMemo(() => {
    return Object.values(systemState.tanks).map(t => ({
      id: t.id,
      volume: t.volumeLiters,
      capacity: t.capacityLiters,
      fillPct: t.capacityLiters > 0 ? (t.volumeLiters / t.capacityLiters) : 0,
    }));
  }, [systemState.tanks]);

  const chartData = useMemo(() => {
    return latestTanks.map((t) => ({
      tank: t.id,
      volume: Number(t.volume.toFixed(0)),
      capacity: Number(t.capacity.toFixed(0)),
    }));
  }, [latestTanks]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Harvesting Tracker</h2>
        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
          Live Twin State
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {latestTanks.map((t) => (
          <KPICard
            key={t.id}
            label={`${t.id} Volume`}
            value={t.volume.toFixed(0)}
            unit={`L (${(t.fillPct * 100).toFixed(1)}%)`}
            status={t.fillPct < LOW_RESERVE_THRESHOLD ? 'critical' : 'normal'}
          />
        ))}
        <KPICard label="Total Capacity" value={latestTanks.reduce((s, t) => s + t.capacity, 0).toFixed(0)} unit="L" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Real-time Reservoir Status</h3>
        {chartData.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm italic">
            Waiting for harvesting data...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="tank" tick={{ fontSize: 11 }} />
              <YAxis unit=" L" tick={{ fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend />
              <Bar dataKey="volume" fill="#3b82f6" name="Volume (L)" isAnimationActive={false} />
              <Bar dataKey="capacity" fill="#e5e7eb" name="Capacity (L)" isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {isMounted && (
        <div className="bg-slate-900 rounded-lg p-4 mt-4 overflow-auto max-h-40">
          <div className="text-xs text-emerald-400 font-mono mb-2 border-b border-slate-700 pb-1">
            DEBUG: systemState
          </div>
          <pre className="text-[10px] text-emerald-500 font-mono">
            {JSON.stringify(systemState, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
