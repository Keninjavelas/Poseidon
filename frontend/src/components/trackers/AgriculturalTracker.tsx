'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { KPICard } from '@/components/layout/KPICard';
import { StatusMessage } from '@/components/layout/StatusMessage';
import { api } from '@/lib/api';
import { useWebSocket } from '@/lib/useWebSocket';
import type { IrrigationReading } from '@/types';

const LOW_MOISTURE_THRESHOLD = 30;
const SOURCE_COLORS: Record<string, string> = {
  harvested: '#3b82f6',
  municipal: '#f59e0b',
};

function getLatestPerZone(readings: IrrigationReading[]): Map<string, IrrigationReading> {
  const map = new Map<string, IrrigationReading>();
  for (const r of readings) map.set(r.zone_id, r);
  return map;
}

export function AgriculturalTracker() {
  const [readings, setReadings] = useState<IrrigationReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { subscribe } = useWebSocket();

  useEffect(() => {
    api.getAgriculture(100)
      .then((data) => { setReadings(data); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe('irrigation', (data) => {
      setReadings((prev) => [...prev, data as IrrigationReading]);
    });
    return unsubscribe;
  }, [subscribe]);

  if (loading) return <StatusMessage type="loading" />;
  if (error) return <StatusMessage type="error" message={error} />;

  const latestPerZone = getLatestPerZone(readings);
  const chartData = Array.from(latestPerZone.values()).map((r) => ({
    zone: r.zone_id,
    demand: Number(r.irrigation_demand_liters.toFixed(1)),
    source: r.water_source,
  }));

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-gray-800">Agricultural Tracker</h2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from(latestPerZone.values()).map((r) => (
          <KPICard
            key={`moisture-${r.zone_id}`}
            label={`${r.zone_id} Moisture`}
            value={r.soil_moisture_percent.toFixed(1)}
            unit="%"
            warning={r.soil_moisture_percent < LOW_MOISTURE_THRESHOLD}
          />
        ))}
        {Array.from(latestPerZone.values()).map((r) => (
          <KPICard
            key={`demand-${r.zone_id}`}
            label={`${r.zone_id} Demand`}
            value={r.irrigation_demand_liters.toFixed(1)}
            unit={`L (${r.water_source})`}
          />
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Irrigation Demand per Zone</h3>
        {chartData.length === 0 ? (
          <StatusMessage type="empty" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="zone" tick={{ fontSize: 11 }} />
              <YAxis unit=" L" tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="demand" name="Demand (L)">
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
    </div>
  );
}
