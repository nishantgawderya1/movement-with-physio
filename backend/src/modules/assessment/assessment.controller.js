'use strict';

const Assessment = require('../../models/Assessment.model');
const assessmentService = require('./assessment.service');
const apiResponse = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const { resolveActor } = require('../../core/utils/resolveMongoUserId');
const { getStorage } = require('../../core/storage');

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
  const assessment = await Assessment.findById(req.params.id);
  if (!assessment) return apiResponse.error(res, 'Assessment not found', 404, req.correlationId);

  const actor = await resolveActor(req);
  const { scope } = assessmentService.authorizeAssessmentAction(assessment, actor, 'read');

  if (scope === 'metadata') {
    return apiResponse.success(res, assessmentService.toMetadataView(assessment));
  }
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

  const assessment = await Assessment.findById(req.params.id).select('mode patientId therapistId').lean();
  if (!assessment) return apiResponse.error(res, 'Assessment not found', 404, req.correlationId);

  const actor = await resolveActor(req);
  assessmentService.authorizeAssessmentAction(assessment, actor, 'respond');

  const updated = await assessmentService.respondToQuestion(
    req.params.id, questionId, answer, { answeredBy: actor.mongoId }
  );
  return apiResponse.success(res, updated);
});

const completeAssessment = asyncHandler(async (req, res) => {
  const { painScore, notes } = req.body;

  const assessment = await Assessment.findById(req.params.id).select('mode patientId therapistId').lean();
  if (!assessment) return apiResponse.error(res, 'Assessment not found', 404, req.correlationId);

  const actor = await resolveActor(req);
  assessmentService.authorizeAssessmentAction(assessment, actor, 'complete');

  const updated = await assessmentService.completeAssessment(req.params.id, { painScore, notes });
  return apiResponse.success(res, updated);
});

/**
 * GET /api/v1/assessments/:id/pdf
 * Returns:
 *   - 202 { status: 'generating' } if PDF not yet created.
 *   - 200 { status: 'ready', url } with a 5-min signed URL.
 */
const getAssessmentPdf = asyncHandler(async (req, res) => {
  const assessment = await Assessment.findById(req.params.id)
    .select('mode patientId therapistId pdfKey pdfGeneratedAt')
    .lean();
  if (!assessment) return apiResponse.error(res, 'Assessment not found', 404, req.correlationId);

  const actor = await resolveActor(req);
  assessmentService.authorizeAssessmentAction(assessment, actor, 'pdf');

  if (!assessment.pdfKey) {
    return res.status(202).json({ success: true, data: { status: 'generating' } });
  }

  const storage = getStorage();
  const url = await storage.getSignedUrl(assessment.pdfKey, { expiresInSeconds: 300 });
  return apiResponse.success(res, { status: 'ready', url, generatedAt: assessment.pdfGeneratedAt });
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
  getAssessmentPdf,
};
