import type { GeoPoint, SensorId, TankId } from '@/simulation/models';

export type SimulationEvent =
  | { type: 'RAIN_SPIKE'; intensity: number }
  | { type: 'TANK_FAILURE'; tankId: TankId }
  | { type: 'SENSOR_OFFLINE'; sensorId: SensorId }
  | { type: 'PIPE_LEAK'; location: GeoPoint };
