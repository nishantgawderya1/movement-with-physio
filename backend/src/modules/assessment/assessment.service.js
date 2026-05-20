'use strict';

const Assessment = require('../../models/Assessment.model');
const TrackingSession = require('../../models/TrackingSession.model');
const cacheManager = require('../../core/cache/cacheManager');
const paginate = require('../../core/utils/paginator');
const { addJob } = require('../../core/jobs/jobQueue');
const {
  NOTIFICATION_TYPES, REDIS_TTL,
  ASSESSMENT_MODE, JOB_NAMES, ROLES,
} = require('../../core/utils/constants');
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
 * Validate an answer against a question's declared answerType.
 * Throws { statusCode: 400, code: 'INVALID_ANSWER' } on mismatch.
 */
function validateAnswerShape(question, answer) {
  const fail = (msg) => {
    const err = new Error(msg);
    err.statusCode = 400;
    err.code = 'INVALID_ANSWER';
    throw err;
  };

  switch (question.answerType) {
    case 'text': {
      if (typeof answer !== 'string') fail('Answer must be a string');
      if (question.required && answer.trim().length === 0) fail('Answer is required');
      break;
    }
    case 'scale': {
      const n = Number(answer);
      if (!Number.isFinite(n) || n < 0 || n > 10) fail('Answer must be a number 0–10');
      break;
    }
    case 'boolean': {
      if (typeof answer !== 'boolean') fail('Answer must be true or false');
      break;
    }
    case 'multiselect': {
      if (!Array.isArray(answer)) fail('Answer must be an array');
      const allowed = new Set((question.options || []).map(String));
      for (const v of answer) {
        if (typeof v !== 'string' || !allowed.has(v)) {
          fail(`Answer contains value not in options: ${v}`);
        }
      }
      break;
    }
    default:
      // Unknown answerType — be permissive (forward-compat)
      break;
  }
}

/**
 * Submit (or overwrite) a response to a question.
 * The controller layer is responsible for RBAC; this just performs the mutation.
 *
 * @param {string} assessmentId
 * @param {string} questionId
 * @param {*} answer
 * @param {object} [opts]
 * @param {string} [opts.answeredBy] - Mongo user id of the responder
 *   (therapist for therapist_driven, patient for patient_self).
 */
async function respondToQuestion(assessmentId, questionId, answer, { answeredBy = null } = {}) {
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

  // Must match a question that exists in this assessment.
  const question = assessment.questions.find((q) => q.questionId === questionId);
  if (!question) {
    const err = new Error(`Unknown questionId: ${questionId}`);
    err.statusCode = 400;
    err.code = 'UNKNOWN_QUESTION';
    throw err;
  }

  validateAnswerShape(question, answer);

  // Idempotent overwrite: replace existing response with same questionId.
  const idx = assessment.responses.findIndex((r) => r.questionId === questionId);
  const entry = {
    questionId,
    answer,
    answeredAt: new Date(),
    answeredBy: answeredBy || null,
  };
  if (idx >= 0) {
    assessment.responses[idx].answer = entry.answer;
    assessment.responses[idx].answeredAt = entry.answeredAt;
    assessment.responses[idx].answeredBy = entry.answeredBy;
  } else {
    assessment.responses.push(entry);
  }

  if (assessment.status === 'pending') {
    assessment.status = 'in_progress';
  }

  await assessment.save();
  return assessment;
}

/**
 * Complete an assessment. When in therapist_driven mode and no PDF has been
 * generated yet, enqueue the PDF worker job (idempotent on assessmentId).
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
  logger.info({ event: 'ASSESSMENT_COMPLETED', assessmentId, mode: assessment.mode });

  if (assessment.mode === ASSESSMENT_MODE.THERAPIST_DRIVEN && !assessment.pdfKey) {
    try {
      await addJob(
        JOB_NAMES.GENERATE_ASSESSMENT_PDF,
        { assessmentId: String(assessment._id) },
        { jobId: `pdf-${assessment._id}` } // BullMQ dedup (no ":" — BullMQ rejects colons in custom jobIds)
      );
    } catch (err) {
      logger.warn({ event: 'PDF_JOB_ENQUEUE_FAILED', source: 'completeAssessment', err: err.message });
    }
  }

  return assessment;
}

/**
 * Authorization helper — determines what the requesting user is allowed to
 * see/do on this assessment, given role + mode.
 *
 * Returns { ok: true, scope: 'full' | 'metadata' | 'patient_owner' } or
 * throws { statusCode: 403, code }.
 *
 * @param {object} assessment - mongoose doc or lean object
 * @param {{ mongoId, role }} actor
 * @param {'read'|'respond'|'complete'|'pdf'} action
 */
function authorizeAssessmentAction(assessment, actor, action) {
  const isPatient = String(assessment.patientId) === String(actor.mongoId);
  const isTherapist = assessment.therapistId && String(assessment.therapistId) === String(actor.mongoId);
  const isAdmin = actor.role === ROLES.ADMIN;

  if (!isPatient && !isTherapist && !isAdmin) {
    const e = new Error('Forbidden'); e.statusCode = 403; e.code = 'NOT_PARTICIPANT'; throw e;
  }

  if (assessment.mode === ASSESSMENT_MODE.PATIENT_SELF) {
    // Patient self: patient owns it for all actions; admin can read; therapist
    // can read (legacy behavior was no enforcement, so don't tighten further).
    if (action === 'respond' || action === 'complete') {
      if (!isPatient) {
        const e = new Error('Only the patient can respond to a self-assessment.');
        e.statusCode = 403; e.code = 'PATIENT_ONLY'; throw e;
      }
    }
    return { ok: true, scope: 'full' };
  }

  // therapist_driven
  if (action === 'respond' || action === 'complete') {
    if (!isTherapist) {
      const e = new Error('Only the assigned therapist can act on this assessment.');
      e.statusCode = 403; e.code = 'THERAPIST_ONLY'; throw e;
    }
    return { ok: true, scope: 'full' };
  }
  if (action === 'pdf') {
    if (!isTherapist && !isAdmin) {
      const e = new Error('PDF is restricted to the assigned therapist.');
      e.statusCode = 403; e.code = 'ASSESSMENT_PDF_FORBIDDEN'; throw e;
    }
    return { ok: true, scope: 'full' };
  }
  // read
  if (isTherapist || isAdmin) return { ok: true, scope: 'full' };
  // patient on therapist_driven — metadata-only view
  return { ok: true, scope: 'metadata' };
}

/**
 * Strip questions/responses out of an assessment for the metadata view.
 */
function toMetadataView(assessment) {
  const doc = typeof assessment.toObject === 'function' ? assessment.toObject() : assessment;
  return {
    _id: doc._id,
    status: doc.status,
    mode: doc.mode,
    bodyParts: doc.bodyParts,
    createdAt: doc.createdAt,
    completedAt: doc.completedAt,
    bookingId: doc.bookingId || null,
    videoCallId: doc.videoCallId || null,
    pdfGeneratedAt: doc.pdfGeneratedAt || null,
    questions: [],
    responses: [],
  };
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
  // Phase 2 — RBAC + view helpers
  authorizeAssessmentAction,
  toMetadataView,
  validateAnswerShape,
};
