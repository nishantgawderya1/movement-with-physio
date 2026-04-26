'use strict';

let redis = null;

/**
 * Generic Redis cache manager.
 * Provides get/set/invalidate with pattern-based invalidation.
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
  await redis.del(key);
}

/**
 * Delete all keys matching a pattern (uses SCAN to avoid blocking).
 * @param {string} pattern - e.g. 'exercise:*'
 */
async function invalidatePattern(pattern) {
  let cursor = '0';
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = next;
    if (keys.length) await redis.del(...keys);
  } while (cursor !== '0');
}

module.exports = { init, get, set, invalidate, invalidatePattern };
