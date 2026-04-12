'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { KPICard } from '@/components/layout/KPICard';
import { StatusMessage } from '@/components/layout/StatusMessage';
import { api } from '@/lib/api';
import { useWebSocket } from '@/lib/useWebSocket';
import type { TankReading } from '@/types';

const LOW_RESERVE_THRESHOLD = 0.2;

function getLatestPerTank(readings: TankReading[]): Map<string, TankReading> {
  const map = new Map<string, TankReading>();
  for (const r of readings) map.set(r.tank_id, r);
  return map;
}

function computeDailyHarvested(readings: TankReading[]): number {
  const today = new Date().toDateString();
  return readings
    .filter((r) => new Date(r.timestamp).toDateString() === today)
    .reduce((sum, r) => sum + r.volume_liters, 0);
}

export function HarvestingTracker() {
  const [readings, setReadings] = useState<TankReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { subscribe } = useWebSocket();

  useEffect(() => {
    api.getHarvesting(100)
      .then((data) => { setReadings(data); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe('tanks', (data) => {
      setReadings((prev) => [...prev, data as TankReading]);
    });
    return unsubscribe;
  }, [subscribe]);

  if (loading) return <StatusMessage type="loading" />;
  if (error) return <StatusMessage type="error" message={error} />;

  const latestPerTank = getLatestPerTank(readings);
  const dailyHarvested = computeDailyHarvested(readings);
  const chartData = Array.from(latestPerTank.values()).map((r) => ({
    tank: r.tank_id,
    volume: Number(r.volume_liters.toFixed(0)),
    capacity: Number(r.capacity_liters.toFixed(0)),
  }));

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-gray-800">Harvesting Tracker</h2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from(latestPerTank.values()).map((r) => {
          const fillPct = r.capacity_liters > 0 ? r.volume_liters / r.capacity_liters : 0;
          return (
            <KPICard
              key={r.tank_id}
              label={`${r.tank_id} Volume`}
              value={r.volume_liters.toFixed(0)}
              unit={`L (${(fillPct * 100).toFixed(1)}%)`}
              warning={fillPct < LOW_RESERVE_THRESHOLD}
            />
          );
        })}
        <KPICard label="Daily Harvested" value={dailyHarvested.toFixed(0)} unit="L today" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Tank Volume vs Capacity</h3>
        {chartData.length === 0 ? (
          <StatusMessage type="empty" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="tank" tick={{ fontSize: 11 }} />
              <YAxis unit=" L" tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="volume" fill="#3b82f6" name="Volume (L)" />
              <Bar dataKey="capacity" fill="#e5e7eb" name="Capacity (L)" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
