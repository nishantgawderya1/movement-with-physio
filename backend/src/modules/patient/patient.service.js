'use strict';

const User = require('../../models/User.model');
const { container } = require('../../container');
const cacheManager = require('../../core/cache/cacheManager');
const paginate = require('../../core/utils/paginator');
const { REDIS_TTL } = require('../../core/utils/constants');
const logger = require('../../core/utils/logger');

/**
 * Get patient profile (with Redis cache).
 * @param {string} clerkId
 */
async function getProfile(clerkId) {
  const cacheKey = `patient:profile:${clerkId}`;
  const cached = await cacheManager.get(cacheKey);
  if (cached) return cached;

  const user = await User.findOne({ clerkId, role: 'patient' }).lean();
  if (!user) return null;

  await cacheManager.set(cacheKey, user, REDIS_TTL.USER_PROFILE);
  return user;
}

/**
 * Update patient profile and invalidate cache.
 * @param {string} clerkId
 * @param {object} updates
 */
async function updateProfile(clerkId, updates) {
  const user = await User.findOneAndUpdate(
    { clerkId, role: 'patient' },
    updates,
    { new: true, runValidators: true }
  ).lean();

  if (user) {
    await cacheManager.invalidate(`patient:profile:${clerkId}`);
  }
  return user;
}

/**
 * Complete onboarding for a patient.
 * @param {string} clerkId
 * @param {object} profileData
 */
async function completeOnboarding(clerkId, profileData) {
  const user = await User.findOneAndUpdate(
    { clerkId },
    { ...profileData, onboardingCompleted: true },
    { new: true, upsert: false }
  );

  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  await cacheManager.invalidate(`patient:profile:${clerkId}`);
  logger.info({ event: 'PATIENT_ONBOARDING_COMPLETE', userId: user._id });
  return user;
}

module.exports = { getProfile, updateProfile, completeOnboarding };
