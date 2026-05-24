/**
 * proposalService — therapist-facing session-proposals API surface.
 *
 * Style mirrors src/services/bookingService.js: named apiClient import,
 * var declarations, JSDoc on every export, manual envelope unwrap, no
 * try/catch (apiClient never throws — returns shaped
 * { success, data?, error?, status? } always).
 *
 * NO acceptProposal / declineProposal here — those are patient-only
 * operations (P4.3 implements them in the patient app's mirror).
 */

import { apiClient } from '../lib/apiClient';

// Module-private — mirrors patient app's generateIdempotencyKey helper.
// crypto.randomUUID is available on RN 0.81+ via the JSI bridge; fallback
// is sufficient as a client-side dedup token (not security-sensitive).
function generateIdempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/**
 * POST /api/v1/bookings/proposals — create a pending session proposal
 * to a patient (therapist-only). Backend gates on existing therapist↔
 * patient Booking relationship (S2 gate) and runs the 6-step conflict
 * matrix from P2.1 (slot-in-past, no-prior-relationship,
 * slot-conflict-therapist, duplicate-pending, slot-conflict-patient,
 * E11000-rollback).
 *
 * Idempotency-Key header is generated per call. Backend idempotency
 * middleware replays the same response for retries with the same key
 * (true idempotency semantics). UI-layer debounce in P3.4 remains the
 * first line against rapid double-tap; DB partial unique index on
 * { therapistId, slotStart, status: 'pending' } from P1.3 is the
 * backstop for collisions across separate keys.
 *
 * @param {{ patientId: string, slotStart: string, durationMinutes: 30|60, timezone: string, meetingType: 'video'|'in_person', notes?: string }} body
 * @returns {Promise<{ success: boolean, data?: { proposal: object }, error?: string }>}
 */
export async function createProposal(body) {
  var response = await apiClient.post(
    '/bookings/proposals',
    body,
    { headers: { 'Idempotency-Key': generateIdempotencyKey() } }
  );
  if (!response.success) {
    return { success: false, error: response.error || 'Failed to create proposal' };
  }
  return { success: true, data: response.data };
}

/**
 * GET /api/v1/bookings/proposals — list proposals visible to the
 * therapist: own pending + own declined-within-24h (backend applies
 * the $or filter; this client only forwards optional filters).
 *
 * @param {{ status?: 'pending'|'declined', cursor?: string, limit?: number }} [opts]
 * @returns {Promise<{ success: boolean, data?: Array, pagination?: object, error?: string }>}
 */
export async function listProposals(opts) {
  var options = opts || {};
  var query = {};
  if (options.status) query.status = options.status;
  if (options.cursor) query.cursor = options.cursor;
  if (options.limit) query.limit = String(options.limit);

  var response = await apiClient.get('/bookings/proposals', query);
  if (!response.success) {
    return { success: false, error: response.error || 'Failed to load proposals' };
  }
  // Backend returns the paginated envelope at the top level via
  // apiResponse.paginated: { success, data: [...], pagination: { ... } }.
  // apiClient surfaces .data; pagination is a peer on the envelope.
  // Some older endpoints just return data, so fall back gracefully —
  // matches bookingService.listBookings shape.
  var data = Array.isArray(response.data)
    ? response.data
    : (response.data && response.data.data) || [];
  var pagination = response.pagination || (response.data && response.data.pagination);
  return { success: true, data: data, pagination: pagination };
}

/**
 * DELETE /api/v1/bookings/proposals/:id — therapist cancels a pending
 * proposal. Backend atomically claims the row, sets status to
 * cancelled_by_therapist, and fires NO notification to the patient
 * (intent: silent cancellation; the patient never learns the proposal
 * existed if they hadn't seen the original push yet).
 *
 * apiClient method is `del`, not `delete` — the latter is a JS reserved
 * word so the apiClient export shortened it.
 *
 * @param {string} proposalId
 * @returns {Promise<{ success: boolean, data?: { proposal: object }, error?: string }>}
 */
export async function cancelProposal(proposalId) {
  var response = await apiClient.del('/bookings/proposals/' + proposalId);
  if (!response.success) {
    return { success: false, error: response.error || 'Failed to cancel proposal' };
  }
  return { success: true, data: response.data };
}
