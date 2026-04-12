'use strict';

const mqtt = require('mqtt');
const crypto = require('crypto');

function topicToModule(topic) {
  const parts = topic.split('/');
  return parts[1] || 'unknown';
}

function topicToSensorId(topic) {
  const parts = topic.split('/');
  return parts[2] || 'unknown-sensor';
}

function createIngestionService(env, redisBus, logger) {
  const client = mqtt.connect(env.MQTT_BROKER_URL, { reconnectPeriod: 5000 });

  client.on('connect', () => {
    logger.info({ broker: env.MQTT_BROKER_URL }, 'ingestion mqtt connected');
    client.subscribe('poseidon/+/+');
  });

  client.on('message', async (topic, message) => {
    const raw = message.toString();
    const messageId = crypto.createHash('sha256').update(topic).update(raw).digest('hex');

    await redisBus.publish('poseidon:raw', {
      channel: 'raw',
      data: {
        topic,
        module: topicToModule(topic),
        sensorId: topicToSensorId(topic),
        messageId,
        receivedAt: new Date().toISOString(),
        payload: raw,
      },
    });
  });

  client.on('error', (error) => logger.error({ error }, 'mqtt ingestion error'));

  return client;
}

module.exports = { createIngestionService };