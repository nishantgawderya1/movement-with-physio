'use strict';

const { getClient } = require('../../config/redis');
const { REDIS_TTL } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * Idempotency key middleware.
 *
 * Applied to POST /api/v1/bookings only.
 * Requires Idempotency-Key header.
 * On first request: executes normally and caches the response for 24hr.
 * On duplicate request: returns the cached response immediately.
 *
 * Redis key: idempotent:{userId}:{Idempotency-Key}
 */
async function idempotency(req, res, next) {
  const key = req.headers['idempotency-key'];

  if (!key) {
    return res.status(400).json({
      success: false,
      error: 'Idempotency-Key header is required',
      correlationId: req.correlationId,
    });
  }

  const redisKey = `idempotent:${req.user._id || req.user.id}:${key}`;
  const redis = getClient(process.env.REDIS_URL);

  try {
    const cached = await redis.get(redisKey);
    if (cached) {
      logger.info({ event: 'IDEMPOTENCY_HIT', redisKey, correlationId: req.correlationId });
      return res.status(200).json(JSON.parse(cached));
    }

    // Intercept res.json to cache successful responses
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        redis.setex(redisKey, REDIS_TTL.IDEMPOTENCY, JSON.stringify(body)).catch(() => {});
      }
      return originalJson(body);
    };

    next();
  } catch (err) {
    logger.error({ event: 'IDEMPOTENCY_ERROR', err: err.message });
    next(); // don't block on Redis errors
  }
}

module.exports = idempotency;
