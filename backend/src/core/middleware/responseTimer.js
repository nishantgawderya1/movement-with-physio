'use strict';

const logger = require('../utils/logger');

const SLOW_REQUEST_THRESHOLD_MS = 500;

/**
 * Response timer middleware.
 * Measures total request time and adds X-Response-Time header.
 * Logs a warning for slow requests (>500ms).
 */
function responseTimer(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const elapsed = Number(process.hrtime.bigint() - start) / 1e6; // ms
    const ms = elapsed.toFixed(2);
    res.setHeader('X-Response-Time', `${ms}ms`);

    if (elapsed > SLOW_REQUEST_THRESHOLD_MS) {
      logger.warn({
        event: 'SLOW_REQUEST',
        method: req.method,
        url: req.originalUrl,
        ms,
        correlationId: req.correlationId,
      });
    }
  });

  next();
}

module.exports = responseTimer;
