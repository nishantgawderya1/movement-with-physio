'use strict';

const therapistService = require('./therapist.service');
const { container } = require('../../container');
const apiResponse = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const { NOTIFICATION_TYPES } = require('../../core/utils/constants');
const { addJob } = require('../../core/jobs/jobQueue');

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
  const { specialty, cursor, limit } = req.query;
  const result = await therapistService.listTherapists({ specialty, cursor, limit: Number(limit) });
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

module.exports = { getProfile, updateProfile, listTherapists, getTherapistById, verifyTherapist };
