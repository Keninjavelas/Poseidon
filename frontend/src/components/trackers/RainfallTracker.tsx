'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { KPICard } from '@/components/layout/KPICard';
import { StatusMessage } from '@/components/layout/StatusMessage';
import { api } from '@/lib/api';
import { useWebSocket } from '@/lib/useWebSocket';
import type { RainfallReading } from '@/types';

const MAX_CHART_POINTS = 60;
const FORECAST_WINDOW = 10;
const HEAVY_RAIN_THRESHOLD = 50;

function computeForecast(readings: RainfallReading[]): 'rising' | 'stable' | 'falling' {
  if (readings.length < 2) return 'stable';
  const window = readings.slice(-FORECAST_WINDOW);
  const first = window[0].precipitation_rate_mm_hr;
  const last = window[window.length - 1].precipitation_rate_mm_hr;
  const delta = last - first;
  if (delta > 2) return 'rising';
  if (delta < -2) return 'falling';
  return 'stable';
}

const FORECAST_LABELS: Record<string, string> = {
  rising: '↑ Rising',
  stable: '→ Stable',
  falling: '↓ Falling',
};

export function RainfallTracker() {
  const [readings, setReadings] = useState<RainfallReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { subscribe } = useWebSocket();

  useEffect(() => {
    api.getRainfall(100)
      .then((data) => { setReadings(data.slice(-MAX_CHART_POINTS)); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe('rainfall', (data) => {
      const reading = data as RainfallReading;
      setReadings((prev) => [...prev, reading].slice(-MAX_CHART_POINTS));
    });
    return unsubscribe;
  }, [subscribe]);

  if (loading) return <StatusMessage type="loading" />;
  if (error) return <StatusMessage type="error" message={error} />;

  const current = readings[readings.length - 1];
  const currentRate = current?.precipitation_rate_mm_hr ?? 0;
  const isHeavy = currentRate > HEAVY_RAIN_THRESHOLD;
  const forecast = computeForecast(readings);

  const chartData = readings.map((r) => ({
    time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    rate: Number(r.precipitation_rate_mm_hr.toFixed(2)),
  }));

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-gray-800">Rainfall Tracker</h2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <KPICard label="Precipitation Rate" value={currentRate.toFixed(2)} unit="mm/hr" warning={isHeavy} />
        <KPICard label="Forecast" value={FORECAST_LABELS[forecast]} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Precipitation Rate (last 60 readings)</h3>
        {chartData.length === 0 ? (
          <StatusMessage type="empty" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis unit=" mm/hr" tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => [`${v} mm/hr`, 'Rate']} />
              <Line type="monotone" dataKey="rate" stroke="#3b82f6" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
