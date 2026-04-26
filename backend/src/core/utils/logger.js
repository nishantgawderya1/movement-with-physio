'use strict';

const winston = require('winston');

const { combine, timestamp, json, errors, colorize, simple } = winston.format;

const isProduction = process.env.NODE_ENV === 'production';

const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: combine(
    errors({ stack: true }),
    timestamp(),
    json()
  ),
  transports: [
    new winston.transports.Console({
      format: isProduction ? combine(timestamp(), json()) : combine(colorize(), simple()),
    }),
  ],
});

/**
 * Create a child logger with persistent context fields.
 * @param {object} meta - e.g. { correlationId, userId }
 * @returns {winston.Logger}
 */
logger.child = (meta) => logger.child(meta);

module.exports = logger;
