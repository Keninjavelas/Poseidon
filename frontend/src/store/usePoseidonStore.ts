'use client';

import { create } from 'zustand';
import type { AnomalyAlert, RainfallReading, TankReading, QualityReading, IrrigationReading, UsageReading, WsMessage } from '@/types';

type WsStatus = 'connecting' | 'connected' | 'disconnected';

type TelemetryState = {
  wsStatus: WsStatus;
  alerts: AnomalyAlert[];
  rainfall: RainfallReading[];
  harvesting: TankReading[];
  quality: QualityReading[];
  agriculture: IrrigationReading[];
  usage: UsageReading[];
  setWsStatus: (status: WsStatus) => void;
  clearAlerts: () => void;
  ingestMessage: <T>(message: WsMessage<T>) => void;
};

const MAX_ALERTS = 10;
const MAX_SERIES = 48;

export const usePoseidonStore = create<TelemetryState>((set) => ({
  wsStatus: 'connecting',
  alerts: [],
  rainfall: [],
  harvesting: [],
  quality: [],
  agriculture: [],
  usage: [],
  setWsStatus: (status) => set({ wsStatus: status }),
  clearAlerts: () => set({ alerts: [] }),
  ingestMessage: (message) =>
    set((state) => {
      switch (message.channel) {
        case 'alerts': {
          const nextAlerts = [message.data as AnomalyAlert, ...state.alerts].slice(0, MAX_ALERTS);
          return { alerts: nextAlerts };
        }
        case 'rainfall':
          return { rainfall: [...state.rainfall, message.data as RainfallReading].slice(-MAX_SERIES) };
        case 'tanks':
          return { harvesting: [...state.harvesting, message.data as TankReading].slice(-MAX_SERIES) };
        case 'quality':
          return { quality: [...state.quality, message.data as QualityReading].slice(-MAX_SERIES) };
        case 'irrigation':
          return { agriculture: [...state.agriculture, message.data as IrrigationReading].slice(-MAX_SERIES) };
        case 'usage':
          return { usage: [...state.usage, message.data as UsageReading].slice(-MAX_SERIES) };
        default:
          return state;
      }
    }),
}));