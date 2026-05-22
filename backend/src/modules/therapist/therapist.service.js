'use strict';

const User = require('../../models/User.model');
const Booking = require('../../models/Booking.model');
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
async function listTherapists({ specialty, cursor, limit, includeUnverified } = {}) {
  const query = { role: 'therapist' };
  if (!includeUnverified) query.isVerified = true;
  if (specialty) query.specialty = specialty;

  return paginate(User, query, {
    cursor,
    limit,
    sort: { rating: -1, _id: -1 },
    select: 'name email specialty rating isVerified createdAt',
  });
}

/**
 * Search therapists by specialty, rating, verified status.
 */
async function searchTherapists({ specialty, minRating, verified, cursor, limit } = {}) {
  const query = { role: 'therapist' };
  if (specialty) query.specialty = { $regex: specialty, $options: 'i' };
  if (minRating) query.rating = { $gte: minRating };
  if (verified !== undefined) query.isVerified = verified;

  return paginate(User, query, {
    cursor,
    limit,
    sort: { rating: -1, _id: -1 },
    select: 'name specialty rating isVerified createdAt',
  });
}

/**
 * Get therapist's clients — patients with confirmed/completed bookings.
 */
async function getClients(clerkId, { cursor, limit, includeAll } = {}) {
  const therapist = await User.findOne({ clerkId, role: 'therapist' }).lean();
  if (!therapist) return { data: [], pagination: { hasNext: false, cursor: null } };

  // Build the patient filter. By default, only patients with a
  // confirmed/completed booking with this therapist. When includeAll is set
  // (used by the chat "new conversation" picker), return every patient so
  // the therapist can start a thread without a prior booking.
  let filter;
  if (includeAll) {
    filter = { role: 'patient' };
  } else {
    const patientIds = await Booking.distinct('patientId', {
      therapistId: therapist._id,
      status: { $in: ['confirmed', 'completed'] },
    });
    filter = { _id: { $in: patientIds }, role: 'patient' };
  }

  return paginate(User, filter, {
    cursor,
    limit,
    select: 'name email onboardingCompleted createdAt',
    sort: { createdAt: -1 },
  });
}

/**
 * Get therapist availability (stored as embedded field or separate collection).
 * For now returns from user profile.
 */
async function getAvailability(clerkId) {
  const therapist = await User.findOne({ clerkId, role: 'therapist' })
    .select('availability')
    .lean();
  return therapist?.availability || { slots: [], timezone: 'Asia/Kolkata' };
}

/**
 * Update therapist availability.
 */
async function updateAvailability(clerkId, availabilityData) {
  const user = await User.findOneAndUpdate(
    { clerkId, role: 'therapist' },
    { availability: availabilityData },
    { new: true, runValidators: true }
  ).lean();
  if (user) {
    await cacheManager.invalidate(`therapist:profile:${clerkId}`);
  }
  return user?.availability || availabilityData;
}

/**
 * Get therapist dashboard — upcoming bookings, client count, recent sessions.
 */
async function getDashboard(clerkId) {
  const cacheKey = `therapist:dashboard:${clerkId}`;
  const cached = await cacheManager.get(cacheKey);
  if (cached) return cached;

  const therapist = await User.findOne({ clerkId, role: 'therapist' }).lean();
  if (!therapist) return null;

  const [upcomingBookings, totalClients, completedSessions] = await Promise.all([
    Booking.find({
      therapistId: therapist._id,
      status: { $in: ['pending', 'confirmed'] },
      'slot.start': { $gte: new Date() },
    })
      .sort({ 'slot.start': 1 })
      .limit(10)
      .populate('patientId', 'name')
      .lean(),

    Booking.distinct('patientId', {
      therapistId: therapist._id,
      status: { $in: ['confirmed', 'completed'] },
    }).then((ids) => ids.length),

    Booking.countDocuments({
      therapistId: therapist._id,
      status: 'completed',
    }),
  ]);

  const dashboard = {
    upcomingBookings,
    totalClients,
    completedSessions,
    isVerified: therapist.isVerified,
    rating: therapist.rating,
  };

  await cacheManager.set(cacheKey, dashboard, REDIS_TTL.DASHBOARD);
  return dashboard;
}

/**
 * Toggle a therapist's instant-call availability.
 * - Sets availableNow + availableNowSince (or clears the timestamp when off).
 * - When turning ON, returns the new availableNowSince timestamp so the
 *   caller can schedule the auto-clear job tied to that exact value.
 *
 * @param {string} clerkId
 * @param {boolean} availableNow
 * @returns {Promise<{ availableNow, availableNowSince }>}
 */
async function setInstantAvailability(clerkId, availableNow) {
  const update = availableNow
    ? { availableNow: true, availableNowSince: new Date() }
    : { availableNow: false, availableNowSince: null };

  const user = await User.findOneAndUpdate(
    { clerkId, role: 'therapist' },
    update,
    { new: true, runValidators: true }
  ).select('availableNow availableNowSince').lean();

  if (!user) {
    const err = new Error('Therapist not found');
    err.statusCode = 404;
    throw err;
  }

  await cacheManager.invalidate(`therapist:profile:${clerkId}`);
  logger.info({
    event: 'THERAPIST_INSTANT_AVAILABILITY',
    clerkId,
    availableNow: user.availableNow,
    availableNowSince: user.availableNowSince,
  });

  return { availableNow: user.availableNow, availableNowSince: user.availableNowSince };
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

module.exports = {
  getProfile,
  updateProfile,
  listTherapists,
  searchTherapists,
  getClients,
  getAvailability,
  updateAvailability,
  getDashboard,
  verifyTherapist,
  setInstantAvailability,
};
