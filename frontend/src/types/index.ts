export interface RainfallReading {
  id: number;
  timestamp: string;
  precipitation_rate_mm_hr: number;
  station_id: string;
}

export interface TankReading {
  id: number;
  timestamp: string;
  tank_id: string;
  volume_liters: number;
  capacity_liters: number;
}

export interface QualityReading {
  id: number;
  timestamp: string;
  sensor_id: string;
  ph: number;
  tds_ppm: number;
  turbidity_ntu: number;
}

export interface IrrigationReading {
  id: number;
  timestamp: string;
  zone_id: string;
  soil_moisture_percent: number;
  irrigation_demand_liters: number;
  water_source: 'harvested' | 'municipal';
}

export interface UsageReading {
  id: number;
  timestamp: string;
  municipal_liters: number;
  harvested_liters: number;
  total_liters: number;
}

export interface AnomalyAlert {
  id: number;
  timestamp: string;
  node_id: string;
  alert_type: 'Contaminant Detected' | 'Pipe Blockage' | 'Severe Discoloration' | 'Foreign Object';
  confidence_score: number;
  payload_json: Record<string, unknown>;
}

export type AlertPayload = Pick<AnomalyAlert, 'node_id' | 'timestamp' | 'alert_type' | 'confidence_score'> & {
  raw_detection_json: Record<string, unknown>;
};

export interface WsMessage<T> {
  channel: 'rainfall' | 'tanks' | 'quality' | 'irrigation' | 'usage' | 'alerts';
  data: T;
}
