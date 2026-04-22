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

const wsMessageSchema = z.object({
  channel: z.enum(['rainfall', 'tanks', 'quality', 'irrigation', 'usage', 'alerts', 'system_state', 'system_control']),
  data: z.unknown(),
});

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

      switch (parsed.data.channel) {
        case 'alerts': {
          const alert = parsed.data.data as AnomalyAlert;
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
              },
              ...state.systemState.alerts,
            ].slice(0, MAX_ALERTS),
          };
          return { alerts: nextAlerts, systemState: nextSystem };
        }
        case 'rainfall': {
          const reading = parsed.data.data as LegacyRainfall;
          const next = { ...state.systemState };
          if (next.rainfall[reading.station_id]) {
            next.rainfall[reading.station_id] = {
              ...next.rainfall[reading.station_id],
              mmPerHour: reading.precipitation_rate_mm_hr,
              status: 'online',
            };
          }
          return {
            rainfall: [...state.rainfall, reading].slice(-MAX_SERIES),
            systemState: next,
          };
        }
        case 'tanks': {
          const reading = parsed.data.data as TankReading;
          const next = { ...state.systemState };
          if (next.tanks[reading.tank_id]) {
            next.tanks[reading.tank_id] = {
              ...next.tanks[reading.tank_id],
              volumeLiters: reading.volume_liters,
              capacityLiters: reading.capacity_liters,
            };
          }
          return {
            harvesting: [...state.harvesting, reading].slice(-MAX_SERIES),
            systemState: next,
          };
        }
        case 'quality':
          return { quality: [...state.quality, parsed.data.data as QualityReading].slice(-MAX_SERIES) };
        case 'irrigation': {
          const reading = parsed.data.data as IrrigationReading;
          const next = { ...state.systemState };
          if (next.soil[reading.zone_id]) {
            next.soil[reading.zone_id] = {
              ...next.soil[reading.zone_id],
              moisturePct: reading.soil_moisture_percent,
              irrigationUsageLps: reading.irrigation_demand_liters / 3600,
            };
          }
          return {
            agriculture: [...state.agriculture, reading].slice(-MAX_SERIES),
            systemState: next,
          };
        }
        case 'usage': {
          const reading = parsed.data.data as UsageReading;
          const next = { ...state.systemState };
          Object.values(next.usage).forEach((zoneUsage) => {
            zoneUsage.harvestedLiters = reading.harvested_liters;
            zoneUsage.municipalLiters = reading.municipal_liters;
            zoneUsage.totalLiters = reading.total_liters;
          });
          return {
            usage: [...state.usage, reading].slice(-MAX_SERIES),
            systemState: next,
          };
        }
        case 'system_state': {
          return {
            systemState: parsed.data.data as SystemState,
          };
        }
        case 'system_control': {
          const payload = parsed.data.data as { paused?: boolean; speed?: number };
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
