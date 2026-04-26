'use strict';

const exerciseService = require('./exercise.service');
const apiResponse = require('../../../core/utils/apiResponse');
const asyncHandler = require('../../../core/utils/asyncHandler');

/**
 * Factory: creates controller bound to a storage provider from DI.
 * @param {object} container
 */
function createController(container) {
  const getStorage = () => container.storage;

  const listExercises = asyncHandler(async (req, res) => {
    const { bodyPart, difficulty, cursor, limit } = req.query;
    const result = await exerciseService.listExercises({ bodyPart, difficulty, cursor, limit: Number(limit) || 20 });
    return apiResponse.paginated(res, result.data, result.pagination);
  });

  const getExercise = asyncHandler(async (req, res) => {
    const exercise = await exerciseService.getExercise(req.params.id, getStorage());
    if (!exercise) return apiResponse.error(res, 'Exercise not found', 404, req.correlationId);
    return apiResponse.success(res, exercise);
  });

  const refreshVideoUrl = asyncHandler(async (req, res) => {
    const url = await exerciseService.getVideoSignedUrl(req.params.id, getStorage());
    return apiResponse.success(res, { videoUrl: url });
  });

  const createExercise = asyncHandler(async (req, res) => {
    const data = { ...req.body, createdBy: req.user._id || req.user.id };
    const exercise = await exerciseService.createExercise(data);
    return apiResponse.success(res, exercise, 201);
  });

  const updateExercise = asyncHandler(async (req, res) => {
    const exercise = await exerciseService.updateExercise(req.params.id, req.body);
    return apiResponse.success(res, exercise);
  });

  const deleteExercise = asyncHandler(async (req, res) => {
    await exerciseService.deleteExercise(req.params.id);
    return apiResponse.success(res, { deleted: true });
  });

  const assignExercise = asyncHandler(async (req, res) => {
    const { patientId } = req.body;
    const therapistId = req.user._id || req.user.id;
    const result = await exerciseService.assignExercise(req.params.id, patientId, therapistId);
    return apiResponse.success(res, result, 201);
  });

  const completeExercise = asyncHandler(async (req, res) => {
    const { sessionId, ...exerciseData } = req.body;
    const session = await exerciseService.completeExercise(sessionId, {
      exerciseId: req.params.id,
      ...exerciseData,
    });
    return apiResponse.success(res, session);
  });

  const getByBodyPart = asyncHandler(async (req, res) => {
    const result = await exerciseService.listExercises({ bodyPart: req.params.bodyPart });
    return apiResponse.paginated(res, result.data, result.pagination);
  });

  return {
    listExercises,
    getExercise,
    refreshVideoUrl,
    createExercise,
    updateExercise,
    deleteExercise,
    assignExercise,
    completeExercise,
    getByBodyPart,
  };
}

module.exports = { createController };
