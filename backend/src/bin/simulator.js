'use strict';

const mqtt = require('mqtt');
const { getEnv } = require('../config/env');
const { logger } = require('../lib/logger');
const { startTelemetrySimulator } = require('../services/telemetrySimulator');

async function main() {
  const env = getEnv();
  const client = mqtt.connect(env.MQTT_BROKER_URL, { reconnectPeriod: 5000 });
  let interval = null;
  let shutdownRegistered = false;

  client.on('connect', () => {
    logger.info({ broker: env.MQTT_BROKER_URL }, 'telemetry simulator connected');

    if (!interval) {
      interval = startTelemetrySimulator(client, env.SIM_INTERVAL_MS);
    }

    if (!shutdownRegistered) {
      const shutdown = () => {
        if (interval) {
          clearInterval(interval);
        }
        client.end(true);
        process.exit(0);
      };

      process.once('SIGINT', shutdown);
      process.once('SIGTERM', shutdown);
      shutdownRegistered = true;
    }
  });

  client.on('error', (error) => {
    logger.error({ error }, 'telemetry simulator mqtt error');
  });
}

main().catch((error) => {
  logger.error({ error }, 'failed to start telemetry simulator');
  process.exit(1);
});