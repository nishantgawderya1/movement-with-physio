'use strict';

const mongoose = require('mongoose');
const asyncHandler = require('../../core/utils/asyncHandler');
const apiResponse = require('../../core/utils/apiResponse');
const logger = require('../../core/utils/logger');
const env = require('../../config/env');
const VideoCall = require('../../models/VideoCall.model');
const Assessment = require('../../models/Assessment.model');
const User = require('../../models/User.model');
const { addJob } = require('../../core/jobs/jobQueue');
const {
  VIDEO_CALL_STATUS,
  JOB_NAMES,
  ASSESSMENT_MODE,
} = require('../../core/utils/constants');
const { getIceConfig } = require('./iceConfig.controller');

const JOIN_WINDOW_MS = () => env.VIDEO_CALL_JOIN_WINDOW_MINUTES * 60 * 1000;
const TIMEOUT_MS = () => env.VIDEO_CALL_TIMEOUT_MINUTES * 60 * 1000;

/**
 * Resolve the Mongo User._id for the request. Mirrors chat/booking helpers.
 */
async function resolveMongoUserId(req) {
  if (req.user && req.user.mongoId) return req.user.mongoId;
  const dbUser = await User.findOne({ clerkId: req.user.id }).select('_id').lean();
  if (!dbUser) {
    const err = new Error('User profile not found');
    err.statusCode = 404;
    throw err;
  }
  req.user.mongoId = String(dbUser._id);
  return req.user.mongoId;
}

/**
 * Verify the requester is a participant on the call.
 * @returns {Promise<{ call, userId }>}
 * @throws { statusCode: 404 | 403 }
 */
async function loadCallForParticipant(req) {
  const callId = req.params.callId;
  if (!mongoose.isValidObjectId(callId)) {
    const e = new Error('Invalid call id'); e.statusCode = 400; throw e;
  }
  const call = await VideoCall.findById(callId);
  if (!call) {
    const e = new Error('Video call not found'); e.statusCode = 404; throw e;
  }
  const userId = await resolveMongoUserId(req);
  const isParticipant = call.participants.some((p) => String(p) === String(userId));
  if (!isParticipant) {
    const e = new Error('Forbidden'); e.statusCode = 403; throw e;
  }
  return { call, userId };
}

/**
 * Compute whether the requester can join right now.
 * Rules:
 *   - status must be scheduled | initiated | ongoing
 *   - now must be ≥ scheduledAt - JOIN_WINDOW
 *   - if status is 'scheduled' and now > scheduledAt + TIMEOUT, treat as
 *     missed (can't join).
 */
function computeCanJoin(call, now = new Date()) {
  if (![VIDEO_CALL_STATUS.SCHEDULED, VIDEO_CALL_STATUS.INITIATED, VIDEO_CALL_STATUS.ONGOING].includes(call.status)) {
    return false;
  }
  if (!call.scheduledAt) {
    // Calls without a scheduledAt (legacy or ad-hoc) can be joined anytime
    // they're in an open status.
    return true;
  }
  const scheduled = new Date(call.scheduledAt).getTime();
  const nowMs = now.getTime();
  if (nowMs < scheduled - JOIN_WINDOW_MS()) return false;
  if (call.status === VIDEO_CALL_STATUS.SCHEDULED && nowMs > scheduled + TIMEOUT_MS()) return false;
  return true;
}

/**
 * GET /api/v1/video/calls/:callId
 * Returns a participant-filtered view of the call plus the joinability gate.
 */
const getCall = asyncHandler(async (req, res) => {
  const { call, userId } = await loadCallForParticipant(req);

  const participants = await User.find({ _id: { $in: call.participants } })
    .select('name role')
    .lean();

  const otherParty = participants.find((p) => String(p._id) !== String(userId)) || null;

  return apiResponse.success(res, {
    id: String(call._id),
    status: call.status,
    scheduledAt: call.scheduledAt,
    startedAt: call.startedAt || null,
    endedAt: call.endedAt || null,
    durationSeconds: call.durationSeconds || null,
    bookingId: call.bookingId ? String(call.bookingId) : null,
    assessmentId: call.assessmentId ? String(call.assessmentId) : null,
    participants: participants.map((p) => ({
      id: String(p._id),
      name: p.name || null,
      profilePhoto: p.profilePhoto || null,
      role: p.role,
    })),
    otherParty: otherParty
      ? { id: String(otherParty._id), name: otherParty.name || null, role: otherParty.role }
      : null,
    canJoin: computeCanJoin(call),
    assessmentMode: call.assessmentId ? ASSESSMENT_MODE.THERAPIST_DRIVEN : null,
  });
});

/**
 * POST /api/v1/video/calls/:callId/join
 * Records this participant's join, transitions status, and returns ICE config.
 */
const joinCall = asyncHandler(async (req, res, next) => {
  const { call, userId } = await loadCallForParticipant(req);

  const now = new Date();
  if (!computeCanJoin(call, now)) {
    return apiResponse.error(res, 'Cannot join call right now', 409, req.correlationId);
  }

  // Initialize joinState entry for this user (preserve any prior entry).
  const key = String(userId);
  const existing = call.joinState?.get?.(key) || {};
  call.joinState.set(key, { joinedAt: existing.joinedAt || now, leftAt: null });

  if (call.status === VIDEO_CALL_STATUS.SCHEDULED) {
    call.status = VIDEO_CALL_STATUS.INITIATED;
    call.startedAt = now;
  }

  // If both participants have joinedAt set (and neither has a definitive leave),
  // mark as ongoing.
  const joinedCount = Array.from(call.joinState.values())
    .filter((v) => v && v.joinedAt && !v.leftAt).length;
  if (joinedCount >= 2 && call.status !== VIDEO_CALL_STATUS.ONGOING) {
    call.status = VIDEO_CALL_STATUS.ONGOING;
  }

  await call.save();

  // Reuse the cached Metered ICE-config endpoint to avoid duplicating logic.
  return getIceConfig(req, res, next);
});

/**
 * POST /api/v1/video/calls/:callId/leave
 * Marks the leaver; once both participants have left we end the call and,
 * if there's a linked completed assessment without a PDF yet, enqueue the
 * PDF worker.
 */
const leaveCall = asyncHandler(async (req, res) => {
  const { call, userId } = await loadCallForParticipant(req);

  const now = new Date();
  const key = String(userId);
  const existing = call.joinState?.get?.(key) || {};
  call.joinState.set(key, { joinedAt: existing.joinedAt || null, leftAt: now });

  const allLeft = call.participants.every((pid) => {
    const entry = call.joinState.get(String(pid));
    return entry && entry.leftAt;
  });

  if (allLeft && call.status !== VIDEO_CALL_STATUS.ENDED) {
    call.status = VIDEO_CALL_STATUS.ENDED;
    call.endedAt = now;
    if (call.startedAt) {
      call.durationSeconds = Math.floor((now - new Date(call.startedAt)) / 1000);
    }
  }

  await call.save();

  // PDF enqueue gate — only when:
  //   1. The call just ended (allLeft transition this request, or already ended)
  //   2. There's a linked assessment that's completed but has no pdfKey yet
  if (call.status === VIDEO_CALL_STATUS.ENDED && call.assessmentId) {
    const assessment = await Assessment.findById(call.assessmentId).select('status pdfKey');
    if (assessment && assessment.status === 'completed' && !assessment.pdfKey) {
      try {
        await addJob(
          JOB_NAMES.GENERATE_ASSESSMENT_PDF,
          { assessmentId: String(assessment._id) },
          { jobId: `pdf:${assessment._id}` }
        );
        logger.info({ event: 'PDF_JOB_ENQUEUED', source: 'leaveCall', assessmentId: assessment._id });
      } catch (err) {
        logger.warn({ event: 'PDF_JOB_ENQUEUE_FAILED', err: err.message });
      }
    }
  }

  return apiResponse.success(res, {
    id: String(call._id),
    status: call.status,
    endedAt: call.endedAt || null,
    durationSeconds: call.durationSeconds || null,
  });
});

module.exports = {
  getCall,
  joinCall,
  leaveCall,
  // exported for tests
  computeCanJoin,
};
