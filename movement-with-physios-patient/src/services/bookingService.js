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
