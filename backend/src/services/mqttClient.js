'use strict';

const mqtt = require('mqtt');

// Required fields per topic
const REQUIRED_FIELDS = {
  'poseidon/sensors/rainfall': ['timestamp', 'precipitation_rate_mm_hr', 'station_id'],
  'poseidon/sensors/tanks': ['timestamp', 'tank_id', 'volume_liters', 'capacity_liters'],
  'poseidon/sensors/quality': ['timestamp', 'sensor_id', 'ph', 'tds_ppm', 'turbidity_ntu'],
  'poseidon/sensors/irrigation': ['timestamp', 'zone_id', 'soil_moisture_percent', 'irrigation_demand_liters', 'water_source'],
  'poseidon/sensors/usage': ['timestamp', 'municipal_liters', 'harvested_liters', 'total_liters'],
  'poseidon/alerts/optical': ['timestamp', 'node_id', 'alert_type', 'confidence_score'],
};

/**
 * Validates that all required fields are present in the payload for a given topic.
 *
 * @param {string} topic
 * @param {object} payload
 * @returns {boolean}
 */
function validatePayload(topic, payload) {
  const required = REQUIRED_FIELDS[topic];
  if (!required) return false;
  for (const field of required) {
    if (payload[field] === undefined || payload[field] === null) {
      return false;
    }
  }
  return true;
}

/**
 * Handles an incoming MQTT message: parses JSON, validates, inserts to DB, and broadcasts.
 *
 * @param {string} topic
 * @param {Buffer} message
 * @param {Function} dbQuery
 * @param {Function} broadcast
 */
async function handleMessage(topic, message, dbQuery, broadcast) {
  const rawMessage = message.toString();
  let payload;

  try {
    payload = JSON.parse(rawMessage);
  } catch (err) {
    console.error('[MQTT] Parse error on topic', topic, ':', rawMessage);
    return;
  }

  if (!validatePayload(topic, payload)) {
    console.error('[MQTT] Invalid payload on topic', topic, ':', rawMessage);
    return;
  }

  try {
    switch (topic) {
      case 'poseidon/sensors/rainfall': {
        await dbQuery(
          'INSERT INTO "Rainfall_Log" (timestamp, precipitation_rate_mm_hr, station_id) VALUES ($1, $2, $3)',
          [payload.timestamp, payload.precipitation_rate_mm_hr, payload.station_id]
        );
        broadcast('rainfall', payload);
        break;
      }
      case 'poseidon/sensors/tanks': {
        await dbQuery(
          'INSERT INTO "Storage_Tanks" (timestamp, tank_id, volume_liters, capacity_liters) VALUES ($1, $2, $3, $4)',
          [payload.timestamp, payload.tank_id, payload.volume_liters, payload.capacity_liters]
        );
        broadcast('tanks', payload);
        break;
      }
      case 'poseidon/sensors/quality': {
        await dbQuery(
          'INSERT INTO "Quality_Sensors" (timestamp, sensor_id, ph, tds_ppm, turbidity_ntu) VALUES ($1, $2, $3, $4, $5)',
          [payload.timestamp, payload.sensor_id, payload.ph, payload.tds_ppm, payload.turbidity_ntu]
        );
        broadcast('quality', payload);
        break;
      }
      case 'poseidon/sensors/irrigation': {
        await dbQuery(
          'INSERT INTO "Irrigation_Zones" (timestamp, zone_id, soil_moisture_percent, irrigation_demand_liters, water_source) VALUES ($1, $2, $3, $4, $5)',
          [payload.timestamp, payload.zone_id, payload.soil_moisture_percent, payload.irrigation_demand_liters, payload.water_source]
        );
        broadcast('irrigation', payload);
        break;
      }
      case 'poseidon/sensors/usage': {
        await dbQuery(
          'INSERT INTO "Overall_Usage" (timestamp, municipal_liters, harvested_liters, total_liters) VALUES ($1, $2, $3, $4)',
          [payload.timestamp, payload.municipal_liters, payload.harvested_liters, payload.total_liters]
        );
        broadcast('usage', payload);
        break;
      }
      case 'poseidon/alerts/optical': {
        await dbQuery(
          'INSERT INTO "Anomaly_Alerts" (timestamp, node_id, alert_type, confidence_score, payload_json) VALUES ($1, $2, $3, $4, $5)',
          [payload.timestamp, payload.node_id, payload.alert_type, payload.confidence_score, JSON.stringify(payload)]
        );
        broadcast('alerts', payload);
        break;
      }
      default:
        console.warn('[MQTT] Received message on unhandled topic:', topic);
        break;
    }
  } catch (err) {
    console.error('[MQTT] DB insert error on topic', topic, ':', err.message);
  }
}

/**
 * Creates and connects an MQTT client that subscribes to sensor and alert topics.
 *
 * @param {string} mqttUrl - The MQTT broker URL
 * @param {Function} dbQuery - DB query function (sql, params) => Promise
 * @param {Function} broadcast - WebSocket broadcast function (channel, data) => void
 * @returns {import('mqtt').MqttClient}
 */
function createMqttClient(mqttUrl, dbQuery, broadcast) {
  const client = mqtt.connect(mqttUrl, { reconnectPeriod: 5000 });

  client.on('connect', () => {
    console.log('[MQTT] Connected to broker:', mqttUrl);
    client.subscribe('poseidon/sensors/#', (err) => {
      if (err) console.error('[MQTT] Subscribe error (sensors):', err.message);
    });
    client.subscribe('poseidon/alerts/#', (err) => {
      if (err) console.error('[MQTT] Subscribe error (alerts):', err.message);
    });
  });

  client.on('message', (topic, message) => {
    handleMessage(topic, message, dbQuery, broadcast).catch((err) => {
      console.error('[MQTT] Unhandled error in handleMessage:', err.message);
    });
  });

  client.on('error', (err) => {
    console.error('[MQTT] Client error:', err.message);
  });

  return client;
}

module.exports = { createMqttClient, handleMessage };
