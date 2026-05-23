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

/**
 * POST /api/v1/bookings/proposals — create a pending session proposal
 * to a patient (therapist-only). Backend gates on existing therapist↔
 * patient Booking relationship (S2 gate) and runs the 6-step conflict
 * matrix from P2.1 (slot-in-past, no-prior-relationship,
 * slot-conflict-therapist, duplicate-pending, slot-conflict-patient,
 * E11000-rollback).
 *
 * NOTE on idempotency: Idempotency-Key header is NOT sent here.
 * Therapist apiClient lacks the { idempotencyKey } option signature that
 * patient apiClient supports (see commit message). Race protection comes
 * from the DB-level partial unique index on { therapistId, slotStart,
 * status: 'pending' } from P1.3 — rapid double-tap returns the typed
 * PROPOSAL_DUPLICATE_PENDING error (409). P3.4's UI will additionally
 * debounce / disable-on-submit at the button layer.
 *
 * @param {{ patientId: string, slotStart: string, durationMinutes: 30|60, timezone: string, meetingType: 'video'|'in_person', notes?: string }} body
 * @returns {Promise<{ success: boolean, data?: { proposal: object }, error?: string }>}
 */
export async function createProposal(body) {
  var response = await apiClient.post('/bookings/proposals', body);
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
