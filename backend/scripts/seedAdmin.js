'use strict';

require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const { connect, disconnect } = require('../src/config/database');
const User = require('../src/models/User.model');
const logger = require('../src/core/utils/logger');

async function seed() {
  await connect(process.env.MONGODB_URI);

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminName = process.env.ADMIN_NAME;

  if (!adminEmail) {
    logger.error({ event: 'SEED_FAILED', reason: 'ADMIN_EMAIL not set' });
    process.exit(1);
  }

  const existing = await User.findOne({ email: adminEmail });
  if (existing) {
    logger.info({ event: 'SEED_SKIP', reason: 'Admin already exists', email: adminEmail });
    await disconnect();
    return;
  }

  await User.create({
    email: adminEmail,
    name: adminName || 'MWP Admin',
    role: 'admin',
    isVerified: true,
    onboardingCompleted: true,
  });

  logger.info({ event: 'ADMIN_SEEDED', email: adminEmail });
  await disconnect();
}

seed().catch((err) => {
  logger.error({ event: 'SEED_ERROR', err: err.message });
  process.exit(1);
});
