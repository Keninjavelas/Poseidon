'use client';

import { create } from 'zustand';
import { z } from 'zod';
import type {
  AnomalyAlert,
  IrrigationReading,
  QualityReading,
  RainfallReading as LegacyRainfall,
  TankReading,
  UsageReading,
  WsMessage,
} from '@/types';
import {
  INITIAL_SYSTEM_STATE,
  type Alert,
  type GeoEntity,
  type SystemState,
} from '@/simulation/models';

export type WsStatus = 'connecting' | 'connected' | 'disconnected';
export type UiMode = 'dashboard' | 'map' | '3d';

type ChaosProfile = {
  enabled: boolean;
  intensity: number;
};

type TimeControl = {
  isPaused: boolean;
  speed: number;
};

type DigitalTwinState = {
  wsStatus: WsStatus;
  uiMode: UiMode;
  selectedEntity: GeoEntity | null;
  systemState: SystemState;
  chaos: ChaosProfile;
  timeControl: TimeControl;
  alerts: AnomalyAlert[];
  rainfall: LegacyRainfall[];
  harvesting: TankReading[];
  quality: QualityReading[];
  agriculture: IrrigationReading[];
  usage: UsageReading[];
  setWsStatus: (status: WsStatus) => void;
  setUiMode: (mode: UiMode) => void;
  setSelectedEntity: (entity: GeoEntity | null) => void;
  clearAlerts: () => void;
  pause: () => void;
  play: () => void;
  setSpeed: (speed: number) => void;
  setChaos: (enabled: boolean, intensity: number) => void;
  setSystemState: (nextState: SystemState) => void;
  setTimeControl: (paused: boolean, speed: number) => void;
  ingestMessage: <T>(message: WsMessage<T>) => void;
};

const MAX_ALERTS = 20;
const MAX_SERIES = 64;

const wsMessageSchema = z.union([
  z.object({
    channel: z.enum(['rainfall', 'tanks', 'quality', 'irrigation', 'usage', 'alerts', 'system_state', 'system_control']),
    data: z.unknown(),
  }),
  z.object({
    type: z.enum(['rainfall', 'tanks', 'quality', 'irrigation', 'usage', 'alerts', 'system_state', 'system_control']),
    payload: z.unknown(),
  }),
]);

export const useStore = create<DigitalTwinState>((set) => ({
  wsStatus: 'connecting',
  uiMode: 'dashboard',
  selectedEntity: null,
  systemState: INITIAL_SYSTEM_STATE,
  chaos: {
    enabled: false,
    intensity: 0,
  },
  timeControl: {
    isPaused: false,
    speed: 1,
  },
  alerts: [],
  rainfall: [],
  harvesting: [],
  quality: [],
  agriculture: [],
  usage: [],
  setWsStatus: (status) => set({ wsStatus: status }),
  setUiMode: (mode) => set({ uiMode: mode }),
  setSelectedEntity: (entity) => set({ selectedEntity: entity }),
  clearAlerts: () => set((state) => ({ alerts: [], systemState: { ...state.systemState, alerts: [] } })),
  pause: () => set((state) => ({ timeControl: { ...state.timeControl, isPaused: true } })),
  play: () => set((state) => ({ timeControl: { ...state.timeControl, isPaused: false } })),
  setSpeed: (speed) => set((state) => ({ timeControl: { ...state.timeControl, speed } })),
  setChaos: (enabled, intensity) =>
    set({
      chaos: {
        enabled,
        intensity: Math.max(0, Math.min(1, intensity)),
      },
    }),
  setSystemState: (nextState) => set({ systemState: nextState }),
  setTimeControl: (paused, speed) =>
    set((state) => ({
      timeControl: {
        ...state.timeControl,
        isPaused: Boolean(paused),
        speed: Number.isFinite(speed) && speed > 0 ? speed : state.timeControl.speed,
      },
    })),
  ingestMessage: (message) =>
    set((state) => {
      const parsed = wsMessageSchema.safeParse(message);
      if (!parsed.success) {
        return state;
      }

      const msg = parsed.data;
      let channel: string;
      let data: any;

      if ('channel' in msg) {
        channel = msg.channel;
        data = msg.data;
      } else {
        channel = msg.type;
        data = msg.payload;
      }

      switch (channel) {
        case 'alerts': {
          const alert = data as AnomalyAlert;
          const nextAlerts = [alert, ...state.alerts].slice(0, MAX_ALERTS);
          const nextSystem = {
            ...state.systemState,
            alerts: [
              {
                id: String(alert.id),
                timestamp: new Date(alert.timestamp).getTime(),
                severity: alert.confidence_score > 0.8 ? 'critical' : 'warning',
                sourceId: alert.node_id,
                message: alert.alert_type,
              } as Alert,
              ...state.systemState.alerts,
            ].slice(0, MAX_ALERTS),
          };
          return { alerts: nextAlerts, systemState: nextSystem };
        }
        case 'rainfall': {
          const reading = data as LegacyRainfall;
          if (!reading) return state;
          
          return {
            rainfall: [...state.rainfall, reading].slice(-MAX_SERIES),
          };
        }
        case 'tanks': {
          const reading = data as TankReading;
          if (!reading) return state;

          return {
            harvesting: [...state.harvesting, reading].slice(-MAX_SERIES),
          };
        }
        case 'quality':
          return { quality: [...state.quality, data as QualityReading].slice(-MAX_SERIES) };
        case 'irrigation': {
          const reading = data as IrrigationReading;
          if (!reading) return state;

          return {
            agriculture: [...state.agriculture, reading].slice(-MAX_SERIES),
          };
        }
        case 'usage': {
          const reading = data as UsageReading;
          if (!reading) return state;

          return {
            usage: [...state.usage, reading].slice(-MAX_SERIES),
          };
        }
        case 'system_state': {
          const incomingData = data as any;
          
          if (!incomingData || typeof incomingData !== 'object') {
            console.error('[STORE] Received invalid system_state:', data);
            return state;
          }

          // USE ONLY system_state as requested
          const nextState: SystemState = {
            ...INITIAL_SYSTEM_STATE,
            ...incomingData,
          };

          const isoTimestamp = typeof nextState.timestamp === 'number' 
            ? new Date(nextState.timestamp).toISOString() 
            : (nextState.timestamp || new Date().toISOString());
          
          // Explode state into historical arrays for dashboards
          const newRainfall = Object.values(nextState.rainfall || {}).map(r => ({
            id: Math.random(),
            timestamp: isoTimestamp,
            station_id: r.sensorId,
            precipitation_rate_mm_hr: r.mmPerHour || 0,
          } as LegacyRainfall));

          const newHarvesting = Object.values(nextState.tanks || {}).map(t => ({
            id: Math.random(),
            timestamp: isoTimestamp,
            tank_id: t.id,
            volume_liters: t.volume_liters || t.volumeLiters || 0,
            capacity_liters: t.capacity_liters || t.capacityLiters || 1,
          } as TankReading));

          const newAgriculture = Object.values(nextState.soil || {}).map(s => ({
            id: Math.random(),
            timestamp: isoTimestamp,
            zone_id: s.zoneId,
            soil_moisture_percent: s.moisturePct || 0,
            irrigation_demand_liters: (s.irrigationUsageLps || 0) * 3600,
            water_source: (s.moisturePct || 0) < 50 ? 'municipal' : 'harvested',
          } as IrrigationReading));

          const newUsage = Object.entries(nextState.usage || {}).map(([zoneId, u]) => ({
            id: Math.random(),
            timestamp: isoTimestamp,
            zone_id: zoneId,
            municipal_liters: u.municipalLiters || 0,
            harvested_liters: u.harvestedLiters || 0,
            total_liters: u.totalLiters || 0,
          } as UsageReading));

          return {
            systemState: nextState,
            rainfall: [...state.rainfall, ...newRainfall].slice(-MAX_SERIES),
            harvesting: [...state.harvesting, ...newHarvesting].slice(-MAX_SERIES),
            agriculture: [...state.agriculture, ...newAgriculture].slice(-MAX_SERIES),
            usage: [...state.usage, ...newUsage].slice(-MAX_SERIES),
          };
        }
        case 'system_control': {
          const payload = data as { paused?: boolean; speed?: number };
          return {
            timeControl: {
              ...state.timeControl,
              isPaused: Boolean(payload.paused),
              speed:
                Number.isFinite(payload.speed) && Number(payload.speed) > 0
                  ? Number(payload.speed)
                  : state.timeControl.speed,
            },
          };
        }
        default:
          return state;
      }
    }),
}));
