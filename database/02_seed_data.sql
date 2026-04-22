-- Seed data for Poseidon Smart Water Hub
-- Demo dataset designed to look like an actively used multi-site enterprise deployment.

TRUNCATE TABLE
  "Rainfall_Log",
  "Storage_Tanks",
  "Quality_Sensors",
  "Irrigation_Zones",
  "Overall_Usage",
  "Anomaly_Alerts"
RESTART IDENTITY;

-- Rainfall telemetry across regional collection points over the last 6 hours.
INSERT INTO "Rainfall_Log" (timestamp, precipitation_rate_mm_hr, station_id) VALUES
  (NOW() - INTERVAL '5 hours 45 minutes', 1.20, 'north-campus-rg01'),
  (NOW() - INTERVAL '5 hours 30 minutes', 0.80, 'south-campus-rg02'),
  (NOW() - INTERVAL '5 hours 15 minutes', 2.40, 'distribution-east-rg01'),
  (NOW() - INTERVAL '5 hours', 4.70, 'north-campus-rg01'),
  (NOW() - INTERVAL '4 hours 45 minutes', 6.90, 'warehouse-west-rg01'),
  (NOW() - INTERVAL '4 hours 30 minutes', 9.60, 'south-campus-rg02'),
  (NOW() - INTERVAL '4 hours 15 minutes', 12.40, 'distribution-east-rg01'),
  (NOW() - INTERVAL '4 hours', 15.10, 'north-campus-rg01'),
  (NOW() - INTERVAL '3 hours 45 minutes', 18.30, 'warehouse-west-rg01'),
  (NOW() - INTERVAL '3 hours 30 minutes', 22.90, 'south-campus-rg02'),
  (NOW() - INTERVAL '3 hours 15 minutes', 28.40, 'distribution-east-rg01'),
  (NOW() - INTERVAL '3 hours', 32.80, 'north-campus-rg01'),
  (NOW() - INTERVAL '2 hours 45 minutes', 38.20, 'warehouse-west-rg01'),
  (NOW() - INTERVAL '2 hours 30 minutes', 41.60, 'south-campus-rg02'),
  (NOW() - INTERVAL '2 hours 15 minutes', 35.70, 'distribution-east-rg01'),
  (NOW() - INTERVAL '2 hours', 29.40, 'north-campus-rg01'),
  (NOW() - INTERVAL '1 hour 45 minutes', 24.80, 'warehouse-west-rg01'),
  (NOW() - INTERVAL '1 hour 30 minutes', 18.60, 'south-campus-rg02'),
  (NOW() - INTERVAL '1 hour 15 minutes', 12.10, 'distribution-east-rg01'),
  (NOW() - INTERVAL '1 hour', 8.30, 'north-campus-rg01'),
  (NOW() - INTERVAL '45 minutes', 5.10, 'warehouse-west-rg01'),
  (NOW() - INTERVAL '30 minutes', 3.40, 'south-campus-rg02'),
  (NOW() - INTERVAL '15 minutes', 6.70, 'distribution-east-rg01'),
  (NOW() - INTERVAL '5 minutes', 11.20, 'north-campus-rg01');

-- Storage tank activity for four production reservoirs.
INSERT INTO "Storage_Tanks" (timestamp, tank_id, volume_liters, capacity_liters, fill_percent) VALUES
  (NOW() - INTERVAL '5 hours 30 minutes', 'hq-tank-01', 11200.00, 16000.00, 70.00),
  (NOW() - INTERVAL '5 hours', 'hq-tank-02', 8450.00, 12000.00, 70.42),
  (NOW() - INTERVAL '4 hours 30 minutes', 'plant-tank-01', 12850.00, 18000.00, 71.39),
  (NOW() - INTERVAL '4 hours', 'plant-tank-02', 9250.00, 15000.00, 61.67),
  (NOW() - INTERVAL '3 hours 30 minutes', 'hq-tank-01', 11840.00, 16000.00, 74.00),
  (NOW() - INTERVAL '3 hours', 'hq-tank-02', 9020.00, 12000.00, 75.17),
  (NOW() - INTERVAL '2 hours 30 minutes', 'plant-tank-01', 13720.00, 18000.00, 76.22),
  (NOW() - INTERVAL '2 hours', 'plant-tank-02', 10140.00, 15000.00, 67.60),
  (NOW() - INTERVAL '1 hour 30 minutes', 'hq-tank-01', 12410.00, 16000.00, 77.56),
  (NOW() - INTERVAL '1 hour 5 minutes', 'hq-tank-02', 9580.00, 12000.00, 79.83),
  (NOW() - INTERVAL '50 minutes', 'plant-tank-01', 14560.00, 18000.00, 80.89),
  (NOW() - INTERVAL '40 minutes', 'plant-tank-02', 10980.00, 15000.00, 73.20),
  (NOW() - INTERVAL '28 minutes', 'hq-tank-01', 12940.00, 16000.00, 80.88),
  (NOW() - INTERVAL '20 minutes', 'hq-tank-02', 9960.00, 12000.00, 83.00),
  (NOW() - INTERVAL '12 minutes', 'plant-tank-01', 15110.00, 18000.00, 83.94),
  (NOW() - INTERVAL '4 minutes', 'plant-tank-02', 11420.00, 15000.00, 76.13);

-- Water quality readings from inlet, treatment, and downstream sensors.
INSERT INTO "Quality_Sensors" (timestamp, sensor_id, ph, tds_ppm, turbidity_ntu, alert_level) VALUES
  (NOW() - INTERVAL '5 hours 40 minutes', 'quality-inlet-01', 7.18, 184.00, 2.80, 'normal'),
  (NOW() - INTERVAL '5 hours 20 minutes', 'quality-treatment-01', 7.12, 191.00, 3.10, 'normal'),
  (NOW() - INTERVAL '5 hours', 'quality-outlet-01', 7.20, 205.00, 3.40, 'normal'),
  (NOW() - INTERVAL '4 hours 40 minutes', 'quality-inlet-01', 7.10, 212.00, 4.10, 'normal'),
  (NOW() - INTERVAL '4 hours 20 minutes', 'quality-treatment-01', 7.06, 224.00, 4.60, 'normal'),
  (NOW() - INTERVAL '4 hours', 'quality-outlet-01', 7.14, 238.00, 5.00, 'normal'),
  (NOW() - INTERVAL '3 hours 40 minutes', 'quality-inlet-01', 7.02, 251.00, 5.80, 'normal'),
  (NOW() - INTERVAL '3 hours 20 minutes', 'quality-treatment-01', 6.98, 268.00, 6.20, 'normal'),
  (NOW() - INTERVAL '3 hours', 'quality-outlet-01', 7.05, 289.00, 7.10, 'normal'),
  (NOW() - INTERVAL '2 hours 40 minutes', 'quality-inlet-01', 6.96, 315.00, 8.60, 'normal'),
  (NOW() - INTERVAL '2 hours 20 minutes', 'quality-treatment-01', 6.90, 344.00, 10.30, 'normal'),
  (NOW() - INTERVAL '2 hours', 'quality-outlet-01', 6.94, 372.00, 12.20, 'normal'),
  (NOW() - INTERVAL '1 hour 40 minutes', 'quality-inlet-01', 6.88, 418.00, 15.40, 'elevated'),
  (NOW() - INTERVAL '1 hour 20 minutes', 'quality-treatment-01', 6.82, 456.00, 18.70, 'elevated'),
  (NOW() - INTERVAL '1 hour', 'quality-outlet-01', 6.89, 478.00, 21.90, 'elevated'),
  (NOW() - INTERVAL '45 minutes', 'quality-inlet-01', 6.78, 498.00, 27.50, 'elevated'),
  (NOW() - INTERVAL '32 minutes', 'quality-treatment-01', 6.74, 522.00, 33.20, 'warning'),
  (NOW() - INTERVAL '20 minutes', 'quality-outlet-01', 6.81, 486.00, 24.60, 'elevated'),
  (NOW() - INTERVAL '10 minutes', 'quality-inlet-01', 6.92, 441.00, 16.90, 'normal'),
  (NOW() - INTERVAL '3 minutes', 'quality-treatment-01', 7.01, 398.00, 11.80, 'normal');

-- Irrigation telemetry for landscaped zones and agricultural plots.
INSERT INTO "Irrigation_Zones" (timestamp, zone_id, soil_moisture_percent, irrigation_demand_liters, water_source) VALUES
  (NOW() - INTERVAL '5 hours 35 minutes', 'orchard-north', 54.20, 280.00, 'harvested'),
  (NOW() - INTERVAL '5 hours 10 minutes', 'greenbelt-east', 49.10, 360.00, 'harvested'),
  (NOW() - INTERVAL '4 hours 45 minutes', 'sports-turf-west', 42.60, 520.00, 'municipal'),
  (NOW() - INTERVAL '4 hours 20 minutes', 'greenhouse-alpha', 58.30, 210.00, 'harvested'),
  (NOW() - INTERVAL '3 hours 50 minutes', 'orchard-north', 46.80, 410.00, 'harvested'),
  (NOW() - INTERVAL '3 hours 25 minutes', 'greenbelt-east', 41.90, 495.00, 'municipal'),
  (NOW() - INTERVAL '3 hours', 'sports-turf-west', 36.40, 640.00, 'municipal'),
  (NOW() - INTERVAL '2 hours 35 minutes', 'greenhouse-alpha', 52.10, 260.00, 'harvested'),
  (NOW() - INTERVAL '2 hours 10 minutes', 'orchard-north', 39.70, 560.00, 'municipal'),
  (NOW() - INTERVAL '1 hour 45 minutes', 'greenbelt-east', 35.20, 610.00, 'municipal'),
  (NOW() - INTERVAL '1 hour 20 minutes', 'sports-turf-west', 31.80, 690.00, 'municipal'),
  (NOW() - INTERVAL '55 minutes', 'greenhouse-alpha', 47.60, 320.00, 'harvested'),
  (NOW() - INTERVAL '30 minutes', 'orchard-north', 44.50, 370.00, 'harvested'),
  (NOW() - INTERVAL '18 minutes', 'greenbelt-east', 38.40, 540.00, 'municipal'),
  (NOW() - INTERVAL '9 minutes', 'sports-turf-west', 29.60, 760.00, 'municipal'),
  (NOW() - INTERVAL '2 minutes', 'greenhouse-alpha', 51.80, 240.00, 'harvested');

-- Rolling site-wide water usage snapshots for the last 24 reporting periods.
INSERT INTO "Overall_Usage" (timestamp, municipal_liters, harvested_liters, total_liters) VALUES
  (NOW() - INTERVAL '5 hours 45 minutes', 420.00, 980.00, 1400.00),
  (NOW() - INTERVAL '5 hours 30 minutes', 390.00, 1010.00, 1400.00),
  (NOW() - INTERVAL '5 hours 15 minutes', 410.00, 1055.00, 1465.00),
  (NOW() - INTERVAL '5 hours', 445.00, 1090.00, 1535.00),
  (NOW() - INTERVAL '4 hours 45 minutes', 470.00, 1120.00, 1590.00),
  (NOW() - INTERVAL '4 hours 30 minutes', 520.00, 1105.00, 1625.00),
  (NOW() - INTERVAL '4 hours 15 minutes', 560.00, 1080.00, 1640.00),
  (NOW() - INTERVAL '4 hours', 610.00, 1045.00, 1655.00),
  (NOW() - INTERVAL '3 hours 45 minutes', 680.00, 1010.00, 1690.00),
  (NOW() - INTERVAL '3 hours 30 minutes', 720.00, 995.00, 1715.00),
  (NOW() - INTERVAL '3 hours 15 minutes', 760.00, 980.00, 1740.00),
  (NOW() - INTERVAL '3 hours', 810.00, 955.00, 1765.00),
  (NOW() - INTERVAL '2 hours 45 minutes', 860.00, 940.00, 1800.00),
  (NOW() - INTERVAL '2 hours 30 minutes', 905.00, 935.00, 1840.00),
  (NOW() - INTERVAL '2 hours 15 minutes', 930.00, 960.00, 1890.00),
  (NOW() - INTERVAL '2 hours', 910.00, 1015.00, 1925.00),
  (NOW() - INTERVAL '1 hour 45 minutes', 870.00, 1085.00, 1955.00),
  (NOW() - INTERVAL '1 hour 30 minutes', 820.00, 1160.00, 1980.00),
  (NOW() - INTERVAL '1 hour 15 minutes', 760.00, 1235.00, 1995.00),
  (NOW() - INTERVAL '1 hour', 710.00, 1290.00, 2000.00),
  (NOW() - INTERVAL '45 minutes', 660.00, 1350.00, 2010.00),
  (NOW() - INTERVAL '30 minutes', 615.00, 1415.00, 2030.00),
  (NOW() - INTERVAL '15 minutes', 570.00, 1480.00, 2050.00),
  (NOW() - INTERVAL '5 minutes', 540.00, 1525.00, 2065.00);

-- Recent anomaly history from deployed optical monitoring nodes.
INSERT INTO "Anomaly_Alerts" (timestamp, node_id, alert_type, confidence_score, payload_json) VALUES
  (NOW() - INTERVAL '7 hours', 'node-hq-inlet-01', 'Foreign Object', 0.812, '{"frame": 1180, "label": "leaf_cluster", "severity": "medium", "site": "HQ Campus", "workflow": "manual-review"}'),
  (NOW() - INTERVAL '6 hours 20 minutes', 'node-plant-line-02', 'Severe Discoloration', 0.846, '{"frame": 1544, "label": "sediment_plume", "severity": "high", "site": "Processing Plant", "workflow": "flush-line"}'),
  (NOW() - INTERVAL '5 hours 50 minutes', 'node-east-feed-01', 'Pipe Blockage', 0.891, '{"frame": 1887, "label": "debris_cluster", "severity": "high", "site": "Distribution East", "workflow": "dispatch-maintenance"}'),
  (NOW() - INTERVAL '5 hours 5 minutes', 'node-hq-inlet-01', 'Contaminant Detected', 0.774, '{"frame": 2311, "label": "surface_residue", "severity": "medium", "site": "HQ Campus", "workflow": "sample-collection"}'),
  (NOW() - INTERVAL '4 hours 25 minutes', 'node-west-yard-03', 'Foreign Object', 0.834, '{"frame": 2760, "label": "plastic_fragment", "severity": "medium", "site": "Warehouse West", "workflow": "line-inspection"}'),
  (NOW() - INTERVAL '3 hours 40 minutes', 'node-plant-line-02', 'Pipe Blockage', 0.927, '{"frame": 3199, "label": "silt_accumulation", "severity": "critical", "site": "Processing Plant", "workflow": "maintenance-escalation"}'),
  (NOW() - INTERVAL '2 hours 55 minutes', 'node-east-feed-01', 'Severe Discoloration', 0.803, '{"frame": 3624, "label": "rust_stain", "severity": "medium", "site": "Distribution East", "workflow": "line-flush"}'),
  (NOW() - INTERVAL '2 hours 10 minutes', 'node-campus-loop-04', 'Foreign Object', 0.758, '{"frame": 4018, "label": "organic_debris", "severity": "medium", "site": "South Campus", "workflow": "inspect-chamber"}'),
  (NOW() - INTERVAL '1 hour 25 minutes', 'node-hq-inlet-01', 'Contaminant Detected', 0.881, '{"frame": 4470, "label": "chemical_sheen", "severity": "high", "site": "HQ Campus", "workflow": "quality-team-notified"}'),
  (NOW() - INTERVAL '52 minutes', 'node-west-yard-03', 'Severe Discoloration', 0.792, '{"frame": 4832, "label": "turbid_stream", "severity": "medium", "site": "Warehouse West", "workflow": "sample-collection"}'),
  (NOW() - INTERVAL '21 minutes', 'node-plant-line-02', 'Pipe Blockage', 0.943, '{"frame": 5211, "label": "screen_obstruction", "severity": "critical", "site": "Processing Plant", "workflow": "crew-en-route"}'),
  (NOW() - INTERVAL '6 minutes', 'node-east-feed-01', 'Contaminant Detected', 0.867, '{"frame": 5598, "label": "oil_sheen", "severity": "high", "site": "Distribution East", "workflow": "automatic-isolation"}');
