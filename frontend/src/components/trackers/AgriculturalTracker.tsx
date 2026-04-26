'use client';

import { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Droplets } from 'lucide-react';
import { KPICard } from '@/components/layout/KPICard';
import { useStore } from '@/store/useStore';

const SOURCE_COLORS: Record<string, string> = {
  harvested: '#3b82f6',
  municipal: '#f59e0b',
};

function getMoistureStatus(percent: number): 'normal' | 'warning' | 'critical' | 'optimal' {
  if (percent < 25) return 'critical';
  if (percent < 40) return 'warning';
  if (percent < 70) return 'normal';
  return 'optimal';
}

export function AgriculturalTracker() {
  const [isMounted, setIsMounted] = useState(false);
  const systemState = useStore((state) => state.systemState);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const latestPerZone = useMemo(() => {
    return Object.values(systemState.soil).map((s) => ({
      zoneId: s.zoneId,
      moisture: s.moisturePct, // Use moisturePct
      demand: s.irrigationUsageLps * 3600,
      source: s.moisturePct < 50 ? 'municipal' : 'harvested',
    }));
  }, [systemState.soil]);

  const chartData = useMemo(() => {
    return latestPerZone.map(r => ({
      zone: r.zoneId,
      demand: Number(r.demand.toFixed(1)),
      source: r.source,
    }));
  }, [latestPerZone]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Agricultural Tracker</h2>
        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
          Live Twin State
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {latestPerZone.map((r) => {
          const status = getMoistureStatus(r.moisture);
          const statusColor =
            status === 'critical' ? 'text-red-500' :
            status === 'warning' ? 'text-orange-500' :
            status === 'normal' ? 'text-sky-500' : 'text-blue-500';

          return (
            <KPICard
              key={`moisture-${r.zoneId}`}
              label={`${r.zoneId} Moisture`}
              value={r.moisture.toFixed(1)}
              unit="%"
              status={status === 'optimal' ? 'normal' : status}
              color={statusColor}
              icon={<Droplets className="w-4 h-4" />}
            />
          );
        })}
        {latestPerZone.map((r) => (
          <KPICard
            key={`demand-${r.zoneId}`}
            label={`${r.zoneId} Demand`}
            value={r.demand.toFixed(1)}
            unit={`L (${r.source})`}
          />
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Recent Irrigation Events</h3>
        {chartData.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm italic">
            Waiting for agricultural data...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="zone" tick={{ fontSize: 11 }} />
              <YAxis unit=" L" tick={{ fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="demand" name="Demand (L)" isAnimationActive={false}>
                {chartData.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={SOURCE_COLORS[entry.source] ?? '#6b7280'} />
                ))}
              </Bar>
              <Legend
                payload={[
                  { value: 'Harvested', type: 'square', color: SOURCE_COLORS.harvested },
                  { value: 'Municipal', type: 'square', color: SOURCE_COLORS.municipal },
                ]}
              />
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
