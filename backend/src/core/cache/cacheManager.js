'use strict';

const logger = require('../utils/logger');

let redis = null;

/**
 * Generic Redis cache manager.
 * Provides get/set/invalidate.
 *
 * @param {import('ioredis').Redis} redisClient
 */
function init(redisClient) {
  redis = redisClient;
  return module.exports; // allow chaining
}

/**
 * Get a cached value.
 * @param {string} key
 * @returns {Promise<*|null>}
 */
async function get(key) {
  const raw = await redis.get(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return raw; }
}

/**
 * Set a cached value.
 * @param {string} key
 * @param {*} value
 * @param {number} [ttlSeconds]
 */
async function set(key, value, ttlSeconds) {
  const serialized = JSON.stringify(value);
  if (ttlSeconds) {
    await redis.setex(key, ttlSeconds, serialized);
  } else {
    await redis.set(key, serialized);
  }
}

/**
 * Delete a specific key.
 * @param {string} key
 */
async function invalidate(key) {
  if (!redis) {
    logger.warn({ event: 'CACHE_INVALIDATE_SKIPPED', reason: 'redis_not_initialized', key });
    return;
  }
  await redis.del(key);
}

module.exports = { init, get, set, invalidate };
