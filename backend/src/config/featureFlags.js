'use strict';

/**
 * Redis-backed feature flags with 10-minute in-process cache.
 *
 * Flags are stored as a JSON hash at key "featureFlags" in Redis.
 * If Redis is unavailable the cache falls back to hardcoded defaults.
 *
 * Usage:
 *   const flags = require('./featureFlags');
 *   const enabled = await flags.isEnabled('chat');
 */

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let cache = null;
let cacheAt = 0;
let redis = null;

const DEFAULTS = {
  chat: true,
  video: true,
  exercise: true,
  progress: true,
  session: true,
  notification: true,
};

/**
 * Inject the redis client (called from container/index.js).
 * @param {import('ioredis').Redis} redisClient
 */
function init(redisClient) {
  redis = redisClient;
}

/**
 * Fetch all flags (cache-busted every 10 min).
 * @returns {Promise<object>}
 */
async function getAll() {
  const now = Date.now();
  if (cache && now - cacheAt < CACHE_TTL_MS) return cache;

  try {
    const raw = await redis.get('featureFlags');
    cache = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    cache = { ...DEFAULTS };
  }

  cacheAt = now;
  return cache;
}

/**
 * Check if a specific feature flag is enabled.
 * @param {string} flag
 * @returns {Promise<boolean>}
 */
async function isEnabled(flag) {
  const flags = await getAll();
  return flags[flag] === true;
}

/**
 * Set a flag value in Redis and bust the local cache.
 * @param {string} flag
 * @param {boolean} value
 */
async function setFlag(flag, value) {
  const flags = await getAll();
  flags[flag] = value;
  await redis.set('featureFlags', JSON.stringify(flags));
  cache = null; // bust cache
}

module.exports = { init, getAll, isEnabled, setFlag };
