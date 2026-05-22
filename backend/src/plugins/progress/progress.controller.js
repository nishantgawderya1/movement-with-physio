'use strict';

const apiResponse = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');

/**
 * Progress controller factory. Patient-facing — strictly self-scoped.
 * Reads only req.user.id (Clerk session ID); no client-supplied target id.
 *
 * Therapist-side views live in ./therapistProgress.controller, which gates
 * on a CONFIRMED/COMPLETED booking relationship via Booking.exists.
 *
 * @param {object} progressService
 */
function createController(progressService) {
  /**
   * GET /api/v1/progress/summary
   * The authenticated patient's overall progress summary.
   */
  const getSummary = asyncHandler(async (req, res) => {
    const data = await progressService.getPatientProgress(req.user.id);
    return apiResponse.success(res, data);
  });

  /**
   * GET /api/v1/progress/exercises
   * The authenticated patient's per-exercise completion statistics.
   */
  const getExerciseStats = asyncHandler(async (req, res) => {
    const data = await progressService.getExerciseStats(req.user.id);
    return apiResponse.success(res, data);
  });

  /**
   * GET /api/v1/progress/trends
   * The authenticated patient's weekly trend data (last 12 weeks).
   */
  const getTrends = asyncHandler(async (req, res) => {
    const data = await progressService.getTrends(req.user.id);
    return apiResponse.success(res, data);
  });

  /**
   * GET /api/v1/progress/export
   * Full JSON progress export for the authenticated patient. Filename uses
   * a date stamp only — no identifier echoed in Content-Disposition.
   */
  const exportProgress = asyncHandler(async (req, res) => {
    const data = await progressService.exportProgress(req.user.id);
    const dateStamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="progress-${dateStamp}.json"`);
    return apiResponse.success(res, data);
  });

  return { getSummary, getExerciseStats, getTrends, exportProgress };
}

module.exports = { createController };
