'use strict';

const { getEnv } = require('../config/env');
const { logger } = require('../lib/logger');
const { createRedisBus } = require('../lib/redisBus');
const { query } = require('../services/db');
const { createProcessingService } = require('../services/processingService');

async function main() {
  const env = getEnv();
  const redisBus = createRedisBus(env.REDIS_URL, logger);
  await redisBus.ready;
  const service = createProcessingService(env, redisBus, query, logger);
  const shutdown = async () => {
    service.stop();
    await redisBus.close();
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  logger.info('processing service started');
}

main().catch((error) => {
  logger.error({ error }, 'failed to start processing service');
  process.exit(1);
});