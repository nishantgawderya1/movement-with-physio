'use strict';

/**
 * Shared Jest setup. Loads .env.local for env-validated requires, then
 * boots an in-memory MongoDB instance per test process. Each test file
 * that needs the DB connection uses `beforeAll(connect)` / `afterAll(close)`
 * from this module.
 */

require('dotenv').config({ path: '.env.local' });

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod = null;

async function connect() {
  if (mongoose.connection.readyState === 1) return;
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

async function close() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
  mongod = null;
}

async function clearDb() {
  const { collections } = mongoose.connection;
  for (const name of Object.keys(collections)) {
    await collections[name].deleteMany({});
  }
}

module.exports = { connect, close, clearDb };
