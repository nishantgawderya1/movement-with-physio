'use strict';

const apiResponse = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const { resolveActor } = require('../../core/utils/resolveMongoUserId');
const User = require('../../models/User.model');
const Booking = require('../../models/Booking.model');
const { BOOKING_STATUS } = require('../../core/utils/constants');

/**
 * Therapist-facing progress controllers. Each handler:
 *   1. Resolves the caller (route layer enforces rbac('therapist'); this is
 *      defense-in-depth to obtain the mongoId for the relationship check).
 *   2. Resolves the target patient by Clerk ID → User document. 404 if no
 *      match (treat as unknown patient, not a leak — the clerkId itself
 *      doesn't confirm existence).
 *   3. Verifies a CONFIRMED or COMPLETED booking exists between this
 *      therapist and this patient. Mirrors the S2 createNote pattern
 *      (session.service.js:40) without the per-booking _id predicate —
 *      progress aggregates across all bookings for the pair.
 *   4. Delegates to the existing progressService, which already handles
 *      Clerk → Mongo translation internally.
 */
function createTherapistController(progressService) {
  async function authorize(req) {
    const actor = await resolveActor(req);
    const patient = await User.findOne({ clerkId: req.params.patientId }).select('_id').lean();
    if (!patient) {
      const err = new Error('Patient not found');
      err.statusCode = 404;
      throw err;
    }
    const hasRelationship = await Booking.exists({
      therapistId: actor.mongoId,
      patientId: patient._id,
      status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.COMPLETED] },
      isDeleted: false,
    });
    if (!hasRelationship) {
      throw Object.assign(
        new Error('You do not have an active booking with this patient.'),
        { statusCode: 403, code: 'NO_PATIENT_RELATIONSHIP' }
      );
    }
  }

  const getSummary = asyncHandler(async (req, res) => {
    await authorize(req);
    const data = await progressService.getPatientProgress(req.params.patientId);
    return apiResponse.success(res, data);
  });

  const getExerciseStats = asyncHandler(async (req, res) => {
    await authorize(req);
    const data = await progressService.getExerciseStats(req.params.patientId);
    return apiResponse.success(res, data);
  });

  const getTrends = asyncHandler(async (req, res) => {
    await authorize(req);
    const data = await progressService.getTrends(req.params.patientId);
    return apiResponse.success(res, data);
  });

  const exportProgress = asyncHandler(async (req, res) => {
    await authorize(req);
    const data = await progressService.exportProgress(req.params.patientId);
    const dateStamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="patientProgress-${dateStamp}.json"`);
    return apiResponse.success(res, data);
  });

  return { getSummary, getExerciseStats, getTrends, exportProgress };
}

module.exports = { createTherapistController };
