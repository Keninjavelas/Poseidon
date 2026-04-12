'use strict';

const { logger } = require('./lib/logger');
const { getEnv } = require('./config/env');

const REQUIRED_ENV_VARS = ['DATABASE_URL', 'MQTT_BROKER_URL', 'WS_PORT', 'CORS_ORIGIN'];

function validateEnv(env = process.env) {
  const missing = REQUIRED_ENV_VARS.filter((name) => !env[name]);
  for (const name of missing) {
    console.error(`[FATAL] Missing required environment variable: ${name}. Exiting.`);
  }
  if (missing.length > 0) {
    process.exit(1);
  }
}

function startServer() {
  validateEnv();
  const env = getEnv();
  const { startApiService } = require('./services/apiService');

  return startApiService(env, logger);
}

// Only start the server when this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { validateEnv, startServer };
