'use strict';

const winston = require('winston');

const { combine, timestamp, json, errors, printf, colorize } = winston.format;

const isProduction = process.env.NODE_ENV === 'production';

// Human-readable format for development.
//
// Winston 3.x binds a single-object arg (`logger.info({event:'X', key:'v'})`)
// to `info.message` as the entire object — NOT spread into top-level info
// keys. The previous printf interpolated message via `${msg}` which called
// Object.prototype.toString → "[object Object]", AND the `...meta` rest
// came up empty (winston's own metadata keys were the only siblings of
// message), so the JSON suffix never landed either. This format handles
// BOTH call shapes:
//   logger.info('some text')                     → "<ts> info: some text"
//   logger.info('some text', { key: 'v' })       → "<ts> info: some text {\"key\":\"v\"}"
//   logger.info({ event: 'X', key: 'v' })        → "<ts> info: [X] {\"key\":\"v\"}"
//   logger.error(new Error('boom'))               → "<ts> error: Error: boom\n  at ..."
// Production JSON format (winston.format.json()) is unaffected.
const devFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  // If the caller passed a single object, message IS that object; merge its
  // keys with anything winston put into meta (e.g. from a child logger).
  const fields = (message && typeof message === 'object') ? { ...message, ...meta } : meta;
  const { event: evt, ...rest } = fields;
  const msg = stack || (typeof message === 'string' ? message : '');
  // Assemble parts and join with single spaces — avoids the double-space
  // that an "always trailing-space on tag + always leading-space on JSON"
  // approach produces when both are present.
  const parts = [];
  if (evt) parts.push(`[${evt}]`);
  if (msg) parts.push(msg);
  if (Object.keys(rest).length) parts.push(JSON.stringify(rest));
  return `${ts} ${level}: ${parts.join(' ')}`;
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
