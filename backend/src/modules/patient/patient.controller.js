'use strict';

const patientService = require('./patient.service');
const apiResponse = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const { deleteAccount } = require('../../core/privacy/dataPrivacyService');
const { container } = require('../../container');

/**
 * GET /api/v1/patient/profile
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = await patientService.getProfile(req.user.id);
  if (!user) return apiResponse.error(res, 'Patient not found', 404, req.correlationId);
  return apiResponse.success(res, user);
});

/**
 * PATCH /api/v1/patient/profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  const user = await patientService.updateProfile(req.user.id, req.body);
  if (!user) return apiResponse.error(res, 'Patient not found', 404, req.correlationId);
  return apiResponse.success(res, user);
});

/**
 * POST /api/v1/patient/onboarding
 */
const completeOnboarding = asyncHandler(async (req, res) => {
  const user = await patientService.completeOnboarding(req.user.id, req.body);
  return apiResponse.success(res, user, 201);
});

/**
 * DELETE /api/v1/patient/account
 * DPDP-compliant account deletion — anonymizes PII, retains medical records.
 */
const deletePatientAccount = asyncHandler(async (req, res) => {
  await deleteAccount(req.user.id, 'patient', container);
  return apiResponse.success(res, { message: 'Account deleted successfully.' });
});

module.exports = { getProfile, updateProfile, completeOnboarding, deletePatientAccount };
