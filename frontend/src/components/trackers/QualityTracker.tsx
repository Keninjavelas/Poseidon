'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { KPICard } from '@/components/layout/KPICard';
import { AlertFeed } from '@/components/layout/AlertFeed';
import { StatusMessage } from '@/components/layout/StatusMessage';
import { api } from '@/lib/api';
import { useWebSocket } from '@/lib/useWebSocket';
import type { QualityReading, AnomalyAlert } from '@/types';

const MAX_CHART_POINTS = 60;
const MAX_ALERTS = 10;

export function QualityTracker() {
  const [readings, setReadings] = useState<QualityReading[]>([]);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { subscribe } = useWebSocket();

  useEffect(() => {
    Promise.all([api.getQuality(100), api.getAlerts(10)])
      .then(([q, a]) => { setReadings(q.slice(-MAX_CHART_POINTS)); setAlerts(a); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => {
    const unsubQuality = subscribe('quality', (data) => {
      setReadings((prev) => [...prev, data as QualityReading].slice(-MAX_CHART_POINTS));
    });
    const unsubAlerts = subscribe('alerts', (data) => {
      setAlerts((prev) => [data as AnomalyAlert, ...prev].slice(0, MAX_ALERTS));
    });
    return () => { unsubQuality(); unsubAlerts(); };
  }, [subscribe]);

  if (loading) return <StatusMessage type="loading" />;
  if (error) return <StatusMessage type="error" message={error} />;

  const current = readings[readings.length - 1];
  const ph = current?.ph ?? 0;
  const tds = current?.tds_ppm ?? 0;
  const turbidity = current?.turbidity_ntu ?? 0;

  const chartData = readings.map((r) => ({
    time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    ph: Number(r.ph.toFixed(2)),
    tds: Number(r.tds_ppm.toFixed(0)),
    turbidity: Number(r.turbidity_ntu.toFixed(1)),
  }));

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-gray-800">Water Quality Tracker</h2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <KPICard label="pH" value={ph.toFixed(2)} status={ph < 6.5 || ph > 8.5 ? 'critical' : 'normal'} />
        <KPICard label="TDS" value={tds.toFixed(0)} unit="ppm" status={tds > 500 ? 'warning' : 'normal'} />
        <KPICard label="Turbidity" value={turbidity.toFixed(1)} unit="NTU" status={turbidity > 50 ? 'warning' : 'normal'} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Quality Metrics (last 60 readings)</h3>
        {chartData.length === 0 ? (
          <StatusMessage type="empty" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="ph" stroke="#3b82f6" dot={false} strokeWidth={2} name="pH" />
              <Line type="monotone" dataKey="tds" stroke="#10b981" dot={false} strokeWidth={2} name="TDS (ppm)" />
              <Line type="monotone" dataKey="turbidity" stroke="#f59e0b" dot={false} strokeWidth={2} name="Turbidity (NTU)" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <AlertFeed alerts={alerts} />
    </div>
  );
}
