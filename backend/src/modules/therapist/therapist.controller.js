'use strict';

const therapistService = require('./therapist.service');
const { container } = require('../../container');
const apiResponse = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const { NOTIFICATION_TYPES, JOB_NAMES } = require('../../core/utils/constants');
const { addJob } = require('../../core/jobs/jobQueue');
const { deleteAccount } = require('../../core/privacy/dataPrivacyService');

// Auto-clear instant availability after this many ms (no manual toggle).
const INSTANT_AVAILABILITY_AUTO_CLEAR_MS = 2 * 60 * 60 * 1000; // 2 hours

const getProfile = asyncHandler(async (req, res) => {
  const user = await therapistService.getProfile(req.user.id);
  if (!user) return apiResponse.error(res, 'Therapist not found', 404, req.correlationId);
  return apiResponse.success(res, user);
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await therapistService.updateProfile(req.user.id, req.body);
  if (!user) return apiResponse.error(res, 'Therapist not found', 404, req.correlationId);
  return apiResponse.success(res, user);
});

const listTherapists = asyncHandler(async (req, res) => {
  const { specialty, cursor, limit, includeUnverified } = req.query;
  const result = await therapistService.listTherapists({
    specialty,
    cursor,
    limit: Number(limit),
    includeUnverified: includeUnverified === 'true',
  });
  return apiResponse.paginated(res, result.data, result.pagination);
});

const searchTherapists = asyncHandler(async (req, res) => {
  const { specialty, minRating, verified, cursor, limit } = req.query;
  const result = await therapistService.searchTherapists({
    specialty,
    minRating: minRating ? Number(minRating) : undefined,
    verified: verified === 'true',
    cursor,
    limit: Number(limit) || 20,
  });
  return apiResponse.paginated(res, result.data, result.pagination);
});

const getTherapistById = asyncHandler(async (req, res) => {
  const User = require('../../models/User.model');
  const therapist = await User.findById(req.params.id)
    .select('name specialty rating isVerified createdAt')
    .lean();
  if (!therapist) return apiResponse.error(res, 'Therapist not found', 404, req.correlationId);
  return apiResponse.success(res, therapist);
});

const getMyClients = asyncHandler(async (req, res) => {
  const { cursor, limit, includeAll } = req.query;
  const result = await therapistService.getClients(req.user.id, {
    cursor,
    limit: Number(limit) || 20,
    includeAll: includeAll === 'true',
  });
  return apiResponse.paginated(res, result.data, result.pagination);
});

const getAvailability = asyncHandler(async (req, res) => {
  const availability = await therapistService.getAvailability(req.user.id);
  return apiResponse.success(res, availability);
});

const updateAvailability = asyncHandler(async (req, res) => {
  const availability = await therapistService.updateAvailability(req.user.id, req.body);
  return apiResponse.success(res, availability);
});

const getDashboard = asyncHandler(async (req, res) => {
  const dashboard = await therapistService.getDashboard(req.user.id);
  return apiResponse.success(res, dashboard);
});

const verifyTherapist = asyncHandler(async (req, res) => {
  const therapist = await therapistService.verifyTherapist(req.params.id);

  // Notify therapist
  await addJob('send_notification', {
    userId: therapist._id,
    title: 'Account Verified!',
    body: 'Your therapist account has been verified. You can now accept bookings.',
    type: NOTIFICATION_TYPES.THERAPIST_VERIFIED,
    data: { therapistId: therapist._id },
  });

  return apiResponse.success(res, { verified: true, therapistId: therapist._id });
});

const deleteTherapistAccount = asyncHandler(async (req, res) => {
  await deleteAccount(req.user.id, 'therapist', container);
  return apiResponse.success(res, { message: 'Account deleted successfully.' });
});

/**
 * PATCH /api/v1/therapists/me/instant-availability
 * Body: { availableNow: boolean }
 *
 * When turning ON, schedules an auto-clear job 2h out. The worker only flips
 * availableNow=false if availableNowSince still matches the value at enqueue
 * time, so a manual re-toggle in between won't be clobbered.
 */
const setInstantAvailability = asyncHandler(async (req, res) => {
  const { availableNow } = req.body;
  const result = await therapistService.setInstantAvailability(req.user.id, !!availableNow);

  if (result.availableNow && result.availableNowSince) {
    await addJob(
      JOB_NAMES.AUTO_CLEAR_AVAILABILITY,
      { clerkId: req.user.id, availableNowSince: result.availableNowSince.toISOString() },
      { delay: INSTANT_AVAILABILITY_AUTO_CLEAR_MS }
    );
  }

  return apiResponse.success(res, result);
});

module.exports = {
  getProfile,
  updateProfile,
  listTherapists,
  searchTherapists,
  getTherapistById,
  getMyClients,
  getAvailability,
  updateAvailability,
  getDashboard,
  verifyTherapist,
  deleteTherapistAccount,
  setInstantAvailability,
};
