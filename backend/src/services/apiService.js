'use strict';

const http = require('http');
const createApp = require('../app');
const { createWsServer } = require('./wsServer');
const { createRedisBus } = require('../lib/redisBus');
const { query } = require('./db');

async function startApiService(env, logger) {
  const app = createApp();
  const server = http.createServer(app);
  const wsServer = createWsServer(server);
  const redisBus = createRedisBus(env.REDIS_URL, logger);

  await redisBus.subscribe('poseidon:processed', (event) => {
    if (!event?.channel || event.data === undefined) return;
    wsServer.broadcast(event.channel, event.data);
  });

  await redisBus.subscribe('poseidon:alerts', (event) => {
    if (!event?.channel || event.data === undefined) return;
    wsServer.broadcast(event.channel, event.data);
  });

  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'API service listening');
  });

  async function shutdown() {
    await redisBus.close();
    await new Promise((resolve) => server.close(resolve));
  }

  process.once('SIGINT', () => shutdown().finally(() => process.exit(0)));
  process.once('SIGTERM', () => shutdown().finally(() => process.exit(0)));

  return { server, wsServer, redisBus, query, shutdown };
}

module.exports = { startApiService };