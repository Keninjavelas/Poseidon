'use strict';

const { getEnv } = require('../config/env');
const { logger } = require('../lib/logger');
const { createRedisBus } = require('../lib/redisBus');
const { createIngestionService } = require('../services/ingestionService');

async function main() {
  const env = getEnv();
  const redisBus = createRedisBus(env.REDIS_URL, logger);
  await redisBus.ready;
  const client = createIngestionService(env, redisBus, logger);
  const shutdown = async () => {
    client.end(true);
    await redisBus.close();
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  logger.info('ingestion service started');
}

main().catch((error) => {
  logger.error({ error }, 'failed to start ingestion service');
  process.exit(1);
});