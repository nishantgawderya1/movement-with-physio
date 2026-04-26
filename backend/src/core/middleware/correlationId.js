'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Correlation ID middleware.
 *
 * Reads X-Correlation-ID from the request header (for tracing from client)
 * or generates a fresh UUID.
 * Attaches to req.correlationId and echoes it back in the response header.
 */
function correlationId(req, res, next) {
  const id = req.headers['x-correlation-id'] || uuidv4();
  req.correlationId = id;
  res.setHeader('X-Correlation-ID', id);
  next();
}

module.exports = correlationId;
