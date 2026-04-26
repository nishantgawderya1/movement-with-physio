'use strict';

const User = require('../../models/User.model');
const cacheManager = require('../../core/cache/cacheManager');
const paginate = require('../../core/utils/paginator');
const { REDIS_TTL } = require('../../core/utils/constants');
const logger = require('../../core/utils/logger');

/**
 * Get therapist profile (with Redis cache).
 */
async function getProfile(clerkId) {
  const cacheKey = `therapist:profile:${clerkId}`;
  const cached = await cacheManager.get(cacheKey);
  if (cached) return cached;

  const user = await User.findOne({ clerkId, role: 'therapist' }).lean();
  if (!user) return null;

  await cacheManager.set(cacheKey, user, REDIS_TTL.USER_PROFILE);
  return user;
}

/**
 * Update therapist profile and invalidate cache.
 */
async function updateProfile(clerkId, updates) {
  const user = await User.findOneAndUpdate(
    { clerkId, role: 'therapist' },
    updates,
    { new: true, runValidators: true }
  ).lean();

  if (user) {
    await cacheManager.invalidate(`therapist:profile:${clerkId}`);
  }
  return user;
}

/**
 * List all verified therapists (paginated).
 * @param {{ specialty?: string, cursor?: string, limit?: number }} filters
 */
async function listTherapists({ specialty, cursor, limit } = {}) {
  const query = { role: 'therapist', isVerified: true };
  if (specialty) query.specialty = specialty;

  return paginate(User, query, {
    cursor,
    limit,
    sort: { rating: -1, _id: -1 },
    select: 'name specialty rating isVerified createdAt',
  });
}

/**
 * Admin: verify a therapist.
 */
async function verifyTherapist(therapistId) {
  const therapist = await User.findByIdAndUpdate(
    therapistId,
    { isVerified: true, verifiedAt: new Date() },
    { new: true }
  );

  if (!therapist) throw Object.assign(new Error('Therapist not found'), { statusCode: 404 });

  await cacheManager.invalidate(`therapist:profile:${therapist.clerkId}`);
  logger.info({ event: 'THERAPIST_VERIFIED', therapistId });
  return therapist;
}

module.exports = { getProfile, updateProfile, listTherapists, verifyTherapist };
