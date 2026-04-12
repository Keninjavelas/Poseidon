'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { KPICard } from '@/components/layout/KPICard';
import { StatusMessage } from '@/components/layout/StatusMessage';
import { api } from '@/lib/api';
import { useWebSocket } from '@/lib/useWebSocket';
import type { UsageReading } from '@/types';

const MAX_CHART_PERIODS = 24;
const LOW_EFFICIENCY_THRESHOLD = 30;

export function UsageTracker() {
  const [readings, setReadings] = useState<UsageReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { subscribe } = useWebSocket();

  useEffect(() => {
    api.getUsage(100)
      .then((data) => { setReadings(data.slice(-MAX_CHART_PERIODS)); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe('usage', (data) => {
      setReadings((prev) => [...prev, data as UsageReading].slice(-MAX_CHART_PERIODS));
    });
    return unsubscribe;
  }, [subscribe]);

  if (loading) return <StatusMessage type="loading" />;
  if (error) return <StatusMessage type="error" message={error} />;

  const current = readings[readings.length - 1];
  const total = current?.total_liters ?? 0;
  const municipal = current?.municipal_liters ?? 0;
  const harvested = current?.harvested_liters ?? 0;
  const utilizationPct = total > 0 ? (harvested / total) * 100 : 0;

  const chartData = readings.map((r) => ({
    time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    municipal: Number(r.municipal_liters.toFixed(1)),
    harvested: Number(r.harvested_liters.toFixed(1)),
  }));

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-gray-800">Water Usage Tracker</h2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard label="Total Consumption" value={total.toFixed(1)} unit="L" />
        <KPICard label="Municipal" value={municipal.toFixed(1)} unit="L" />
        <KPICard label="Harvested" value={harvested.toFixed(1)} unit="L" />
        <KPICard
          label="Harvested Utilization"
          value={utilizationPct.toFixed(1)}
          unit="%"
          warning={utilizationPct < LOW_EFFICIENCY_THRESHOLD}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Municipal vs Harvested (last 24 periods)</h3>
        {chartData.length === 0 ? (
          <StatusMessage type="empty" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis unit=" L" tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="municipal" stackId="a" fill="#f59e0b" name="Municipal (L)" />
              <Bar dataKey="harvested" stackId="a" fill="#3b82f6" name="Harvested (L)" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
