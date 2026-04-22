'use strict';

const http = require('http');
const createApp = require('../app');
const { createWsServer } = require('./wsServer');
const { createRedisBus } = require('../lib/redisBus');
const { createDigitalTwinService } = require('./digitalTwinService');
const { query } = require('./db');

async function startApiService(env, logger) {
  const redisBus = createRedisBus(env.REDIS_URL, logger);
  const digitalTwinService = createDigitalTwinService(redisBus, logger, {
    timestepMs: env.SIM_INTERVAL_MS,
  });
  const app = createApp({ digitalTwinService });
  const server = http.createServer(app);
  const wsServer = createWsServer(server);

  await redisBus.subscribe('poseidon:processed', (event) => {
    if (!event?.channel || event.data === undefined) return;
    wsServer.broadcast(event.channel, event.data);
  });

  await redisBus.subscribe('poseidon:alerts', (event) => {
    if (!event?.channel || event.data === undefined) return;
    wsServer.broadcast(event.channel, event.data);
  });

  digitalTwinService.start();

  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'API service listening');
  });

  async function shutdown() {
    digitalTwinService.stop();
    await redisBus.close();
    await new Promise((resolve) => server.close(resolve));
  }

  process.once('SIGINT', () => shutdown().finally(() => process.exit(0)));
  process.once('SIGTERM', () => shutdown().finally(() => process.exit(0)));

  return { server, wsServer, redisBus, digitalTwinService, query, shutdown };
}

module.exports = { startApiService };