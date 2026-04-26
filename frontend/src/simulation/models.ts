export type SensorId = string;
export type TankId = string;
export type ZoneId = string;

export type GeoPoint = {
  lng: number;
  lat: number;
};

export type Alert = {
  id: string;
  timestamp: number;
  severity: 'info' | 'warning' | 'critical';
  sourceId: string;
  message: string;
};

export type RainfallReading = {
  sensorId: SensorId;
  mmPerHour: number;
  status: 'online' | 'offline';
};

export type TankState = {
  id: TankId;
  name: string;
  capacityLiters: number;
  volumeLiters: number;
  catchmentAreaM2: number;
  efficiency: number;
  irrigationOutflowLps: number;
  usageOutflowLps: number;
  failure: boolean;
};

export type SoilState = {
  zoneId: ZoneId;
  moisturePct: number;
  absorptionRate: number;
  evaporationRate: number;
  irrigationUsageLps: number;
};

export type UsageState = {
  zoneId: ZoneId;
  municipalLiters: number;
  harvestedLiters: number;
  totalLiters: number;
};

export type GeoEntity = {
  id: string;
  type: 'tank' | 'sensor' | 'zone';
  coordinates: [number, number];
};

export type ZoneGeometry = {
  id: ZoneId;
  coordinates: [number, number][];
};

export type SystemState = {
  timestamp: number;
  temperatureC: number;
  rainfall: Record<SensorId, RainfallReading>;
  tanks: Record<TankId, TankState>;
  soil: Record<ZoneId, SoilState>;
  usage: Record<ZoneId, UsageState>;
  alerts: Alert[];
};

export type SimulationConfig = {
  seed: number;
  timestepMs: number;
  baseRainMmHr: number;
  rainAmplitudeMmHr: number;
  rainFrequencyHz: number;
  baseTemperatureC: number;
  temperatureAmplitudeC: number;
};

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  seed: 1337,
  timestepMs: 1000,
  baseRainMmHr: 3,
  rainAmplitudeMmHr: 2,
  rainFrequencyHz: 1 / (60 * 30),
  baseTemperatureC: 27,
  temperatureAmplitudeC: 8,
};

export const INITIAL_SYSTEM_STATE: SystemState = {
  timestamp: 1714125600000, // Fixed constant timestamp to prevent SSR hydration mismatch
  temperatureC: 27,
  rainfall: {
    S1: { sensorId: 'S1', mmPerHour: 2.8, status: 'online' },
    S2: { sensorId: 'S2', mmPerHour: 3.1, status: 'online' },
    S3: { sensorId: 'S3', mmPerHour: 2.5, status: 'online' },
  },
  tanks: {
    T1: {
      id: 'T1',
      name: 'North Reservoir',
      capacityLiters: 50000,
      volumeLiters: 32500,
      catchmentAreaM2: 1200,
      efficiency: 0.82,
      irrigationOutflowLps: 4,
      usageOutflowLps: 6,
      failure: false,
    },
    T2: {
      id: 'T2',
      name: 'South Reservoir',
      capacityLiters: 75000,
      volumeLiters: 42000,
      catchmentAreaM2: 1600,
      efficiency: 0.79,
      irrigationOutflowLps: 5,
      usageOutflowLps: 8,
      failure: false,
    },
  },
  soil: {
    Z1: {
      zoneId: 'Z1',
      moisturePct: 49,
      absorptionRate: 0.11,
      evaporationRate: 0.05,
      irrigationUsageLps: 1.8,
    },
    Z2: {
      zoneId: 'Z2',
      moisturePct: 54,
      absorptionRate: 0.09,
      evaporationRate: 0.045,
      irrigationUsageLps: 2.2,
    },
  },
  usage: {
    Z1: { zoneId: 'Z1', municipalLiters: 1200, harvestedLiters: 2200, totalLiters: 3400 },
    Z2: { zoneId: 'Z2', municipalLiters: 1500, harvestedLiters: 2800, totalLiters: 4300 },
  },
  alerts: [],
};

export const GEO_ENTITIES: GeoEntity[] = [
  { id: 'T1', type: 'tank', coordinates: [72.8777, 19.076] },
  { id: 'T2', type: 'tank', coordinates: [72.8794, 19.079] },
  { id: 'S1', type: 'sensor', coordinates: [72.8758, 19.0781] },
  { id: 'S2', type: 'sensor', coordinates: [72.8812, 19.0772] },
  { id: 'S3', type: 'sensor', coordinates: [72.8788, 19.0745] },
  { id: 'Z1', type: 'zone', coordinates: [72.8769, 19.0756] },
  { id: 'Z2', type: 'zone', coordinates: [72.8802, 19.0786] },
];

export const ZONE_GEOMETRIES: ZoneGeometry[] = [
  {
    id: 'Z1',
    coordinates: [
      [72.8752, 19.0751],
      [72.8768, 19.0748],
      [72.8774, 19.0758],
      [72.8762, 19.0763],
      [72.8752, 19.0751],
    ],
  },
  {
    id: 'Z2',
    coordinates: [
      [72.8792, 19.078],
      [72.8808, 19.0776],
      [72.8815, 19.0788],
      [72.8804, 19.0793],
      [72.8792, 19.078],
    ],
  },
];
