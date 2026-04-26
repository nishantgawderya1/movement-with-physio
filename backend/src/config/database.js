'use strict';

const mongoose = require('mongoose');
const logger = require('../core/utils/logger');

const MAX_RETRIES = 10;
const RETRY_INTERVAL_MS = 3000;

async function connectWithRetry(uri, attempt = 1) {
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info({ event: 'DB_CONNECTED', uri: uri.replace(/\/\/.*@/, '//***@') });
  } catch (err) {
    if (attempt >= MAX_RETRIES) {
      logger.error({ event: 'DB_CONNECT_FAILED', attempt, err: err.message });
      throw err;
    }
    logger.warn({ event: 'DB_CONNECT_RETRY', attempt, err: err.message });
    await new Promise((r) => setTimeout(r, RETRY_INTERVAL_MS));
    return connectWithRetry(uri, attempt + 1);
  }
}

/**
 * Establish a Mongoose connection with exponential-ish retry logic.
 * @param {string} uri - MongoDB connection string
 */
async function connect(uri) {
  mongoose.connection.on('disconnected', () => {
    logger.warn({ event: 'DB_DISCONNECTED' });
  });
  mongoose.connection.on('error', (err) => {
    logger.error({ event: 'DB_ERROR', err: err.message });
  });

  await connectWithRetry(uri);
}

/**
 * Gracefully close the Mongoose connection.
 */
async function disconnect() {
  await mongoose.connection.close();
  logger.info({ event: 'DB_CLOSED' });
}

module.exports = { connect, disconnect };
