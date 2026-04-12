CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS "Rainfall_Log" (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  precipitation_rate_mm_hr NUMERIC(6,2) NOT NULL,
  station_id VARCHAR(64) NOT NULL,
  sensor_id VARCHAR(64),
  source_module VARCHAR(32) DEFAULT 'rainfall',
  message_id TEXT,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Storage_Tanks" (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tank_id VARCHAR(64) NOT NULL,
  volume_liters NUMERIC(10,2) NOT NULL,
  capacity_liters NUMERIC(10,2) NOT NULL,
  fill_percent NUMERIC(6,2),
  sensor_id VARCHAR(64),
  source_module VARCHAR(32) DEFAULT 'harvesting',
  message_id TEXT,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Quality_Sensors" (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sensor_id VARCHAR(64) NOT NULL,
  ph NUMERIC(4,2) NOT NULL,
  tds_ppm NUMERIC(7,2) NOT NULL,
  turbidity_ntu NUMERIC(6,2) NOT NULL,
  alert_level VARCHAR(16) NOT NULL DEFAULT 'normal',
  source_module VARCHAR(32) DEFAULT 'quality',
  message_id TEXT,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Irrigation_Zones" (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  zone_id VARCHAR(64) NOT NULL,
  soil_moisture_percent NUMERIC(5,2) NOT NULL,
  irrigation_demand_liters NUMERIC(10,2) NOT NULL,
  water_source VARCHAR(16) NOT NULL,
  sensor_id VARCHAR(64),
  source_module VARCHAR(32) DEFAULT 'agriculture',
  message_id TEXT,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Overall_Usage" (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  municipal_liters NUMERIC(12,2) NOT NULL,
  harvested_liters NUMERIC(12,2) NOT NULL,
  total_liters NUMERIC(12,2) NOT NULL,
  sensor_id VARCHAR(64),
  source_module VARCHAR(32) DEFAULT 'usage',
  message_id TEXT,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Anomaly_Alerts" (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  node_id VARCHAR(64) NOT NULL,
  alert_type VARCHAR(64) NOT NULL,
  confidence_score NUMERIC(4,3) NOT NULL,
  sensor_id VARCHAR(64),
  source_module VARCHAR(32) DEFAULT 'alerts',
  message_id TEXT,
  payload_json JSONB NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT create_hypertable('"Rainfall_Log"', 'timestamp', if_not_exists => TRUE, migrate_data => TRUE);
SELECT create_hypertable('"Storage_Tanks"', 'timestamp', if_not_exists => TRUE, migrate_data => TRUE);
SELECT create_hypertable('"Quality_Sensors"', 'timestamp', if_not_exists => TRUE, migrate_data => TRUE);
SELECT create_hypertable('"Irrigation_Zones"', 'timestamp', if_not_exists => TRUE, migrate_data => TRUE);
SELECT create_hypertable('"Overall_Usage"', 'timestamp', if_not_exists => TRUE, migrate_data => TRUE);
SELECT create_hypertable('"Anomaly_Alerts"', 'timestamp', if_not_exists => TRUE, migrate_data => TRUE);

CREATE INDEX IF NOT EXISTS idx_rainfall_ts_station ON "Rainfall_Log" (station_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_rainfall_sensor_ts ON "Rainfall_Log" (sensor_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tanks_ts_tank ON "Storage_Tanks" (tank_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_quality_ts_sensor ON "Quality_Sensors" (sensor_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_irrigation_ts_zone ON "Irrigation_Zones" (zone_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_usage_ts_sensor ON "Overall_Usage" (sensor_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_ts_node ON "Anomaly_Alerts" (node_id, timestamp DESC);

CREATE MATERIALIZED VIEW IF NOT EXISTS rainfall_daily_summary
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', timestamp) AS bucket,
  station_id,
  avg(precipitation_rate_mm_hr) AS avg_rate_mm_hr,
  max(precipitation_rate_mm_hr) AS peak_rate_mm_hr,
  count(*) AS samples
FROM "Rainfall_Log"
GROUP BY 1, 2;

CREATE MATERIALIZED VIEW IF NOT EXISTS harvesting_daily_summary
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', timestamp) AS bucket,
  tank_id,
  avg(fill_percent) AS avg_fill_percent,
  max(volume_liters) AS peak_volume_liters,
  min(volume_liters) AS min_volume_liters
FROM "Storage_Tanks"
GROUP BY 1, 2;

CREATE MATERIALIZED VIEW IF NOT EXISTS quality_hourly_summary
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', timestamp) AS bucket,
  sensor_id,
  avg(ph) AS avg_ph,
  avg(tds_ppm) AS avg_tds_ppm,
  avg(turbidity_ntu) AS avg_turbidity_ntu
FROM "Quality_Sensors"
GROUP BY 1, 2;

CREATE MATERIALIZED VIEW IF NOT EXISTS agriculture_hourly_summary
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', timestamp) AS bucket,
  zone_id,
  avg(soil_moisture_percent) AS avg_soil_moisture_percent,
  avg(irrigation_demand_liters) AS avg_irrigation_demand_liters
FROM "Irrigation_Zones"
GROUP BY 1, 2;

CREATE MATERIALIZED VIEW IF NOT EXISTS usage_daily_summary
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', timestamp) AS bucket,
  sum(municipal_liters) AS municipal_liters,
  sum(harvested_liters) AS harvested_liters,
  sum(total_liters) AS total_liters
FROM "Overall_Usage"
GROUP BY 1;

CREATE MATERIALIZED VIEW IF NOT EXISTS alerts_hourly_summary
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', timestamp) AS bucket,
  alert_type,
  count(*) AS alert_count,
  avg(confidence_score) AS avg_confidence
FROM "Anomaly_Alerts"
GROUP BY 1, 2;

SELECT add_continuous_aggregate_policy('rainfall_daily_summary',
  start_offset => INTERVAL '30 days',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour');
SELECT add_continuous_aggregate_policy('harvesting_daily_summary',
  start_offset => INTERVAL '30 days',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour');
SELECT add_continuous_aggregate_policy('quality_hourly_summary',
  start_offset => INTERVAL '30 days',
  end_offset => INTERVAL '15 minutes',
  schedule_interval => INTERVAL '15 minutes');
SELECT add_continuous_aggregate_policy('agriculture_hourly_summary',
  start_offset => INTERVAL '30 days',
  end_offset => INTERVAL '15 minutes',
  schedule_interval => INTERVAL '15 minutes');
SELECT add_continuous_aggregate_policy('usage_daily_summary',
  start_offset => INTERVAL '90 days',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour');
SELECT add_continuous_aggregate_policy('alerts_hourly_summary',
  start_offset => INTERVAL '90 days',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour');

SELECT add_retention_policy('"Rainfall_Log"', INTERVAL '180 days');
SELECT add_retention_policy('"Storage_Tanks"', INTERVAL '180 days');
SELECT add_retention_policy('"Quality_Sensors"', INTERVAL '180 days');
SELECT add_retention_policy('"Irrigation_Zones"', INTERVAL '180 days');
SELECT add_retention_policy('"Overall_Usage"', INTERVAL '365 days');
SELECT add_retention_policy('"Anomaly_Alerts"', INTERVAL '365 days');
