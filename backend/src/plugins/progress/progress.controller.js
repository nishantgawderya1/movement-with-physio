'use strict';

const apiResponse = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');

/**
 * Progress controller factory.
 * @param {object} progressService
 */
function createController(progressService) {
  /**
   * GET /api/v1/progress/summary
   * Patient's overall progress summary.
   */
  const getSummary = asyncHandler(async (req, res) => {
    // Therapists may request a specific patient's progress
    const patientId = req.query.patientId || req.user.id;
    const data = await progressService.getPatientProgress(patientId);
    return apiResponse.success(res, data);
  });

  /**
   * GET /api/v1/progress/exercises
   * Per-exercise completion statistics.
   */
  const getExerciseStats = asyncHandler(async (req, res) => {
    const patientId = req.query.patientId || req.user.id;
    const data = await progressService.getExerciseStats(patientId);
    return apiResponse.success(res, data);
  });

  /**
   * GET /api/v1/progress/trends
   * Weekly trend data (last 12 weeks).
   */
  const getTrends = asyncHandler(async (req, res) => {
    const patientId = req.query.patientId || req.user.id;
    const data = await progressService.getTrends(patientId);
    return apiResponse.success(res, data);
  });

  /**
   * GET /api/v1/progress/export
   * Full JSON progress export.
   */
  const exportProgress = asyncHandler(async (req, res) => {
    const patientId = req.query.patientId || req.user.id;
    const data = await progressService.exportProgress(patientId);
    res.setHeader('Content-Disposition', `attachment; filename="progress-${patientId}.json"`);
    return apiResponse.success(res, data);
  });

  return { getSummary, getExerciseStats, getTrends, exportProgress };
}

module.exports = { createController };
