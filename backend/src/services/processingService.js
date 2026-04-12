'use strict';

const { parseModuleEvent } = require('../../../shared/contracts/events');
const { createBatchWriter } = require('./batchWriter');

const TABLE_BY_MODULE = {
  rainfall: 'Rainfall_Log',
  harvesting: 'Storage_Tanks',
  quality: 'Quality_Sensors',
  agriculture: 'Irrigation_Zones',
  usage: 'Overall_Usage',
  alerts: 'Anomaly_Alerts',
};

const CHANNEL_BY_MODULE = {
  rainfall: 'rainfall',
  harvesting: 'tanks',
  quality: 'quality',
  agriculture: 'irrigation',
  usage: 'usage',
  alerts: 'alerts',
};

function columnsFor(moduleName) {
  switch (moduleName) {
    case 'rainfall':
      return ['timestamp', 'precipitation_rate_mm_hr', 'station_id', 'sensor_id', 'message_id'];
    case 'harvesting':
      return ['timestamp', 'tank_id', 'volume_liters', 'capacity_liters', 'fill_percent', 'sensor_id', 'message_id'];
    case 'quality':
      return ['timestamp', 'sensor_id', 'ph', 'tds_ppm', 'turbidity_ntu', 'alert_level', 'message_id'];
    case 'agriculture':
      return ['timestamp', 'zone_id', 'soil_moisture_percent', 'irrigation_demand_liters', 'water_source', 'sensor_id', 'message_id'];
    case 'usage':
      return ['timestamp', 'municipal_liters', 'harvested_liters', 'total_liters', 'sensor_id', 'message_id'];
    case 'alerts':
      return ['timestamp', 'node_id', 'alert_type', 'confidence_score', 'payload_json', 'sensor_id', 'message_id'];
    default:
      return [];
  }
}

function rowFor(moduleName, payload) {
  switch (moduleName) {
    case 'rainfall':
      return {
        timestamp: payload.timestamp,
        precipitation_rate_mm_hr: payload.precipitation_rate_mm_hr,
        station_id: payload.station_id,
        sensor_id: payload.sensor_id,
        message_id: payload.message_id || payload.messageId || payload.sensor_id,
      };
    case 'harvesting':
      return {
        timestamp: payload.timestamp,
        tank_id: payload.tank_id,
        volume_liters: payload.volume_liters,
        capacity_liters: payload.capacity_liters,
        fill_percent: payload.fill_percent,
        sensor_id: payload.sensor_id,
        message_id: payload.message_id || payload.sensor_id,
      };
    case 'quality':
      return {
        timestamp: payload.timestamp,
        sensor_id: payload.sensor_id,
        ph: payload.ph,
        tds_ppm: payload.tds_ppm,
        turbidity_ntu: payload.turbidity_ntu,
        alert_level: payload.alert_level,
        message_id: payload.message_id || payload.sensor_id,
      };
    case 'agriculture':
      return {
        timestamp: payload.timestamp,
        zone_id: payload.zone_id,
        soil_moisture_percent: payload.soil_moisture_percent,
        irrigation_demand_liters: payload.irrigation_demand_liters,
        water_source: payload.water_source,
        sensor_id: payload.sensor_id,
        message_id: payload.message_id || payload.sensor_id,
      };
    case 'usage':
      return {
        timestamp: payload.timestamp,
        municipal_liters: payload.municipal_liters,
        harvested_liters: payload.harvested_liters,
        total_liters: payload.total_liters,
        sensor_id: payload.sensor_id,
        message_id: payload.message_id || payload.sensor_id,
      };
    case 'alerts':
      return {
        timestamp: payload.timestamp,
        node_id: payload.node_id,
        alert_type: payload.alert_type,
        confidence_score: payload.confidence_score,
        payload_json: JSON.stringify(payload.raw_detection_json || payload),
        sensor_id: payload.sensor_id,
        message_id: payload.message_id || payload.sensor_id,
      };
    default:
      return {};
  }
}

function createProcessingService(env, redisBus, dbQuery, logger) {
  const batchWriter = createBatchWriter(dbQuery, logger);
  batchWriter.start();

  async function handleRawEvent(envelope) {
    if (!envelope?.module || !envelope?.payload) return;
    if (!envelope.messageId) return;

    const dedupeKey = `poseidon:dedupe:${envelope.messageId}`;
    const accepted = await redisBus.publisher.set(dedupeKey, '1', {
      NX: true,
      EX: 300,
    });

    if (!accepted) {
      logger.debug({ messageId: envelope.messageId }, 'duplicate event skipped');
      return;
    }
    const payload = typeof envelope.payload === 'string' ? JSON.parse(envelope.payload) : envelope.payload;
    const normalized = parseModuleEvent(envelope.module, {
      ...payload,
      module: envelope.module,
      sensor_id: payload.sensor_id || envelope.sensorId || envelope.module,
    });
    const tableName = TABLE_BY_MODULE[envelope.module];

    if (!tableName) return;

    const row = rowFor(envelope.module, normalized);
    const columns = columnsFor(envelope.module);
    const channel = CHANNEL_BY_MODULE[envelope.module] || envelope.module;

    await batchWriter.enqueue(tableName, columns, row);
    await redisBus.publish('poseidon:processed', {
      channel,
      data: normalized,
    });

    if (envelope.module === 'alerts') {
      await redisBus.publish('poseidon:alerts', { channel: 'alerts', data: normalized });
    }
  }

  void redisBus.subscribe('poseidon:raw', async (event) => {
    try {
      const rawPayload = event?.data || event;
      await handleRawEvent(rawPayload);
    } catch (error) {
      logger.error({ error }, 'processing failed');
    }
  });

  return { stop: () => batchWriter.stop() };
}

module.exports = { createProcessingService };