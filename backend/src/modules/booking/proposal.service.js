'use strict';

const { toZonedTime, format } = require('date-fns-tz');
const Booking = require('../../models/Booking.model');
const BookingProposal = require('../../models/BookingProposal.model');
const User = require('../../models/User.model');
const { addJob } = require('../../core/jobs/jobQueue');
const sanitizeDisplayName = require('../../core/utils/sanitizeDisplayName');
const {
  BOOKING_STATUS,
  PROPOSAL_STATUS,
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

module.exports = { createProposal };
