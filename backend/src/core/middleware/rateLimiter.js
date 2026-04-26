'use strict';

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { getClient } = require('../../config/redis');

/**
 * Default rate limiter: 100 req per 15 min per IP.
 */
const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => getClient(process.env.REDIS_URL).call(...args),
  }),
  message: { success: false, error: 'Too many requests, please try again later.' },
});

/**
 * Strict limiter for auth routes: 10 req per 15 min per IP.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => getClient(process.env.REDIS_URL).call(...args),
  }),
  message: { success: false, error: 'Too many auth attempts, please try again later.' },
  keyGenerator: (req) => req.body?.phone || req.ip,
});

module.exports = { defaultLimiter, authLimiter };
