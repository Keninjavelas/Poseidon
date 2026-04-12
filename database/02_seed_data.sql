-- Seed data for Poseidon Smart Water Hub
-- Timestamps spread over the last hour (relative to NOW())

-- Rainfall_Log (5 rows, precipitation_rate_mm_hr: 0–80 mm/hr)
INSERT INTO "Rainfall_Log" (timestamp, precipitation_rate_mm_hr, station_id) VALUES
  (NOW() - INTERVAL '55 minutes', 2.40,  'station-north-01'),
  (NOW() - INTERVAL '44 minutes', 0.00,  'station-north-01'),
  (NOW() - INTERVAL '33 minutes', 14.75, 'station-south-02'),
  (NOW() - INTERVAL '18 minutes', 37.20, 'station-south-02'),
  (NOW() - INTERVAL '5 minutes',  61.80, 'station-east-03');

-- Storage_Tanks (5 rows, volume_liters <= capacity_liters)
INSERT INTO "Storage_Tanks" (timestamp, tank_id, volume_liters, capacity_liters) VALUES
  (NOW() - INTERVAL '58 minutes', 'tank-A', 4200.00,  10000.00),
  (NOW() - INTERVAL '46 minutes', 'tank-A', 4850.50,  10000.00),
  (NOW() - INTERVAL '34 minutes', 'tank-B', 1200.00,   5000.00),
  (NOW() - INTERVAL '20 minutes', 'tank-B', 2975.75,   5000.00),
  (NOW() - INTERVAL '7 minutes',  'tank-A', 6340.00,  10000.00);

-- Quality_Sensors (5 rows, ph: 5.5–8.5, tds_ppm: 50–800, turbidity_ntu: 0–100)
INSERT INTO "Quality_Sensors" (timestamp, sensor_id, ph, tds_ppm, turbidity_ntu) VALUES
  (NOW() - INTERVAL '57 minutes', 'qs-inlet-01', 7.20, 185.00, 3.40),
  (NOW() - INTERVAL '45 minutes', 'qs-inlet-01', 6.85, 210.50, 5.10),
  (NOW() - INTERVAL '30 minutes', 'qs-outlet-02', 7.55, 320.00, 12.80),
  (NOW() - INTERVAL '15 minutes', 'qs-outlet-02', 8.10, 495.75, 28.60),
  (NOW() - INTERVAL '4 minutes',  'qs-inlet-01', 6.40, 730.00, 67.30);

-- Irrigation_Zones (5 rows, soil_moisture_percent: 10–90, water_source: 'harvested'|'municipal')
INSERT INTO "Irrigation_Zones" (timestamp, zone_id, soil_moisture_percent, irrigation_demand_liters, water_source) VALUES
  (NOW() - INTERVAL '56 minutes', 'zone-alpha',  72.50, 120.00, 'harvested'),
  (NOW() - INTERVAL '43 minutes', 'zone-beta',   45.00, 340.00, 'harvested'),
  (NOW() - INTERVAL '29 minutes', 'zone-gamma',  28.30, 580.00, 'municipal'),
  (NOW() - INTERVAL '14 minutes', 'zone-alpha',  18.90, 750.00, 'municipal'),
  (NOW() - INTERVAL '3 minutes',  'zone-beta',   61.00, 200.00, 'harvested');

-- Overall_Usage (5 rows, total_liters = municipal_liters + harvested_liters)
INSERT INTO "Overall_Usage" (timestamp, municipal_liters, harvested_liters, total_liters) VALUES
  (NOW() - INTERVAL '54 minutes',    0.00,  120.00,  120.00),
  (NOW() - INTERVAL '41 minutes',    0.00,  340.00,  340.00),
  (NOW() - INTERVAL '27 minutes',  180.00,  400.00,  580.00),
  (NOW() - INTERVAL '13 minutes',  750.00,    0.00,  750.00),
  (NOW() - INTERVAL '2 minutes',     0.00,  200.00,  200.00);

-- Anomaly_Alerts (5 rows, confidence_score: 0.0–1.0, alert_type from valid set)
INSERT INTO "Anomaly_Alerts" (timestamp, node_id, alert_type, confidence_score, payload_json) VALUES
  (NOW() - INTERVAL '52 minutes', 'optical-node-01', 'Contaminant Detected',  0.923, '{"frame": 1042, "bbox": [120, 80, 200, 160], "label": "chemical_residue"}'),
  (NOW() - INTERVAL '39 minutes', 'optical-node-02', 'Pipe Blockage',         0.871, '{"frame": 2318, "bbox": [300, 50, 420, 130], "label": "debris_cluster"}'),
  (NOW() - INTERVAL '25 minutes', 'optical-node-01', 'Severe Discoloration',  0.756, '{"frame": 3501, "bbox": [60, 200, 180, 310], "label": "rust_stain"}'),
  (NOW() - INTERVAL '11 minutes', 'optical-node-03', 'Foreign Object',        0.988, '{"frame": 4790, "bbox": [250, 150, 370, 260], "label": "plastic_fragment"}'),
  (NOW() - INTERVAL '1 minute',   'optical-node-02', 'Contaminant Detected',  0.642, '{"frame": 5933, "bbox": [90, 310, 210, 400], "label": "oil_sheen"}');
