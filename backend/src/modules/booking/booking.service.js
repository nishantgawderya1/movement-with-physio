'use strict';

const { fromZonedTime, toZonedTime, format } = require('date-fns-tz');
const Booking = require('../../models/Booking.model');
const User = require('../../models/User.model');
const Assessment = require('../../models/Assessment.model');
const AssessmentQuestionTemplate = require('../../models/AssessmentQuestionTemplate.model');
const VideoCall = require('../../models/VideoCall.model');
const { getClient } = require('../../config/redis');
const cacheManager = require('../../core/cache/cacheManager');
const { addJob } = require('../../core/jobs/jobQueue');
const paginate = require('../../core/utils/paginator');
const {
  BOOKING_STATUS, NOTIFICATION_TYPES, REDIS_TTL,
  MEETING_TYPE, SCHEDULED_MODE, VIDEO_CALL_STATUS,
  ASSESSMENT_MODE, INSTANT_DELAY_MINUTES, INSTANT_REQUEST_TIMEOUT_MS,
  JOB_NAMES, ROLES,
} = require('../../core/utils/constants');
const logger = require('../../core/utils/logger');

/**
 * Snapshot question templates for the given body part into an assessment.
 * Falls back to the 'general' bank if the requested body part has no questions.
 * Returns an array of { questionId, questionText, answerType, options }.
 *
 * Snapshotting (not referencing) ensures future edits to the template
 * collection don't retroactively change historical assessments.
 */
async function snapshotQuestionsForBodyPart(bodyPart) {
  const primary = await AssessmentQuestionTemplate.find({ bodyPart, isActive: true })
    .sort({ order: 1 })
    .lean();
  const source = primary.length > 0
    ? primary
    : await AssessmentQuestionTemplate.find({ bodyPart: 'general', isActive: true })
        .sort({ order: 1 })
        .lean();
  return source.map((t) => ({
    questionId: t.questionId,
    questionText: t.questionText,
    answerType: t.answerType,
    options: t.options || [],
  }));
}

/**
 * Create the linked VideoCall + Assessment for a video meeting.
 * Shared between scheduled video bookings (createBooking with meetingType='video')
 * and accepted instant bookings (acceptInstantBooking).
 *
 * @param {object} booking - persisted Booking document (will be mutated to link
 *   the videoCallId + assessmentId and saved).
 * @returns {Promise<{ videoCall, assessment }>}
 */
async function attachVideoCallAndAssessment(booking) {
  // patient.painLocation is the patient's primary body part (set during
  // onboarding once that field lands). Today it's not on the User schema so
  // .select('painLocation') yields undefined and we fall through to 'general'.
  const patient = await User.findById(booking.patientId).select('painLocation').lean();
  const bodyPart = (patient?.painLocation || 'general').toString().toLowerCase();

  const videoCall = await VideoCall.create({
    participants: [booking.patientId, booking.therapistId],
    initiatedBy: booking.patientId,
    status: VIDEO_CALL_STATUS.SCHEDULED,
    scheduledAt: booking.slotStart,
    bookingId: booking._id,
  });

  const questions = await snapshotQuestionsForBodyPart(bodyPart);

  const assessment = await Assessment.create({
    patientId: booking.patientId,
    therapistId: booking.therapistId,
    bodyParts: [bodyPart],
    mode: ASSESSMENT_MODE.THERAPIST_DRIVEN,
    bookingId: booking._id,
    videoCallId: videoCall._id,
    status: 'pending',
    questions,
    responses: [],
  });

  booking.videoCallId = videoCall._id;
  booking.assessmentId = assessment._id;
  await booking.save();

  videoCall.assessmentId = assessment._id;
  await videoCall.save();

  return { videoCall, assessment };
}

const SLOT_LOCK_TTL_SECONDS = 10; // 10s SETNX lock while booking is processed

/**
 * Build the Redis lock key for a therapist+slot pair.
 * @param {string|ObjectId} therapistId
 * @param {Date} slotStart - UTC Date
 */
function slotLockKey(therapistId, slotStart) {
  const ts = new Date(slotStart).getTime();
  return `lock:slot:${therapistId}:${ts}`;
}

/**
 * Acquire a Redis SETNX lock on the slot.
 * Returns true if lock acquired, false if slot is taken.
 */
async function acquireSlotLock(therapistId, slotStart) {
  const redis = getClient(process.env.REDIS_URL);
  const key = slotLockKey(therapistId, slotStart);
  // NX: set only if not exists, EX: auto-release after 10s
  const result = await redis.set(key, '1', 'EX', SLOT_LOCK_TTL_SECONDS, 'NX');
  return result === 'OK';
}

/**
 * Release the Redis slot lock.
 */
async function releaseSlotLock(therapistId, slotStart) {
  const redis = getClient(process.env.REDIS_URL);
  await redis.del(slotLockKey(therapistId, slotStart));
}

/**
 * Convert a zoned time string to UTC Date.
 * @param {string} dateTimeStr - e.g. "2025-06-01T10:00:00"
 * @param {string} timezone - IANA e.g. "Asia/Kolkata"
 * @returns {Date} UTC Date
 */
function toUTC(dateTimeStr, timezone) {
  return fromZonedTime(dateTimeStr, timezone);
}

/**
 * List all available slots for a therapist on a given date.
 * Loads existing bookings for that date and subtracts them.
 *
 * @param {string} therapistId
 * @param {string} date - "YYYY-MM-DD" in therapist's timezone
 * @param {string} timezone - IANA timezone
 * @param {number} [durationMinutes=60]
 */
async function listSlots(therapistId, date, timezone = 'Asia/Kolkata', durationMinutes = 60) {
  const cacheKey = `slots:${therapistId}:${date}`;
  const cached = await cacheManager.get(cacheKey);
  if (cached) return cached;

  // Define working hours: 9:00 - 18:00 in therapist's timezone
  const slots = [];
  for (let hour = 9; hour < 18; hour++) {
    const zonedSlotStr = `${date}T${String(hour).padStart(2, '0')}:00:00`;
    const utcSlot = toUTC(zonedSlotStr, timezone);
    slots.push(utcSlot);
  }

  // Find booked slots for that day
  const dayStart = toUTC(`${date}T00:00:00`, timezone);
  const dayEnd = toUTC(`${date}T23:59:59`, timezone);

  const bookedSlots = await Booking.find({
    therapistId,
    slotStart: { $gte: dayStart, $lte: dayEnd },
    status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] },
  })
    .select('slotStart')
    .lean();

  const bookedTimes = new Set(bookedSlots.map((b) => new Date(b.slotStart).getTime()));

  const available = slots.map((utcSlot) => ({
    utc: utcSlot.toISOString(),
    local: format(toZonedTime(utcSlot, timezone), 'yyyy-MM-dd HH:mm', { timeZone: timezone }),
    available: !bookedTimes.has(utcSlot.getTime()),
  }));

  await cacheManager.set(cacheKey, available, REDIS_TTL.SLOTS);
  return available;
}

/**
 * Create a new booking with:
 *  1. Redis SETNX slot lock (prevents concurrent double-booking)
 *  2. DB-level uniqueness check (belt-and-suspenders)
 *  3. Notification job enqueue
 *
 * @param {object} data
 * @param {string} data.therapistId
 * @param {string} data.patientId
 * @param {string} data.slotStart - ISO UTC string
 * @param {string} data.timezone
 * @param {number} [data.durationMinutes]
 * @param {string} [data.notes]
 * @param {string} [data.idempotencyKey]
 */
async function createBooking(data) {
  const {
    therapistId, patientId, slotStart, timezone, durationMinutes = 60, notes,
    idempotencyKey,
    meetingType = MEETING_TYPE.IN_PERSON,
  } = data;

  const utcSlot = new Date(slotStart);

  // 1. Acquire Redis lock
  const locked = await acquireSlotLock(therapistId, utcSlot);
  if (!locked) {
    const err = new Error('This slot is currently being booked by another user. Please try again.');
    err.statusCode = 409;
    throw err;
  }

  try {
    // 2. Check for existing confirmed/pending booking for this slot (DB guard)
    const existing = await Booking.findOne({
      therapistId,
      slotStart: utcSlot,
      status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] },
    });

    if (existing) {
      const err = new Error('This slot is already booked.');
      err.statusCode = 409;
      throw err;
    }

    // 3. Verify therapist exists and is verified
    const therapist = await User.findById(therapistId).select('isVerified name').lean();
    if (!therapist || !therapist.isVerified) {
      const err = new Error('Therapist not found or not verified.');
      err.statusCode = 400;
      throw err;
    }

    // 4. Create booking
    const booking = await Booking.create({
      therapistId,
      patientId,
      slotStart: utcSlot,
      durationMinutes,
      timezone,
      notes,
      status: BOOKING_STATUS.CONFIRMED,
      meetingType,
      scheduledMode: SCHEDULED_MODE.SLOT_BOOKING,
      idempotencyKey: idempotencyKey || null,
    });

    logger.info({
      event: 'BOOKING_CREATED',
      bookingId: booking._id,
      therapistId,
      patientId,
      meetingType: booking.meetingType,
    });

    // 5. Invalidate slots cache for this therapist+date
    const dateStr = format(toZonedTime(utcSlot, timezone), 'yyyy-MM-dd', { timeZone: timezone });
    await cacheManager.invalidate(`slots:${therapistId}:${dateStr}`);

    // 6. Video meetings get a linked VideoCall + therapist-driven Assessment.
    let videoCall = null;
    let assessment = null;
    if (booking.meetingType === MEETING_TYPE.VIDEO) {
      const linked = await attachVideoCallAndAssessment(booking);
      videoCall = linked.videoCall;
      assessment = linked.assessment;
    }

    // 7. Notification: patient
    const isVideo = booking.meetingType === MEETING_TYPE.VIDEO;
    await addJob(JOB_NAMES.SEND_NOTIFICATION, {
      userId: patientId,
      title: isVideo ? 'Video Call Scheduled' : 'Booking Confirmed!',
      body: isVideo
        ? `Your video session with ${therapist.name || 'your therapist'} is scheduled.`
        : `Your session with ${therapist.name || 'your therapist'} is confirmed.`,
      type: isVideo
        ? NOTIFICATION_TYPES.VIDEO_CALL_SCHEDULED
        : NOTIFICATION_TYPES.BOOKING_CONFIRMED,
      data: {
        bookingId: String(booking._id),
        slotStart: utcSlot.toISOString(),
        ...(videoCall ? { videoCallId: String(videoCall._id) } : {}),
      },
    });

    // 8. Notification: therapist
    await addJob(JOB_NAMES.SEND_NOTIFICATION, {
      userId: therapistId,
      title: isVideo ? 'New Video Session' : 'New Booking',
      body: isVideo ? 'A new video session has been booked.' : 'A new session has been booked.',
      type: isVideo
        ? NOTIFICATION_TYPES.VIDEO_CALL_SCHEDULED
        : NOTIFICATION_TYPES.BOOKING_CONFIRMED,
      data: {
        bookingId: String(booking._id),
        ...(videoCall ? { videoCallId: String(videoCall._id) } : {}),
      },
    });

    return { booking, videoCall, assessment };
  } finally {
    // Always release the lock
    await releaseSlotLock(therapistId, utcSlot);
  }
}

/**
 * Get a booking by ID.
 * @param {string} bookingId
 */
async function getBooking(bookingId) {
  return Booking.findById(bookingId)
    .populate('therapistId', 'name specialty rating')
    .populate('patientId', 'name email')
    .lean();
}

/**
 * List bookings for a user (patient or therapist), cursor-paginated.
 * @param {object} filters
 */
async function listBookings({ userId, role, status, cursor, limit }) {
  const query = {};
  if (role === 'patient') query.patientId = userId;
  if (role === 'therapist') query.therapistId = userId;
  if (status) query.status = status;

  return paginate(Booking, query, {
    cursor,
    limit,
    sort: { slotStart: -1 },
    populate: (q) => q
      .populate('therapistId', 'name specialty')
      .populate('patientId', 'name'),
  });
}

/**
 * Cancel a booking.
 * @param {string} bookingId
 * @param {{ reason: string, cancelledBy: string }} options
 */
async function cancelBooking(bookingId, { reason, cancelledBy }) {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }
  if (booking.status === BOOKING_STATUS.CANCELLED) {
    const err = new Error('Booking is already cancelled');
    err.statusCode = 400;
    throw err;
  }
  if (booking.status === BOOKING_STATUS.COMPLETED) {
    const err = new Error('Cannot cancel a completed booking');
    err.statusCode = 400;
    throw err;
  }

  booking.status = BOOKING_STATUS.CANCELLED;
  booking.cancellationReason = reason || null;
  booking.cancelledAt = new Date();
  booking.cancelledBy = cancelledBy;
  await booking.save();

  // Invalidate slots cache
  const timezone = booking.timezone || 'Asia/Kolkata';
  const dateStr = format(toZonedTime(booking.slotStart, timezone), 'yyyy-MM-dd', { timeZone: timezone });
  await cacheManager.invalidate(`slots:${booking.therapistId}:${dateStr}`);

  // Notify patient
  await addJob('send_notification', {
    userId: String(booking.patientId),
    title: 'Booking Cancelled',
    body: reason ? `Your booking was cancelled: ${reason}` : 'Your booking has been cancelled.',
    type: NOTIFICATION_TYPES.BOOKING_CANCELLED,
    data: { bookingId: String(booking._id) },
  });

  logger.info({ event: 'BOOKING_CANCELLED', bookingId, cancelledBy });
  return booking;
}

/**
 * Mark a booking as completed.
 * @param {string} bookingId
 */
async function completeBooking(bookingId) {
  const booking = await Booking.findByIdAndUpdate(
    bookingId,
    { status: BOOKING_STATUS.COMPLETED, completedAt: new Date() },
    { new: true }
  );
  if (!booking) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }
  logger.info({ event: 'BOOKING_COMPLETED', bookingId });
  return booking;
}

/**
 * Patient requests an instant video call with a therapist they've previously
 * worked with. Booking sits in `instant_pending` until the therapist accepts
 * (turns into `confirmed`) or 5 minutes pass (cron flips to `instant_declined`).
 *
 * Validation gates (in order, each throws with .statusCode + .code):
 *   1) delay must be 15 or 30
 *   2) patient must have at least one prior CONFIRMED/COMPLETED booking with this therapist
 *   3) therapist must have availableNow=true
 *   4) patient must not already have an INSTANT_PENDING request anywhere
 */
async function createInstantBooking({
  therapistId, patientId, instantDelayMinutes, idempotencyKey,
}) {
  if (!INSTANT_DELAY_MINUTES.includes(Number(instantDelayMinutes))) {
    const err = new Error('Invalid instantDelayMinutes — must be 15 or 30');
    err.statusCode = 400;
    err.code = 'INVALID_DELAY';
    throw err;
  }

  // Idempotency short-circuit
  if (idempotencyKey) {
    const existing = await Booking.findOne({ idempotencyKey });
    if (existing) return { booking: existing, videoCall: null, assessment: null };
  }

  // Validation 1: prior patient↔therapist relationship
  const priorBooking = await Booking.findOne({
    patientId, therapistId,
    status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.COMPLETED] },
    isDeleted: false,
  }).select('_id').lean();
  if (!priorBooking) {
    const err = new Error('Instant calls are available only with therapists you have previously booked.');
    err.statusCode = 403;
    err.code = 'NO_PRIOR_RELATIONSHIP';
    throw err;
  }

  // Validation 2: therapist availableNow
  const therapist = await User.findById(therapistId).select('availableNow role name').lean();
  if (!therapist || therapist.role !== ROLES.THERAPIST || !therapist.availableNow) {
    const err = new Error('Therapist is not available for instant calls right now.');
    err.statusCode = 409;
    err.code = 'THERAPIST_NOT_AVAILABLE';
    throw err;
  }

  // Validation 3: no other pending instant request from this patient
  const pendingInstant = await Booking.findOne({
    patientId,
    status: BOOKING_STATUS.INSTANT_PENDING,
    isDeleted: false,
  }).select('_id').lean();
  if (pendingInstant) {
    const err = new Error('You already have a pending instant call request.');
    err.statusCode = 409;
    err.code = 'INSTANT_ALREADY_PENDING';
    throw err;
  }

  const now = new Date();
  const slotStart = new Date(now.getTime() + Number(instantDelayMinutes) * 60 * 1000);

  const booking = await Booking.create({
    therapistId, patientId,
    slotStart,
    durationMinutes: 30,
    timezone: 'Asia/Kolkata',
    status: BOOKING_STATUS.INSTANT_PENDING,
    meetingType: MEETING_TYPE.VIDEO,
    scheduledMode: SCHEDULED_MODE.INSTANT,
    instantDelayMinutes: Number(instantDelayMinutes),
    instantRequestedAt: now,
    instantExpiresAt: new Date(now.getTime() + INSTANT_REQUEST_TIMEOUT_MS),
    idempotencyKey: idempotencyKey || undefined,
  });

  logger.info({
    event: 'INSTANT_BOOKING_REQUESTED',
    bookingId: booking._id, therapistId, patientId, instantDelayMinutes,
  });

  // Notify therapist
  await addJob(JOB_NAMES.SEND_NOTIFICATION, {
    userId: therapistId,
    title: 'Instant Call Request',
    body: `A patient wants to start a video call in ${instantDelayMinutes} minutes.`,
    type: NOTIFICATION_TYPES.VIDEO_CALL_REQUESTED,
    data: {
      bookingId: String(booking._id),
      patientId: String(patientId),
      delayMinutes: String(instantDelayMinutes),
    },
  });

  return { booking, videoCall: null, assessment: null };
}

/**
 * Therapist accepts an instant call request.
 * Transitions INSTANT_PENDING → CONFIRMED and creates the linked
 * VideoCall + Assessment (same shape as a scheduled video booking).
 */
async function acceptInstantBooking({ bookingId, therapistId }) {
  const booking = await Booking.findOne({ _id: bookingId, isDeleted: false });
  if (!booking) {
    const e = new Error('Booking not found'); e.statusCode = 404; throw e;
  }
  if (String(booking.therapistId) !== String(therapistId)) {
    const e = new Error('Forbidden'); e.statusCode = 403; throw e;
  }
  if (booking.status !== BOOKING_STATUS.INSTANT_PENDING) {
    const e = new Error('Booking is not in instant_pending state'); e.statusCode = 409; throw e;
  }
  if (booking.instantExpiresAt && booking.instantExpiresAt < new Date()) {
    booking.status = BOOKING_STATUS.INSTANT_DECLINED;
    await booking.save();
    const e = new Error('Instant request has expired'); e.statusCode = 410; throw e;
  }

  booking.status = BOOKING_STATUS.CONFIRMED;
  await booking.save();

  const { videoCall, assessment } = await attachVideoCallAndAssessment(booking);

  logger.info({
    event: 'INSTANT_BOOKING_ACCEPTED',
    bookingId, therapistId, videoCallId: videoCall._id, assessmentId: assessment._id,
  });

  await addJob(JOB_NAMES.SEND_NOTIFICATION, {
    userId: String(booking.patientId),
    title: 'Therapist Accepted',
    body: 'Your therapist accepted the instant call.',
    type: NOTIFICATION_TYPES.VIDEO_CALL_SCHEDULED,
    data: {
      bookingId: String(booking._id),
      videoCallId: String(videoCall._id),
      scheduledAt: booking.slotStart.toISOString(),
    },
  });

  return { booking, videoCall, assessment };
}

/**
 * Therapist declines an instant call request.
 * Sets status to INSTANT_DECLINED and notifies the patient.
 */
async function declineInstantBooking({ bookingId, therapistId }) {
  const booking = await Booking.findOne({ _id: bookingId, isDeleted: false });
  if (!booking) {
    const e = new Error('Booking not found'); e.statusCode = 404; throw e;
  }
  if (String(booking.therapistId) !== String(therapistId)) {
    const e = new Error('Forbidden'); e.statusCode = 403; throw e;
  }
  if (booking.status !== BOOKING_STATUS.INSTANT_PENDING) {
    const e = new Error('Booking is not in instant_pending state'); e.statusCode = 409; throw e;
  }

  booking.status = BOOKING_STATUS.INSTANT_DECLINED;
  await booking.save();

  logger.info({ event: 'INSTANT_BOOKING_DECLINED', bookingId, therapistId });

  await addJob(JOB_NAMES.SEND_NOTIFICATION, {
    userId: String(booking.patientId),
    title: 'Instant Call Declined',
    body: 'Your therapist is not available right now. You can try booking a regular slot.',
    type: NOTIFICATION_TYPES.VIDEO_CALL_DECLINED,
    data: { bookingId: String(booking._id) },
  });

  return { booking };
}

module.exports = {
  listSlots,
  createBooking,
  getBooking,
  listBookings,
  cancelBooking,
  completeBooking,
  createInstantBooking,
  acceptInstantBooking,
  declineInstantBooking,
  // Exported for tests/consumers that need the snapshot logic directly.
  attachVideoCallAndAssessment,
  snapshotQuestionsForBodyPart,
};
