'use strict';

const logger = require('../../utils/logger');
const {
  JOB_NAMES, PROPOSAL_STATUS, NOTIFICATION_TYPES,
} = require('../../utils/constants');
const { addJob, getQueue } = require('../jobQueue');
const BookingProposal = require('../../../models/BookingProposal.model');

// Separate file from availabilityWorker.js — proposal expiry is its own
// concern with stricter semantics (atomic claim + batch cap) than the
// instant-request sweep. Scope-discipline per Phase S commit pattern.
//
// Shape mirrors availabilityWorker.handleExpireInstantRequests, with two
// proposal-specific refinements:
//   1. Atomic claim via findOneAndUpdate — pending proposals can race
//      against in-flight patient accept/decline; without the state
//      predicate, a sweep could flip a proposal that's mid-accept
//      and orphan the created Booking.
//   2. Batch cap of 100 — protects the worker from a giant backlog
//      after a Redis outage. Subsequent ticks drain remaining rows
//      every minute.

const EXPIRE_REPEAT_EVERY_MS = 60 * 1000; // 1 minute (matches availabilityWorker)
const BATCH_LIMIT = 100;

/**
 * Handler: EXPIRE_PROPOSALS
 * Flips pending proposals whose expiresAt has passed to 'expired' and
 * notifies BOTH patient (they missed it) and therapist (it timed out).
 * Per-row error isolation: one row failure logs and continues.
 */
async function handleExpireProposals() {
  const now = new Date();
  const candidates = await BookingProposal.find({
    status: PROPOSAL_STATUS.PENDING,
    expiresAt: { $lte: now },
    isDeleted: false,
  })
    .select('_id therapistId patientId slotStart')
    .limit(BATCH_LIMIT)
    .lean();

  if (candidates.length === 0) return { expired: 0 };

  let expiredCount = 0;
  for (const p of candidates) {
    try {
      const claimed = await BookingProposal.findOneAndUpdate(
        { _id: p._id, status: PROPOSAL_STATUS.PENDING, isDeleted: false },
        { $set: { status: PROPOSAL_STATUS.EXPIRED, respondedAt: now } },
        { new: true }
      );
      if (!claimed) {
        // Race lost — a patient accept/decline (or therapist cancel)
        // flipped status between our find and our claim. Skip silently.
        continue;
      }
      expiredCount += 1;

      // Notify patient (they missed responding to the proposal).
      await addJob(JOB_NAMES.SEND_NOTIFICATION, {
        userId: String(p.patientId),
        title: 'Session Proposal Expired',
        body: 'A session proposal from your therapist has expired without response.',
        type: NOTIFICATION_TYPES.PROPOSAL_EXPIRED,
        data: {
          proposalId: String(p._id),
          slotStart: p.slotStart.toISOString(),
        },
      });
      // Notify therapist (their outgoing proposal timed out).
      await addJob(JOB_NAMES.SEND_NOTIFICATION, {
        userId: String(p.therapistId),
        title: 'Proposal Expired',
        body: 'Your session proposal expired without patient response.',
        type: NOTIFICATION_TYPES.PROPOSAL_EXPIRED,
        data: {
          proposalId: String(p._id),
          slotStart: p.slotStart.toISOString(),
        },
      });
    } catch (err) {
      logger.error({
        event: 'PROPOSAL_EXPIRE_ROW_FAILED',
        proposalId: String(p._id),
        err: err.message,
      });
      // Continue to next row — one row's failure doesn't block the batch.
    }
  }

  logger.info({
    event: 'PROPOSALS_EXPIRED',
    candidates: candidates.length,
    expired: expiredCount,
  });
  return { expired: expiredCount };
}

/**
 * Register the periodic sweep. Idempotent — BullMQ deduplicates by the
 * deterministic jobId so worker restarts don't multiply repeats.
 */
async function registerProposalExpireRepeat() {
  const queue = getQueue();
  await queue.add(
    JOB_NAMES.EXPIRE_PROPOSALS,
    {},
    {
      repeat: { every: EXPIRE_REPEAT_EVERY_MS },
      jobId: 'repeat:expire-proposals',
      removeOnComplete: true,
      removeOnFail: 100,
    }
  );
  logger.info({ event: 'PROPOSAL_EXPIRE_REPEAT_REGISTERED', everyMs: EXPIRE_REPEAT_EVERY_MS });
}

module.exports = {
  handleExpireProposals,
  registerProposalExpireRepeat,
  BATCH_LIMIT,
};
