'use strict';

const bookingService = require('./booking.service');
const apiResponse = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');

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
 * Protected by: authMiddleware + rbac('patient') + idempotency
 */
const createBooking = asyncHandler(async (req, res) => {
  const { therapistId, slotStart, timezone, durationMinutes, notes } = req.body;
  const patientId = req.user._id || req.user.id;

  const booking = await bookingService.createBooking({
    therapistId,
    patientId,
    slotStart,
    timezone,
    durationMinutes,
    notes,
    idempotencyKey: req.headers['idempotency-key'],
  });

  return apiResponse.success(res, booking, 201);
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
    userId: req.user._id || req.user.id,
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

module.exports = { listSlots, createBooking, getBooking, listBookings, cancelBooking, completeBooking };
