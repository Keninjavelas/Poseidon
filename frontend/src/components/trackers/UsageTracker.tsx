'use client';

import { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { KPICard } from '@/components/layout/KPICard';
import { useStore } from '@/store/useStore';

const LOW_EFFICIENCY_THRESHOLD = 30;

export function UsageTracker() {
  const [isMounted, setIsMounted] = useState(false);
  const systemState = useStore((state) => state.systemState);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const usageStats = useMemo(() => {
    const usageValues = Object.values(systemState.usage || {});
    const totalHarvested = usageValues.reduce((sum, z) => sum + (z.harvestedLiters || 0), 0);
    const totalMunicipal = usageValues.reduce((sum, z) => sum + (z.municipalLiters || 0), 0);
    const utilizationPct = (totalHarvested / (totalHarvested + totalMunicipal || 1)) * 100;

    return { total: totalHarvested + totalMunicipal, municipal: totalMunicipal, harvested: totalHarvested, utilizationPct };
  }, [systemState.usage]);

  const chartData = useMemo(() => {
    const usageValues = Object.values(systemState.usage || {});
    return usageValues.map((z, i) => ({
      zone: `Z${i + 1}`,
      municipal: Number((z.municipalLiters || 0).toFixed(1)),
      harvested: Number((z.harvestedLiters || 0).toFixed(1)),
    }));
  }, [systemState.usage]);

  const { total, municipal, harvested, utilizationPct } = usageStats;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Water Usage Tracker</h2>
        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
          Live Twin State
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard label="Total Consumption" value={total.toFixed(1)} unit="L" />
        <KPICard label="Municipal" value={municipal.toFixed(1)} unit="L" />
        <KPICard label="Harvested" value={harvested.toFixed(1)} unit="L" />
        <KPICard
          label="Harvested Utilization"
          value={utilizationPct.toFixed(1)}
          unit="%"
          status={utilizationPct < LOW_EFFICIENCY_THRESHOLD ? 'warning' : 'normal'}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Usage by Zone (Current)</h3>
        {chartData.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm italic">
            Waiting for digital twin data...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="zone" tick={{ fontSize: 10 }} />
              <YAxis unit=" L" tick={{ fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend />
              <Bar dataKey="municipal" stackId="a" fill="#f59e0b" name="Municipal (L)" isAnimationActive={false} />
              <Bar dataKey="harvested" stackId="a" fill="#3b82f6" name="Harvested (L)" isAnimationActive={false} />
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
