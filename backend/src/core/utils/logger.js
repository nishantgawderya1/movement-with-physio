'use strict';

const winston = require('winston');

const { combine, timestamp, json, errors, printf, colorize } = winston.format;

const isProduction = process.env.NODE_ENV === 'production';

// Human-readable format for development
const devFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
  const msg = stack || message || JSON.stringify(meta);
  return `${ts} ${level}: ${msg}${metaStr}`;
});

const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: combine(
    errors({ stack: true }),
    timestamp(),
    json()
  ),
  transports: [
    new winston.transports.Console({
      format: isProduction
        ? combine(timestamp(), json())
        : combine(colorize(), timestamp(), devFormat),
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
