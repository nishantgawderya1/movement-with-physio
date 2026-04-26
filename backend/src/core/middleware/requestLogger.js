'use strict';

const morgan = require('morgan');
const logger = require('../utils/logger');

// Custom Morgan token for correlation ID
morgan.token('correlation-id', (req) => req.correlationId || '-');
morgan.token('user-id', (req) => req.user?.id || '-');

/**
 * Request logger middleware using Morgan + Winston.
 * Format: method url status response-time correlationId
 */
const requestLogger = morgan(
  ':method :url :status :res[content-length]B :response-time ms cid=:correlation-id uid=:user-id',
  {
    stream: {
      write: (message) => logger.http({ event: 'HTTP_REQUEST', message: message.trim() }),
    },
    skip: (req) => req.url === '/health',
  }
);

module.exports = requestLogger;
