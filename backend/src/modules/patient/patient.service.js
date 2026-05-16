'use strict';

const User = require('../../models/User.model');
const Booking = require('../../models/Booking.model');
const TrackingSession = require('../../models/TrackingSession.model');
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

/**
 * Get dashboard data for a patient.
 * Includes upcoming bookings, recent sessions, and exercise stats.
 * @param {string} clerkId
 */
async function getDashboard(clerkId) {
  const cacheKey = `patient:dashboard:${clerkId}`;
  const cached = await cacheManager.get(cacheKey);
  if (cached) return cached;

  const user = await User.findOne({ clerkId, role: 'patient' }).lean();
  if (!user) return null;

  const [upcomingBookings, recentSessions, activeSessions] = await Promise.all([
    Booking.find({
      patientId: user._id,
      status: { $in: ['pending', 'confirmed'] },
      'slot.start': { $gte: new Date() },
    })
      .sort({ 'slot.start': 1 })
      .limit(5)
      .populate('therapistId', 'name specialty')
      .lean(),

    Booking.find({
      patientId: user._id,
      status: 'completed',
    })
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean(),

    TrackingSession.countDocuments({
      patientId: user._id,
      status: 'active',
    }),
  ]);

  const dashboard = {
    upcomingBookings,
    recentSessions,
    activeSessions,
    onboardingCompleted: user.onboardingCompleted,
  };

  await cacheManager.set(cacheKey, dashboard, REDIS_TTL.DASHBOARD);
  return dashboard;
}

/**
 * Get the therapist assigned to a patient (most recent confirmed booking's therapist).
 * @param {string} clerkId
 */
async function getAssignedTherapist(clerkId) {
  const user = await User.findOne({ clerkId, role: 'patient' }).lean();
  if (!user) return null;

  const latestBooking = await Booking.findOne({
    patientId: user._id,
    status: { $in: ['confirmed', 'completed'] },
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!latestBooking) return null;

  const therapist = await User.findById(latestBooking.therapistId)
    .select('name specialty rating isVerified')
    .lean();

  return therapist;
}

module.exports = { getProfile, updateProfile, completeOnboarding, getDashboard, getAssignedTherapist };

