'use strict';

const { Router } = require('express');
const controller = require('./booking.controller');
const authMiddleware = require('../../core/middleware/authMiddleware');
const rbac = require('../../core/middleware/rbac');
const idempotency = require('../../core/middleware/idempotency');
const validate = require('../../core/middleware/validate');
const auditLog = require('../../core/middleware/auditLog');
const { defaultLimiter } = require('../../core/middleware/rateLimiter');
const { createBookingSchema, cancelBookingSchema, listSlotsSchema } = require('./booking.validation');

const router = Router();

/**
 * @openapi
 * /api/v1/bookings/slots:
 *   get:
 *     tags: [Booking]
 *     summary: List available slots for a therapist on a given date
 *     security: []
 *     parameters:
 *       - in: query
 *         name: therapistId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: date
 *         required: true
 *         schema: { type: string, example: "2025-06-01" }
 *       - in: query
 *         name: timezone
 *         schema: { type: string, default: "Asia/Kolkata" }
 */
router.get('/slots', defaultLimiter, validate(listSlotsSchema, { source: 'query' }), controller.listSlots);

/**
 * @openapi
 * /api/v1/bookings:
 *   get:
 *     tags: [Booking]
 *     summary: List bookings for authenticated user (patient or therapist)
 *     security:
 *       - BearerAuth: []
 */
router.get('/', authMiddleware, rbac('patient', 'therapist', 'admin'), defaultLimiter, controller.listBookings);

/**
 * @openapi
 * /api/v1/bookings:
 *   post:
 *     tags: [Booking]
 *     summary: Create a booking (requires Idempotency-Key header)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema: { type: string }
 */
router.post(
  '/',
  authMiddleware,
  rbac('patient'),
  idempotency,
  validate(createBookingSchema),
  auditLog('CREATE_BOOKING', 'booking'),
  defaultLimiter,
  controller.createBooking
);

/**
 * @openapi
 * /api/v1/bookings/{id}:
 *   get:
 *     tags: [Booking]
 *     summary: Get booking by ID
 *     security:
 *       - BearerAuth: []
 */
router.get('/:id', authMiddleware, rbac('patient', 'therapist', 'admin'), defaultLimiter, controller.getBooking);

/**
 * @openapi
 * /api/v1/bookings/{id}/cancel:
 *   patch:
 *     tags: [Booking]
 *     summary: Cancel a booking
 *     security:
 *       - BearerAuth: []
 */
router.patch(
  '/:id/cancel',
  authMiddleware,
  rbac('patient', 'therapist', 'admin'),
  validate(cancelBookingSchema),
  auditLog('CANCEL_BOOKING', 'booking'),
  controller.cancelBooking
);

/**
 * @openapi
 * /api/v1/bookings/{id}/complete:
 *   patch:
 *     tags: [Booking]
 *     summary: Mark a booking as completed (therapist only)
 *     security:
 *       - BearerAuth: []
 */
router.patch(
  '/:id/complete',
  authMiddleware,
  rbac('therapist'),
  auditLog('COMPLETE_BOOKING', 'booking'),
  controller.completeBooking
);

module.exports = router;
