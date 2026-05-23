'use strict';

const { toZonedTime, format } = require('date-fns-tz');
const Booking = require('../../models/Booking.model');
const BookingProposal = require('../../models/BookingProposal.model');
const User = require('../../models/User.model');
const { addJob } = require('../../core/jobs/jobQueue');
const { getClient } = require('../../config/redis');
const sanitizeDisplayName = require('../../core/utils/sanitizeDisplayName');
const { attachVideoCallAndAssessment } = require('./booking.service');
const {
  BOOKING_STATUS,
  PROPOSAL_STATUS,
  MEETING_TYPE,
  SCHEDULED_MODE,
  NOTIFICATION_TYPES,
  NOTIFICATION_CATEGORIES,
  JOB_NAMES,
  ROLES,
} = require('../../core/utils/constants');
const logger = require('../../core/utils/logger');

// 24h proposal lifetime — matches the patient-facing "respond within 24 hours"
// UX copy. Sweep handler in P2.4 will flip overdue pending proposals to
// 'expired' and notify the therapist.
const PROPOSAL_EXPIRY_MS = 24 * 60 * 60 * 1000;

// ── Redis slot-lock helpers ────────────────────────────────────────────
// Mirror of booking.service.js:94-124 — duplicated here because those
// helpers are module-internal (not exported). The key shape and TTL MUST
// stay byte-identical to booking.service's so locks are interchangeable:
// if createBooking holds the lock, acceptProposal sees contention, and
// vice versa. If booking.service ever exports its helpers, refactor this
// file to import them instead of carrying a parallel copy.
const SLOT_LOCK_TTL_SECONDS = 10;

function slotLockKey(therapistId, slotStart) {
  const ts = new Date(slotStart).getTime();
  return `lock:slot:${therapistId}:${ts}`;
}

async function acquireSlotLock(therapistId, slotStart) {
  const redis = getClient(process.env.REDIS_URL);
  const key = slotLockKey(therapistId, slotStart);
  const result = await redis.set(key, '1', 'EX', SLOT_LOCK_TTL_SECONDS, 'NX');
  return result === 'OK';
}

async function releaseSlotLock(therapistId, slotStart) {
  const redis = getClient(process.env.REDIS_URL);
  await redis.del(slotLockKey(therapistId, slotStart));
}

/**
 * Therapist creates a pending session proposal for a patient.
 *
 * Conflict matrix (codes opaque to patient identity where required):
 *   PROPOSAL_SLOT_IN_PAST          — 400, slotStart <= now
 *   PROPOSAL_ROLE_REQUIRED         — 403, caller is not a therapist
 *   PROPOSAL_NO_PRIOR_RELATIONSHIP — 403, no confirmed/completed booking
 *                                    between this therapist and this patient
 *                                    (mirrors S2 ed7c8e9 createInstantBooking gate)
 *   PROPOSAL_SLOT_CONFLICT_THERAPIST — 409, therapist already has a confirmed
 *                                       Booking OR a pending proposal at the
 *                                       slot. Same code for both — opaque to
 *                                       patient identity.
 *   PROPOSAL_DUPLICATE_PENDING     — 409, same therapist→patient→slot already
 *                                    has a pending proposal
 *   PROPOSAL_SLOT_CONFLICT_PATIENT — 409, patient has a confirmed Booking with
 *                                    ANY therapist at this slot. Generic
 *                                    message — does not leak therapist identity.
 *
 * Concurrent pending proposals from different therapists to the SAME patient
 * at the SAME slot are allowed per the locked conflict matrix — patient picks
 * the first to accept. The second accept later loses the race and gets
 * PROPOSAL_SLOT_NOW_TAKEN in P2.2.
 *
 * Defense-in-depth: BookingProposal partial-unique index on
 * { therapistId, slotStart, status='pending' } from P1.3 backstops the
 * service-level checks. A race that slips past the application check throws
 * Mongo E11000 — we catch it and rethrow as the same typed code so callers
 * see one consistent surface.
 *
 * @param {{ mongoId: string, role: string }} actor
 * @param {{ patientId, slotStart, durationMinutes, timezone, meetingType, notes? }} body
 */
async function createProposal(actor, body) {
  // Service-layer role gate (defense-in-depth; route also has rbac('therapist')).
  if (actor.role !== ROLES.THERAPIST) {
    throw Object.assign(new Error('Therapist role required'), {
      statusCode: 403, code: 'PROPOSAL_ROLE_REQUIRED',
    });
  }

  const {
    patientId, slotStart, durationMinutes, timezone, meetingType, notes,
  } = body;
  const utcSlot = new Date(slotStart);

  // 1. Past-slot guard
  if (utcSlot <= new Date()) {
    throw Object.assign(new Error('Slot must be in the future'), {
      statusCode: 400, code: 'PROPOSAL_SLOT_IN_PAST',
    });
  }

  // 2. S2 relationship gate — mirrors createInstantBooking S2 ed7c8e9
  const priorBooking = await Booking.exists({
    patientId,
    therapistId: actor.mongoId,
    status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.COMPLETED] },
    isDeleted: false,
  });
  if (!priorBooking) {
    throw Object.assign(new Error('No prior session with this patient'), {
      statusCode: 403, code: 'PROPOSAL_NO_PRIOR_RELATIONSHIP',
    });
  }

  // 3. Therapist self-conflict — confirmed Booking at this slot
  const therapistConfirmed = await Booking.exists({
    therapistId: actor.mongoId,
    slotStart: utcSlot,
    status: BOOKING_STATUS.CONFIRMED,
    isDeleted: false,
  });
  if (therapistConfirmed) {
    throw Object.assign(new Error('You already have a confirmed session at this time'), {
      statusCode: 409, code: 'PROPOSAL_SLOT_CONFLICT_THERAPIST',
    });
  }

  // 4. Therapist self-conflict — pending proposal at this slot. Check
  //    duplicate-to-same-patient first (more specific code) so the more
  //    informative message wins when both conditions are true.
  const duplicatePending = await BookingProposal.exists({
    therapistId: actor.mongoId,
    patientId,
    slotStart: utcSlot,
    status: PROPOSAL_STATUS.PENDING,
    isDeleted: false,
  });
  if (duplicatePending) {
    throw Object.assign(new Error('You already have a pending proposal to this patient at this time'), {
      statusCode: 409, code: 'PROPOSAL_DUPLICATE_PENDING',
    });
  }

  const therapistPending = await BookingProposal.exists({
    therapistId: actor.mongoId,
    slotStart: utcSlot,
    status: PROPOSAL_STATUS.PENDING,
    isDeleted: false,
  });
  if (therapistPending) {
    throw Object.assign(new Error('You already have a pending proposal at this time'), {
      statusCode: 409, code: 'PROPOSAL_SLOT_CONFLICT_THERAPIST',
    });
  }

  // 5. Patient unavailability — confirmed Booking with ANY therapist.
  //    Generic message; does not leak which therapist.
  const patientConfirmed = await Booking.exists({
    patientId,
    slotStart: utcSlot,
    status: BOOKING_STATUS.CONFIRMED,
    isDeleted: false,
  });
  if (patientConfirmed) {
    throw Object.assign(new Error('Patient is unavailable at this time'), {
      statusCode: 409, code: 'PROPOSAL_SLOT_CONFLICT_PATIENT',
    });
  }

  // (Patient with pending proposals from other therapists is intentionally
  //  NOT a conflict — concurrent proposals allowed per locked matrix.)

  // 6. Persist. Wrap in try/catch to fold E11000 back into the same typed
  //    code surface (partial-unique index from P1.3 is defense-in-depth).
  const expiresAt = new Date(Date.now() + PROPOSAL_EXPIRY_MS);
  let proposal;
  try {
    proposal = await BookingProposal.create({
      therapistId: actor.mongoId,
      patientId,
      slotStart: utcSlot,
      durationMinutes,
      timezone,
      meetingType,
      notes: notes || null,
      expiresAt,
    });
  } catch (err) {
    if (err && err.code === 11000) {
      // Race past the application-level pending-pending check. The unique
      // index is on {therapistId, slotStart, status='pending'}, so the
      // collision is by definition a therapist self-pending conflict. We
      // don't know if it's the same patient or different — use the broader
      // code (DUPLICATE_PENDING is more specific and we'd need a re-read to
      // confirm; SLOT_CONFLICT_THERAPIST is always correct).
      throw Object.assign(new Error('You already have a pending proposal at this time'), {
        statusCode: 409, code: 'PROPOSAL_SLOT_CONFLICT_THERAPIST',
      });
    }
    throw err;
  }

  logger.info({
    event: 'PROPOSAL_CREATED',
    proposalId: proposal._id,
    therapistId: actor.mongoId,
    patientId,
    slotStart: utcSlot.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

  // 7. Notify patient. Sender name sanitized for the push body (S-followup-11
  //    pattern); body is server-controlled and never echoes attacker-supplied
  //    free text (S-followup-6). PROPOSAL_RECEIVED is CRITICAL — patients
  //    without fcmToken get email fallback via notificationWorker.
  const therapist = await User.findById(actor.mongoId).select('name').lean();
  const therapistName = sanitizeDisplayName(therapist?.name, { maxLength: 50 });
  const formattedSlot = format(
    toZonedTime(utcSlot, timezone),
    'EEE, MMM d \'at\' h:mm a',
    { timeZone: timezone }
  );
  const senderLabel = therapistName ? `Dr. ${therapistName}` : 'Your therapist';

  await addJob(JOB_NAMES.SEND_NOTIFICATION, {
    userId: String(patientId),
    title: 'New Session Proposal',
    body: `${senderLabel} proposed a session for ${formattedSlot}`,
    type: NOTIFICATION_TYPES.PROPOSAL_RECEIVED,
    category: NOTIFICATION_CATEGORIES.PROPOSAL,
    data: {
      proposalId: proposal._id.toString(),
      therapistId: String(actor.mongoId),
      slotStart: utcSlot.toISOString(),
    },
  });

  return { proposal: proposal.toObject() };
}

/**
 * Patient accepts a pending proposal.
 *
 * Race-resolution sequence (per locked design — patient-accept wins
 * simultaneous patient-accept ↔ therapist-cancel race via atomic claim):
 *
 *   1. Existence + recipient + state + expiry + slot-in-past gates
 *   2. Patient-side conflict re-check (patient may have booked elsewhere
 *      between proposal-send and accept)
 *   3. Acquire Redis SETNX slot lock on (therapistId, slotStart) — same
 *      key shape as createBooking so the two flows can't race each other
 *   4. Atomic claim: findOneAndUpdate({_id, status:'pending'}, {status:'accepted'}).
 *      Mongo per-document atomicity guarantees losers get null. This is
 *      how concurrent accepts and the therapist-cancel race are resolved
 *      without transactions.
 *   5. Create Booking with shape matching createBooking exactly (status=confirmed,
 *      videoCallId populated for video). Defense-in-depth rollback if Booking.create
 *      throws E11000 (some other Booking landed at this slot between our pre-check
 *      and the create — extremely narrow window, but covered).
 *   6. Link proposal.bookingId to the new Booking
 *   7. Release Redis lock (always, on every exit path)
 *   8. Notify therapist (PROPOSAL_ACCEPTED, no category — therapist push
 *      has no action buttons)
 *
 * Recipient gate (step 1, mismatched patientId): per spec, this returns
 * status 403 with code PROPOSAL_NOT_RECIPIENT but message "Proposal not
 * found" — partial existence-oracle collapse. Distinct code preserves
 * audit/log signal; benign message keeps the surface uniform with the
 * truly-non-existent case. The HTTP status still distinguishes (403 vs
 * 404) for any attacker reading status codes — this is the spec's
 * intentional middle ground vs the stricter chat.service:96-98 pattern
 * (single 404 + single code).
 *
 * @param {{ mongoId: string, role: string }} actor
 * @param {string} proposalId
 */
async function acceptProposal(actor, proposalId) {
  // Role gate — defense-in-depth alongside rbac('patient') on the route.
  if (actor.role !== ROLES.PATIENT) {
    throw Object.assign(new Error('Patient role required'), {
      statusCode: 403, code: 'PROPOSAL_ROLE_REQUIRED',
    });
  }

  // 1a. Existence. .lean() avoids hydrating a Mongoose doc we're going
  //     to write through findOneAndUpdate anyway. Soft-deleted proposals
  //     return null here because BookingProposal has softDeletePlugin
  //     and the default find* pre-hook filters them.
  const proposal = await BookingProposal.findById(proposalId).lean();
  if (!proposal) {
    throw Object.assign(new Error('Proposal not found'), {
      statusCode: 404, code: 'PROPOSAL_NOT_FOUND',
    });
  }

  // 1b. Recipient. See JSDoc for the 403+benign-message rationale.
  if (String(proposal.patientId) !== String(actor.mongoId)) {
    throw Object.assign(new Error('Proposal not found'), {
      statusCode: 403, code: 'PROPOSAL_NOT_RECIPIENT',
    });
  }

  // 1c. State. Distinct code per outcome surface.
  if (proposal.status !== PROPOSAL_STATUS.PENDING) {
    throw Object.assign(
      new Error(`Proposal has already been ${proposal.status.replace(/_/g, ' ')}`),
      { statusCode: 409, code: 'PROPOSAL_ALREADY_RESPONDED' }
    );
  }

  // 1d. Expiry. 410 Gone matches the INSTANT_REQUEST_EXPIRED precedent
  //     at booking.service.js:655 — semantically correct for a resource
  //     that existed but is no longer addressable.
  const now = new Date();
  if (proposal.expiresAt <= now) {
    throw Object.assign(new Error('Proposal has expired'), {
      statusCode: 410, code: 'PROPOSAL_EXPIRED',
    });
  }

  // 1e. Slot-in-past (proposal sat in queue past its slot — possible if
  //     therapist proposed a near-term slot and the patient delayed).
  if (proposal.slotStart <= now) {
    throw Object.assign(new Error('Proposal slot is in the past'), {
      statusCode: 409, code: 'PROPOSAL_SLOT_NOW_PAST',
    });
  }

  // 2. Patient-side conflict re-check — patient may have a confirmed
  //    Booking at this slot from elsewhere (different therapist, accepted
  //    a competing proposal first, or booked directly).
  const patientConflict = await Booking.exists({
    patientId: actor.mongoId,
    slotStart: proposal.slotStart,
    status: BOOKING_STATUS.CONFIRMED,
    isDeleted: false,
  });
  if (patientConflict) {
    throw Object.assign(new Error('You already have a session at this time'), {
      statusCode: 409, code: 'PROPOSAL_SLOT_NOW_TAKEN',
    });
  }

  // 3. Acquire slot lock. From this point on, every exit path MUST release.
  const locked = await acquireSlotLock(proposal.therapistId, proposal.slotStart);
  if (!locked) {
    // Lock contention — createBooking or another concurrent acceptProposal
    // holds it. Surface as PROPOSAL_SLOT_NOW_TAKEN (proposal-side context)
    // rather than BOOKING_SLOT_LOCKED so the patient app gets a coherent
    // proposal-flow error code.
    throw Object.assign(new Error('Slot is currently being processed; please try again'), {
      statusCode: 409, code: 'PROPOSAL_SLOT_NOW_TAKEN',
    });
  }

  let claimed;
  let booking;
  try {
    // 4. Atomic claim. The status:'pending' predicate in the filter is the
    //    chokepoint — if a concurrent caller (or expiry sweep, or therapist
    //    DELETE) already flipped the status, findOneAndUpdate returns null.
    //    This is the no-transaction race-resolution mechanism.
    claimed = await BookingProposal.findOneAndUpdate(
      { _id: proposalId, status: PROPOSAL_STATUS.PENDING, isDeleted: false },
      { $set: { status: PROPOSAL_STATUS.ACCEPTED, respondedAt: new Date() } },
      { new: true }
    );
    if (!claimed) {
      throw Object.assign(new Error('Proposal is no longer pending'), {
        statusCode: 409, code: 'PROPOSAL_ALREADY_RESPONDED',
      });
    }

    // 5. Create the Booking. Shape matches createBooking exactly so the
    //    resulting doc participates in the existing booking lifecycle
    //    (cancel, complete, smart-join, video pre-call). idempotencyKey
    //    is derived from proposalId so a duplicate accept (different
    //    Idempotency-Key header) can't create a second Booking — the
    //    unique sparse index on Booking.idempotencyKey backstops it.
    try {
      booking = await Booking.create({
        therapistId: claimed.therapistId,
        patientId: claimed.patientId,
        slotStart: claimed.slotStart,
        durationMinutes: claimed.durationMinutes,
        timezone: claimed.timezone,
        notes: claimed.notes,
        status: BOOKING_STATUS.CONFIRMED,
        meetingType: claimed.meetingType,
        scheduledMode: SCHEDULED_MODE.SLOT_BOOKING,
        idempotencyKey: `proposal:${claimed._id.toString()}`,
      });
    } catch (err) {
      // Defense-in-depth rollback: a Booking landed at this slot in the
      // tiny window between our patient-conflict pre-check and Booking.create
      // (the lock guards the therapist side; patient side has no lock).
      // Or: idempotencyKey collision (very narrow — only on retry races).
      if (err && err.code === 11000) {
        await BookingProposal.findByIdAndUpdate(claimed._id, {
          $set: { status: PROPOSAL_STATUS.PENDING, respondedAt: null },
        });
        throw Object.assign(new Error('Slot is no longer available'), {
          statusCode: 409, code: 'PROPOSAL_SLOT_NOW_TAKEN',
        });
      }
      // Non-E11000 failure: also roll back to keep the proposal usable.
      await BookingProposal.findByIdAndUpdate(claimed._id, {
        $set: { status: PROPOSAL_STATUS.PENDING, respondedAt: null },
      });
      throw err;
    }

    // 5a. Video side-effect — must run AFTER Booking exists. Reuses the
    //     exact helper createBooking uses so VideoCall + Assessment have
    //     identical shape (smart-join filter on both apps depends on
    //     booking.videoCallId being set + booking.meetingType==='video').
    let videoCall = null;
    let assessment = null;
    if (booking.meetingType === MEETING_TYPE.VIDEO) {
      const linked = await attachVideoCallAndAssessment(booking);
      videoCall = linked.videoCall;
      assessment = linked.assessment;
    }

    // 6. Link proposal → booking
    claimed.bookingId = booking._id;
    await BookingProposal.findByIdAndUpdate(claimed._id, {
      $set: { bookingId: booking._id },
    });

    logger.info({
      event: 'PROPOSAL_ACCEPTED',
      proposalId: claimed._id,
      bookingId: booking._id,
      therapistId: claimed.therapistId,
      patientId: claimed.patientId,
      videoCallId: videoCall ? videoCall._id : null,
    });

    // 8. Notify therapist. No category — therapist push has no action
    //    buttons (tap to view). Patient name sanitized (S-followup-11).
    const patient = await User.findById(actor.mongoId).select('name').lean();
    const patientName = sanitizeDisplayName(patient?.name, { maxLength: 50 });
    const senderLabel = patientName || 'A patient';
    await addJob(JOB_NAMES.SEND_NOTIFICATION, {
      userId: String(claimed.therapistId),
      title: 'Session Confirmed',
      body: `${senderLabel} accepted your session proposal`,
      type: NOTIFICATION_TYPES.PROPOSAL_ACCEPTED,
      data: {
        proposalId: claimed._id.toString(),
        bookingId: booking._id.toString(),
        patientName: patientName || null,
        slotStart: booking.slotStart.toISOString(),
      },
    });

    return {
      proposal: { ...claimed.toObject(), bookingId: booking._id },
      booking: booking.toObject(),
    };
  } finally {
    // 7. Lock release on every exit path — success or thrown error.
    await releaseSlotLock(proposal.therapistId, proposal.slotStart);
  }
}

module.exports = { createProposal, acceptProposal };
