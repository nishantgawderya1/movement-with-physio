'use strict';

const asyncHandler = require('../../core/utils/asyncHandler');
const apiResponse = require('../../core/utils/apiResponse');
const { resolveMongoUserId } = require('../../core/utils/resolveMongoUserId');
const { addJob } = require('../../core/jobs/jobQueue');
const logger = require('../../core/utils/logger');
const usersService = require('./users.service');

/**
 * PATCH /api/v1/users/me/fcm-token (raw impl — exported for tests)
 *
 * Diff-write semantics: skip the Mongo write AND the audit emission when
 * the incoming token equals the stored token. FCM tokens refresh roughly
 * weekly per device and on every app reinstall; logging every PATCH would
 * drown out the rotation-anomaly signal we actually care about.
 *
 * Response is intentionally write-only — `{ updated: bool }` only. The
 * token itself never echoes back, so the endpoint cannot be used as a
 * read oracle (e.g. to confirm an attacker-supplied token landed).
 *
 * Exposed as a raw async function (matches videoCall.controller's
 * loadCallForParticipant pattern at videoCall.controller.js:28) so tests
 * can await it directly; asyncHandler wrapping below for Express.
 */
async function setFcmTokenImpl(req, res) {
  const mongoId = await resolveMongoUserId(req);
  const { fcmToken } = req.body;

  const current = await usersService.getFcmToken(mongoId);
  if (current === fcmToken) {
    return apiResponse.success(res, { updated: false });
  }

  await usersService.setFcmToken(mongoId, fcmToken);

  // Audit fired here (not via auditLog middleware) so it only emits when
  // a real diff write occurred. The `changes` envelope intentionally omits
  // the token itself — `cleared: bool` is the diagnostic signal admins need.
  try {
    await addJob('write_audit', {
      action: 'SET_FCM_TOKEN',
      resource: 'user',
      resourceId: mongoId,
      userId: req.user?.id || null,
      changes: { cleared: fcmToken === null },
      statusCode: 200,
      correlationId: req.correlationId,
    });
  } catch (err) {
    logger.warn({ event: 'AUDIT_ENQUEUE_FAILED', action: 'SET_FCM_TOKEN', err: err.message });
  }

  return apiResponse.success(res, { updated: true });
}

const setFcmToken = asyncHandler(setFcmTokenImpl);

module.exports = { setFcmToken, setFcmTokenImpl };
