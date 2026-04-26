'use strict';

const assessmentService = require('./assessment.service');
const apiResponse = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');

const getBodyParts = asyncHandler(async (req, res) => {
  const parts = await assessmentService.getBodyParts();
  return apiResponse.success(res, parts);
});

const getQuestions = asyncHandler(async (req, res) => {
  const { bodyPart } = req.params;
  const questions = await assessmentService.getQuestions(bodyPart);
  return apiResponse.success(res, questions);
});

const createAssessment = asyncHandler(async (req, res) => {
  const { bodyParts } = req.body;
  const patientId = req.user._id || req.user.id;
  const therapistId = req.body.therapistId || null;
  const assessment = await assessmentService.createAssessment({ patientId, therapistId, bodyParts });
  return apiResponse.success(res, assessment, 201);
});

const getAssessment = asyncHandler(async (req, res) => {
  const assessment = await assessmentService.getAssessment(req.params.id);
  if (!assessment) return apiResponse.error(res, 'Assessment not found', 404, req.correlationId);
  return apiResponse.success(res, assessment);
});

const listAssessments = asyncHandler(async (req, res) => {
  const { status, cursor, limit } = req.query;
  const patientId = req.user._id || req.user.id;
  const result = await assessmentService.listAssessments({ patientId, status, cursor, limit: Number(limit) || 20 });
  return apiResponse.paginated(res, result.data, result.pagination);
});

const respondToQuestion = asyncHandler(async (req, res) => {
  const { questionId, answer } = req.body;
  const assessment = await assessmentService.respondToQuestion(req.params.id, questionId, answer);
  return apiResponse.success(res, assessment);
});

const completeAssessment = asyncHandler(async (req, res) => {
  const { painScore, notes } = req.body;
  const assessment = await assessmentService.completeAssessment(req.params.id, { painScore, notes });
  return apiResponse.success(res, assessment);
});

const getHistory = asyncHandler(async (req, res) => {
  const { cursor, limit } = req.query;
  const patientId = req.user._id || req.user.id;
  const result = await assessmentService.getHistory({ patientId, cursor, limit: Number(limit) || 20 });
  return apiResponse.paginated(res, result.data, result.pagination);
});

// ── Tracking Sessions ─────────────────────────────────────────

const createTrackingSession = asyncHandler(async (req, res) => {
  const patientId = req.user._id || req.user.id;
  const { bookingId, assessmentId, exercises, painScoreBefore } = req.body;
  const session = await assessmentService.createTrackingSession({
    patientId,
    bookingId,
    assessmentId,
    exercises,
    painScoreBefore,
  });
  return apiResponse.success(res, session, 201);
});

const completeTrackingSession = asyncHandler(async (req, res) => {
  const { exercises, painScoreAfter, notes } = req.body;
  const session = await assessmentService.completeTrackingSession(req.params.id, { exercises, painScoreAfter, notes });
  return apiResponse.success(res, session);
});

const listTrackingSessions = asyncHandler(async (req, res) => {
  const { cursor, limit } = req.query;
  const patientId = req.user._id || req.user.id;
  const result = await assessmentService.listTrackingSessions({ patientId, cursor, limit: Number(limit) || 20 });
  return apiResponse.paginated(res, result.data, result.pagination);
});

module.exports = {
  getBodyParts,
  getQuestions,
  createAssessment,
  getAssessment,
  listAssessments,
  respondToQuestion,
  completeAssessment,
  getHistory,
  createTrackingSession,
  completeTrackingSession,
  listTrackingSessions,
};
