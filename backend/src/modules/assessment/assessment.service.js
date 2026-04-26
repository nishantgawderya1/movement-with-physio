'use strict';

const Assessment = require('../../models/Assessment.model');
const TrackingSession = require('../../models/TrackingSession.model');
const cacheManager = require('../../core/cache/cacheManager');
const paginate = require('../../core/utils/paginator');
const { addJob } = require('../../core/jobs/jobQueue');
const { NOTIFICATION_TYPES, REDIS_TTL } = require('../../core/utils/constants');
const logger = require('../../core/utils/logger');

// ── Default body parts supported ──────────────────────────────
const BODY_PARTS = [
  'neck', 'shoulder', 'upper_back', 'lower_back', 'hip',
  'knee', 'ankle', 'elbow', 'wrist', 'full_body',
];

// ── Default questionnaire by body part ────────────────────────
function getQuestionsForBodyPart(bodyPart) {
  const common = [
    { questionId: 'pain_level', questionText: 'Rate your current pain level (0–10)', answerType: 'scale', options: [] },
    { questionId: 'pain_duration', questionText: 'How long have you had this pain?', answerType: 'multiselect', options: ['< 1 week', '1–4 weeks', '1–3 months', '> 3 months'] },
    { questionId: 'pain_type', questionText: 'How would you describe the pain?', answerType: 'multiselect', options: ['sharp', 'dull', 'burning', 'throbbing', 'aching'] },
    { questionId: 'aggravating', questionText: 'What makes the pain worse?', answerType: 'text', options: [] },
    { questionId: 'relieving', questionText: 'What makes the pain better?', answerType: 'text', options: [] },
  ];

  const specific = {
    knee: [{ questionId: 'knee_swelling', questionText: 'Is there swelling around the knee?', answerType: 'boolean', options: [] }],
    shoulder: [{ questionId: 'shoulder_range', questionText: 'Can you raise your arm above your head?', answerType: 'boolean', options: [] }],
    lower_back: [{ questionId: 'radiculopathy', questionText: 'Do you have pain radiating to your leg?', answerType: 'boolean', options: [] }],
  };

  return [...common, ...(specific[bodyPart] || [])];
}

/**
 * Get available body parts.
 */
async function getBodyParts() {
  return BODY_PARTS;
}

/**
 * Get questionnaire for a body part (cached 24hr).
 * @param {string} bodyPart
 */
async function getQuestions(bodyPart) {
  const cacheKey = `questionnaire:${bodyPart}`;
  const cached = await cacheManager.get(cacheKey);
  if (cached) return cached;

  const questions = getQuestionsForBodyPart(bodyPart);
  await cacheManager.set(cacheKey, questions, REDIS_TTL.QUESTIONNAIRE);
  return questions;
}

/**
 * Create a new assessment session.
 */
async function createAssessment({ patientId, therapistId, bodyParts }) {
  const firstBodyPart = bodyParts?.[0] || 'full_body';
  const questions = getQuestionsForBodyPart(firstBodyPart);

  const assessment = await Assessment.create({
    patientId,
    therapistId: therapistId || null,
    bodyParts: bodyParts || [],
    questions,
    status: 'in_progress',
  });

  logger.info({ event: 'ASSESSMENT_CREATED', assessmentId: assessment._id, patientId });
  return assessment;
}

/**
 * Get a single assessment.
 */
async function getAssessment(assessmentId) {
  return Assessment.findById(assessmentId).lean();
}

/**
 * List assessments for a patient, cursor-paginated.
 */
async function listAssessments({ patientId, status, cursor, limit }) {
  const query = { patientId };
  if (status) query.status = status;
  return paginate(Assessment, query, {
    cursor,
    limit,
    sort: { createdAt: -1 },
  });
}

/**
 * Submit a response to a question.
 * @param {string} assessmentId
 * @param {string} questionId
 * @param {*} answer
 */
async function respondToQuestion(assessmentId, questionId, answer) {
  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) {
    const err = new Error('Assessment not found');
    err.statusCode = 404;
    throw err;
  }
  if (assessment.status === 'completed') {
    const err = new Error('Assessment is already completed');
    err.statusCode = 400;
    throw err;
  }

  // Upsert response
  const idx = assessment.responses.findIndex((r) => r.questionId === questionId);
  if (idx >= 0) {
    assessment.responses[idx].answer = answer;
    assessment.responses[idx].answeredAt = new Date();
  } else {
    assessment.responses.push({ questionId, answer, answeredAt: new Date() });
  }

  await assessment.save();
  return assessment;
}

/**
 * Complete an assessment.
 */
async function completeAssessment(assessmentId, { painScore, notes }) {
  const assessment = await Assessment.findByIdAndUpdate(
    assessmentId,
    {
      status: 'completed',
      completedAt: new Date(),
      painScore: painScore ?? null,
      notes: notes || null,
    },
    { new: true }
  );
  if (!assessment) {
    const err = new Error('Assessment not found');
    err.statusCode = 404;
    throw err;
  }
  logger.info({ event: 'ASSESSMENT_COMPLETED', assessmentId });
  return assessment;
}

/**
 * Get assessment history for a patient.
 */
async function getHistory({ patientId, cursor, limit }) {
  return paginate(Assessment, { patientId, status: 'completed' }, {
    cursor,
    limit,
    sort: { completedAt: -1 },
  });
}

// ── Tracking Sessions ─────────────────────────────────────────

/**
 * Create a new tracking session.
 */
async function createTrackingSession({ patientId, therapistId, bookingId, assessmentId, exercises, painScoreBefore }) {
  const session = await TrackingSession.create({
    patientId,
    therapistId: therapistId || null,
    bookingId: bookingId || null,
    assessmentId: assessmentId || null,
    exercises: exercises || [],
    painScoreBefore: painScoreBefore ?? null,
    status: 'in_progress',
  });
  logger.info({ event: 'TRACKING_SESSION_CREATED', sessionId: session._id, patientId });
  return session;
}

/**
 * Complete a tracking session.
 */
async function completeTrackingSession(sessionId, { exercises, painScoreAfter, notes }) {
  const session = await TrackingSession.findByIdAndUpdate(
    sessionId,
    {
      exercises,
      painScoreAfter: painScoreAfter ?? null,
      notes: notes || null,
      status: 'completed',
      completedAt: new Date(),
    },
    { new: true }
  );
  if (!session) {
    const err = new Error('Tracking session not found');
    err.statusCode = 404;
    throw err;
  }
  logger.info({ event: 'TRACKING_SESSION_COMPLETED', sessionId });
  return session;
}

/**
 * List tracking sessions for a patient.
 */
async function listTrackingSessions({ patientId, cursor, limit }) {
  return paginate(TrackingSession, { patientId }, {
    cursor,
    limit,
    sort: { createdAt: -1 },
  });
}

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
