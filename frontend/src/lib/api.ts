import type {
  RainfallReading, TankReading, QualityReading,
  IrrigationReading, UsageReading, AnomalyAlert
} from '@/types';
import type { SimulationEvent } from '@/simulation/events';
import type { SystemState } from '@/simulation/models';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function toNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeRainfall(reading: RainfallReading): RainfallReading {
  return {
    ...reading,
    precipitation_rate_mm_hr: toNumber(reading.precipitation_rate_mm_hr),
  };
}

function normalizeTank(reading: TankReading): TankReading {
  return {
    ...reading,
    volume_liters: toNumber(reading.volume_liters),
    capacity_liters: toNumber(reading.capacity_liters),
  };
}

function normalizeQuality(reading: QualityReading): QualityReading {
  return {
    ...reading,
    ph: toNumber(reading.ph),
    tds_ppm: toNumber(reading.tds_ppm),
    turbidity_ntu: toNumber(reading.turbidity_ntu),
  };
}

function normalizeIrrigation(reading: IrrigationReading): IrrigationReading {
  return {
    ...reading,
    soil_moisture_percent: toNumber(reading.soil_moisture_percent),
    irrigation_demand_liters: toNumber(reading.irrigation_demand_liters),
  };
}

function normalizeUsage(reading: UsageReading): UsageReading {
  return {
    ...reading,
    municipal_liters: toNumber(reading.municipal_liters),
    harvested_liters: toNumber(reading.harvested_liters),
    total_liters: toNumber(reading.total_liters),
  };
}

function normalizeAlert(reading: AnomalyAlert): AnomalyAlert {
  return {
    ...reading,
    confidence_score: toNumber(reading.confidence_score),
  };
}

async function fetchJson<T>(path: string, limit = 100, normalize?: (item: T) => T): Promise<T[]> {
  const res = await fetch(`${BASE_URL}${path}?limit=${limit}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = (await res.json()) as T[];
  return normalize ? data.map(normalize) : data;
}

async function fetchTimeSeriesJson<T>(path: string, limit = 100, normalize?: (item: T) => T): Promise<T[]> {
  const data = await fetchJson(path, limit, normalize);
  return data.reverse();
}

async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return (await res.json()) as T;
}

async function getTwinState(): Promise<{ state: SystemState; control: { paused: boolean; speed: number; timestepMs: number } }> {
  const res = await fetch(`${BASE_URL}/api/twin/state`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return (await res.json()) as { state: SystemState; control: { paused: boolean; speed: number; timestepMs: number } };
}

export const api = {
  getRainfall: (limit?: number) => fetchTimeSeriesJson<RainfallReading>('/api/rainfall', limit, normalizeRainfall),
  getHarvesting: (limit?: number) => fetchTimeSeriesJson<TankReading>('/api/harvesting', limit, normalizeTank),
  getQuality: (limit?: number) => fetchTimeSeriesJson<QualityReading>('/api/quality', limit, normalizeQuality),
  getAgriculture: (limit?: number) => fetchTimeSeriesJson<IrrigationReading>('/api/agriculture', limit, normalizeIrrigation),
  getUsage: (limit?: number) => fetchTimeSeriesJson<UsageReading>('/api/usage', limit, normalizeUsage),
  getAlerts: (limit?: number) => fetchJson<AnomalyAlert>('/api/alerts', limit, normalizeAlert),
  getTwinState,
  twinPlay: () => postJson<{ control: { paused: boolean; speed: number; timestepMs: number } }>('/api/twin/control', { action: 'play' }),
  twinPause: () => postJson<{ control: { paused: boolean; speed: number; timestepMs: number } }>('/api/twin/control', { action: 'pause' }),
  twinSetSpeed: (speed: number) => postJson<{ control: { paused: boolean; speed: number; timestepMs: number } }>('/api/twin/control', { action: 'speed', speed }),
  twinInjectEvent: (event: SimulationEvent) => postJson<{ accepted: boolean }>('/api/twin/event', event as unknown as Record<string, unknown>),
};
