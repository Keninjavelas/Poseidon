'use client';

import { useMemo, useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { KPICard } from '@/components/layout/KPICard';
import { useStore } from '@/store/useStore';

const MAX_CHART_POINTS = 60;
const FORECAST_WINDOW = 10;
const HEAVY_RAIN_THRESHOLD = 50;

function computeForecast(readings: any[]): 'rising' | 'stable' | 'falling' {
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
  const [isMounted, setIsMounted] = useState(false);
  const systemState = useStore((state) => state.systemState);
  const liveReadings = useStore((state) => state.rainfall);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const currentRate = useMemo(() => {
    const rainfallValues = Object.values(systemState.rainfall || {});
    const avgRainfall = 
      rainfallValues.reduce((sum, r) => sum + (r.mmPerHour || 0), 0) / 
      (rainfallValues.length || 1);
    return avgRainfall;
  }, [systemState.rainfall]);

  const isHeavy = currentRate > HEAVY_RAIN_THRESHOLD;
  const forecast = computeForecast(liveReadings);

  const chartData = useMemo(() => {
    // Filter and group readings by timestamp to show the average rate at each point in time
    const timeGroups = new Map<string, { timestamp: number, rates: number[] }>();
    
    liveReadings.forEach(r => {
      const date = r.timestamp ? new Date(r.timestamp) : new Date(1714125600000); // Deterministic fallback
      const ts = date.getTime();
      if (isNaN(ts)) return;

      // Use deterministic ISO-like formatting instead of locale-dependent to-string
      const h = date.getHours().toString().padStart(2, '0');
      const m = date.getMinutes().toString().padStart(2, '0');
      const s = date.getSeconds().toString().padStart(2, '0');
      const timeLabel = `${h}:${m}:${s}`;
      
      if (!timeGroups.has(timeLabel)) {
        timeGroups.set(timeLabel, { timestamp: ts, rates: [] });
      }
      timeGroups.get(timeLabel)!.rates.push(r.precipitation_rate_mm_hr || 0);
    });

    const data = Array.from(timeGroups.entries())
      .map(([time, { timestamp, rates }]) => ({
        time,
        timestamp,
        rate: Number((rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(2)),
      }))
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-MAX_CHART_POINTS);

    console.log('[RAIN] Chart Data Points:', data.length);
    return data;
  }, [liveReadings]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Rainfall Tracker</h2>
        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
          Live Twin State
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <KPICard label="Avg Precipitation Rate" value={currentRate.toFixed(2)} unit="mm/hr" status={isHeavy ? 'critical' : 'normal'} />
        <KPICard label="Forecast" value={FORECAST_LABELS[forecast]} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Precipitation History (Real-time)</h3>
        {chartData.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm italic">
            Waiting for rainfall data...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis unit=" mm/hr" tick={{ fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(v: number) => [`${v} mm/hr`, 'Rate']} 
              />
              <Line type="monotone" dataKey="rate" stroke="#3b82f6" dot={false} strokeWidth={2} isAnimationActive={false} />
            </LineChart>
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
