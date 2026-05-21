'use strict';

const bookingService = require('./booking.service');
const apiResponse = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const { resolveMongoUserId } = require('../../core/utils/resolveMongoUserId');

/**
 * GET /api/v1/bookings/slots
 * List available slots for a therapist on a given date.
 */
const listSlots = asyncHandler(async (req, res) => {
  const { therapistId, date, timezone, durationMinutes } = req.query;
  const slots = await bookingService.listSlots(
    therapistId,
    date,
    timezone || 'Asia/Kolkata',
    Number(durationMinutes) || 60
  );
  return apiResponse.success(res, slots);
});

/**
 * POST /api/v1/bookings
 * Create a new booking.
 * Protected by: authMiddleware + rbac('patient') + idempotency.
 *
 * Response shape:
 *   - in_person (default): backwards-compatible — returns the booking doc
 *     directly so existing patient-app code unwraps the same fields it
 *     always did. No videoCall or assessment keys are introduced.
 *   - video: returns { booking, videoCall, assessment } envelope — this is
 *     a NEW flow with no pre-existing client expecting the old shape.
 */
const createBooking = asyncHandler(async (req, res) => {
  const { therapistId, slotStart, timezone, durationMinutes, notes, meetingType } = req.body;
  const patientId = await resolveMongoUserId(req);

  const result = await bookingService.createBooking({
    therapistId,
    patientId,
    slotStart,
    timezone,
    durationMinutes,
    notes,
    meetingType,
    idempotencyKey: req.headers['idempotency-key'],
  });

  if (result.videoCall || result.assessment) {
    return apiResponse.success(res, result, 201);
  }
  return apiResponse.success(res, result.booking, 201);
});

/**
 * POST /api/v1/bookings/instant
 * Patient requests an instant video call.
 * Body: { therapistId, instantDelayMinutes }
 */
const requestInstantBooking = asyncHandler(async (req, res) => {
  const { therapistId, instantDelayMinutes } = req.body;
  const patientId = await resolveMongoUserId(req);
  const result = await bookingService.createInstantBooking({
    therapistId,
    patientId,
    instantDelayMinutes,
    idempotencyKey: req.headers['idempotency-key'],
  });
  return apiResponse.success(res, result, 201);
});

/**
 * POST /api/v1/bookings/:id/accept
 * Therapist accepts an instant call request.
 */
const acceptInstantBooking = asyncHandler(async (req, res) => {
  const therapistId = await resolveMongoUserId(req);
  const result = await bookingService.acceptInstantBooking({
    bookingId: req.params.id,
    therapistId,
  });
  return apiResponse.success(res, result);
});

/**
 * POST /api/v1/bookings/:id/decline
 * Therapist declines an instant call request.
 */
const declineInstantBooking = asyncHandler(async (req, res) => {
  const therapistId = await resolveMongoUserId(req);
  const result = await bookingService.declineInstantBooking({
    bookingId: req.params.id,
    therapistId,
  });
  return apiResponse.success(res, result);
});

/**
 * GET /api/v1/bookings/:id
 */
const getBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.getBooking(req.params.id);
  if (!booking) return apiResponse.error(res, 'Booking not found', 404, req.correlationId);
  return apiResponse.success(res, booking);
});

/**
 * GET /api/v1/bookings
 * List bookings for the authenticated user.
 */
const listBookings = asyncHandler(async (req, res) => {
  const { status, cursor, limit } = req.query;
  const result = await bookingService.listBookings({
    userId: await resolveMongoUserId(req),
    role: req.user.role,
    status,
    cursor,
    limit: Number(limit) || 20,
  });
  return apiResponse.paginated(res, result.data, result.pagination);
});

/**
 * PATCH /api/v1/bookings/:id/cancel
 */
const cancelBooking = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const booking = await bookingService.cancelBooking(req.params.id, {
    reason,
    cancelledBy: req.user.role,
  });
  return apiResponse.success(res, booking);
});

/**
 * PATCH /api/v1/bookings/:id/complete
 * Therapist marks a session as completed.
 */
const completeBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.completeBooking(req.params.id);
  return apiResponse.success(res, booking);
});

module.exports = {
  listSlots,
  createBooking,
  getBooking,
  listBookings,
  cancelBooking,
  completeBooking,
  requestInstantBooking,
  acceptInstantBooking,
  declineInstantBooking,
};
