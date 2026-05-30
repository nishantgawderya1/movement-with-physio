/**
 * bookingService — patient-facing bookings API surface.
 *
 * Ported from movement-with-physios/apps/therapist/src/services/bookingService.js
 *  — patient subset: no accept/decline (therapist-only). Adds
 *    requestInstantCall which the therapist app does not need.
 *  — patient role flipped to offerer in useVideoCall hook (Batch 2).
 *
 * Style mirrors movement-with-physios-patient/src/services/chatService.js —
 * pure functions, no class, no module-level state, `var` declarations, JSDoc
 * on every exported function. All methods return the project envelope:
 *   { success: true, data, pagination? } or { success: false, error }
 *
 * Auth: apiClient attaches the current Clerk session token automatically.
 */

import { apiClient } from '../lib/apiClient';

/**
 * Generate an Idempotency-Key for a write. Prefers crypto.randomUUID()
 * (available on RN 0.74+ Hermes); falls back to a timestamp+random string
 * if the runtime does not expose it.
 *
 * @returns {string}
 */
function generateIdempotencyKey() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch (e) {
    // fall through
  }
  return 'idem-' + Date.now() + '-' + Math.random().toString(36).slice(2, 12);
}

/**
 * GET /api/v1/bookings — list bookings for the authenticated patient.
 * Server filters by status when provided. Pagination is cursor-based.
 *
 * @param {{ status?: string, cursor?: string, limit?: number }} [opts]
 * @returns {Promise<{ success: boolean, data?: Array, pagination?: Object, error?: string }>}
 */
export async function listBookings(opts) {
  var options = opts || {};
  var query = {};
  if (options.status) query.status = options.status;
  if (options.cursor) query.cursor = options.cursor;
  if (options.limit) query.limit = String(options.limit);

  var response = await apiClient.get('/bookings', query);
  if (!response.success) {
    return { success: false, error: response.error || 'Failed to load bookings' };
  }
  // Backend returns paginated envelope via apiResponse.paginated:
  //   { success, data: [...], pagination: { ... } }
  // apiClient unwraps .data; pagination is a peer of .data on the envelope.
  // Some older endpoints just return data, so fall back gracefully.
  var data = Array.isArray(response.data)
    ? response.data
    : (response.data && response.data.data) || [];
  var pagination = response.pagination || (response.data && response.data.pagination);
  return { success: true, data: data, pagination: pagination };
}

/**
 * GET /api/v1/bookings/:id — fetch a single booking by id.
 *
 * @param {string} bookingId
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function getBooking(bookingId) {
  var response = await apiClient.get('/bookings/' + bookingId);
  if (!response.success) {
    return { success: false, error: response.error || 'Failed to load booking' };
  }
  return { success: true, data: response.data };
}

/**
 * GET /api/v1/bookings/slots — list bookable 30-min slots for a therapist
 * on a given date. Public endpoint (no auth required server-side, but the
 * patient flow only calls this post-login). Backend returns
 *   { success: true, data: [{ utc, local, available }] }
 * where utc is an ISO 8601 instant and local is "YYYY-MM-DD HH:mm" in the
 * therapist's timezone. Empty array means no slots (past date, no
 * availability doc, no windows, or all slots booked / past lead time).
 *
 * @param {{ therapistId: string, date: string, timezone?: string }} args
 *   date: 'YYYY-MM-DD' interpreted in the therapist's tz (defaults to
 *   Asia/Kolkata server-side if `timezone` omitted)
 * @returns {Promise<{ success: boolean, data?: Array<{utc:string, local:string, available:boolean}>, error?: string }>}
 */
export async function getSlots(args) {
  var params = args || {};
  var query = { therapistId: params.therapistId, date: params.date };
  if (params.timezone) query.timezone = params.timezone;
  var response = await apiClient.get('/bookings/slots', query);
  if (!response.success) {
    return { success: false, error: response.error || 'Failed to load slots' };
  }
  // Coerce defensively: backend should always send an array, but unwrap-as-empty
  // protects callers from a transport-layer shape surprise.
  var data = Array.isArray(response.data) ? response.data : [];
  return { success: true, data: data };
}

/**
 * POST /api/v1/bookings — create a scheduled video booking for the
 * authenticated patient.
 *
 * Server-side guards (booking.routes.js): authMiddleware + rbac('patient') +
 * Joi createBookingSchema + idempotency. Idempotency-Key is required by the
 * server; we mint a fresh UUID per call so a transport-layer retry cannot
 * double-book.
 *
 * Patient flow always books video — patient app does not expose in_person.
 * Duration defaults to 30 minutes to match the slot grid.
 *
 * Backend returns either { booking, videoCall, assessment } for video
 * bookings (booking.controller.js createBooking) — apiClient unwraps to
 * response.data.
 *
 * Failure shape preserves response.status so the UI can distinguish 409
 * (slot taken — refetch + reselect) from other errors (banner only).
 *
 * @param {{
 *   therapistId: string,
 *   slotStart: string,       // ISO 8601 instant (UTC), e.g. slot.utc from getSlots
 *   timezone?: string,       // defaults to 'Asia/Kolkata'
 *   durationMinutes?: number,// defaults to 30
 *   meetingType?: string,    // defaults to 'video'
 *   notes?: string,
 *   idempotencyKey?: string,
 * }} args
 * @returns {Promise<{ success: boolean, data?: object, error?: string, status?: number }>}
 */
export async function createBooking(args) {
  var params = args || {};
  var body = {
    therapistId: params.therapistId,
    slotStart: params.slotStart,
    timezone: params.timezone || 'Asia/Kolkata',
    durationMinutes: params.durationMinutes || 30,
    meetingType: params.meetingType || 'video',
  };
  if (params.notes) body.notes = params.notes;
  var idempotencyKey = params.idempotencyKey || generateIdempotencyKey();

  var response = await apiClient.post('/bookings', body, {
    idempotencyKey: idempotencyKey,
  });
  if (!response.success) {
    return {
      success: false,
      error: response.error || 'Failed to create booking',
      status: response.status,
    };
  }
  return { success: true, data: response.data };
}

/**
 * POST /api/v1/bookings/instant — patient requests an instant video call.
 *
 * Server-side guards (booking.routes.js): authMiddleware + rbac('patient') +
 * idempotency. The Idempotency-Key header is REQUIRED — if the caller does
 * not provide one, we mint a fresh UUID so a retried network failure does
 * not double-charge or double-book.
 *
 * Response envelope from the server (booking.controller.js requestInstantBooking):
 *   { booking, videoCall, assessment }
 *
 * @param {{
 *   therapistId: string,
 *   instantDelayMinutes: 15 | 30,
 *   idempotencyKey?: string
 * }} args
 * @returns {Promise<{ success: boolean, data?: { booking: object, videoCall: object, assessment?: object }, error?: string }>}
 */
export async function requestInstantCall(args) {
  var params = args || {};
  var body = {
    therapistId: params.therapistId,
    instantDelayMinutes: params.instantDelayMinutes,
  };
  var idempotencyKey = params.idempotencyKey || generateIdempotencyKey();

  var response = await apiClient.post('/bookings/instant', body, {
    idempotencyKey: idempotencyKey,
  });
  if (!response.success) {
    return { success: false, error: response.error || 'Failed to request instant call' };
  }
  return { success: true, data: response.data };
}

/**
 * PATCH /api/v1/bookings/:id/cancel — cancel a booking (patient-initiated).
 * Used from WaitingForTherapistScreen when the patient bails out of an
 * instant request before the therapist accepts.
 *
 * @param {string} bookingId
 * @param {string} [reason]
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function cancelBooking(bookingId, reason) {
  var response = await apiClient.patch('/bookings/' + bookingId + '/cancel', { reason: reason }, {});
  if (!response.success) {
    return { success: false, error: response.error || 'Failed to cancel booking' };
  }
  return { success: true, data: response.data };
}
