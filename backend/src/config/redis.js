'use strict';

const Redis = require('ioredis');
const logger = require('../core/utils/logger');

let client;

/**
 * Returns a singleton ioredis client.
 * @param {string} url - Redis connection URL
 * @returns {Redis} ioredis client
 */
function getClient(url) {
  if (client) return client;

  client = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });

  client.on('connect', () => logger.info({ event: 'REDIS_CONNECTED' }));
  client.on('error', (err) => logger.error({ event: 'REDIS_ERROR', err: err.message }));
  client.on('close', () => logger.warn({ event: 'REDIS_CLOSED' }));

  return client;
}

/**
 * Disconnect the Redis client gracefully.
 */
async function disconnect() {
  if (client) {
    await client.quit();
    client = null;
    logger.info({ event: 'REDIS_QUIT' });
  }
}

module.exports = { getClient, disconnect };
