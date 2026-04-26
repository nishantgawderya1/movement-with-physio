'use strict';

const { zonedTimeToUtc, utcToZonedTime, format } = require('date-fns-tz');
const Booking = require('../../models/Booking.model');
const User = require('../../models/User.model');
const { getClient } = require('../../config/redis');
const cacheManager = require('../../core/cache/cacheManager');
const { addJob } = require('../../core/jobs/jobQueue');
const paginate = require('../../core/utils/paginator');
const { BOOKING_STATUS, NOTIFICATION_TYPES, REDIS_TTL } = require('../../core/utils/constants');
const logger = require('../../core/utils/logger');

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
  return zonedTimeToUtc(dateTimeStr, timezone);
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
    local: format(utcToZonedTime(utcSlot, timezone), 'yyyy-MM-dd HH:mm', { timeZone: timezone }),
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
  const { therapistId, patientId, slotStart, timezone, durationMinutes = 60, notes, idempotencyKey } = data;

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
      idempotencyKey: idempotencyKey || null,
    });

    logger.info({ event: 'BOOKING_CREATED', bookingId: booking._id, therapistId, patientId });

    // 5. Invalidate slots cache for this therapist+date
    const dateStr = format(utcToZonedTime(utcSlot, timezone), 'yyyy-MM-dd', { timeZone: timezone });
    await cacheManager.invalidate(`slots:${therapistId}:${dateStr}`);

    // 6. Enqueue notification for patient
    await addJob('send_notification', {
      userId: patientId,
      title: 'Booking Confirmed!',
      body: `Your session with ${therapist.name || 'your therapist'} is confirmed.`,
      type: NOTIFICATION_TYPES.BOOKING_CONFIRMED,
      data: { bookingId: String(booking._id), slotStart: utcSlot.toISOString() },
    });

    // 7. Notify therapist too
    await addJob('send_notification', {
      userId: therapistId,
      title: 'New Booking',
      body: `A new session has been booked.`,
      type: NOTIFICATION_TYPES.BOOKING_CONFIRMED,
      data: { bookingId: String(booking._id) },
    });

    return booking;
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
  const dateStr = format(utcToZonedTime(booking.slotStart, timezone), 'yyyy-MM-dd', { timeZone: timezone });
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

module.exports = {
  listSlots,
  createBooking,
  getBooking,
  listBookings,
  cancelBooking,
  completeBooking,
};
