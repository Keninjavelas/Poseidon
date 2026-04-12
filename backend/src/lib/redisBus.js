'use strict';

const { createClient } = require('redis');

function createRedisBus(redisUrl, logger) {
  const publisher = createClient({ url: redisUrl });
  const subscriber = createClient({ url: redisUrl });

  publisher.on('error', (error) => logger.error({ error }, 'redis publisher error'));
  subscriber.on('error', (error) => logger.error({ error }, 'redis subscriber error'));

  const ready = Promise.all([publisher.connect(), subscriber.connect()]);

  async function publish(channel, event) {
    await ready;
    await publisher.publish(channel, JSON.stringify(event));
  }

  async function subscribe(channel, handler) {
    await ready;
    await subscriber.subscribe(channel, (message) => {
      try {
        handler(JSON.parse(message));
      } catch (error) {
        logger.warn({ channel, error }, 'failed to parse redis event');
      }
    });
  }

  async function close() {
    await Promise.allSettled([publisher.disconnect(), subscriber.disconnect()]);
  }

  return { publish, subscribe, close, publisher, subscriber, ready };
}

module.exports = { createRedisBus };