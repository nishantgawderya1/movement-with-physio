/**
 * proposalService — patient-facing session-proposals API surface.
 *
 * Style mirrors src/services/bookingService.js: named apiClient import,
 * var declarations, JSDoc on every export, manual envelope unwrap, no
 * try/catch (apiClient never throws). Module-private
 * generateIdempotencyKey() helper duplicates the same fn from
 * bookingService.js — no shared util exists and duplicating a 10-line
 * helper keeps each service self-contained.
 *
 * NO createProposal here — that's a therapist-only operation (P3.3
 * implements it in the therapist app's mirror).
 */

import { apiClient } from '../lib/apiClient';

/**
 * Generate an Idempotency-Key for a write. Prefers crypto.randomUUID()
 * (available on RN 0.74+ Hermes); falls back to timestamp+random.
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
 * GET /api/v1/bookings/proposals — list pending proposals visible to
 * the patient. Backend filter: patient sees own pending non-expired only.
 *
 * @param {{ status?: string, cursor?: string, limit?: number }} [opts]
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
  var data = Array.isArray(response.data)
    ? response.data
    : (response.data && response.data.data) || [];
  var pagination = response.pagination || (response.data && response.data.pagination);
  return { success: true, data: data, pagination: pagination };
}

/**
 * POST /api/v1/bookings/proposals/:id/accept — patient accepts a
 * pending proposal. Backend atomically claims the row, acquires a
 * slot-lock, creates a Booking (with idempotencyKey = `proposal:${id}`),
 * and returns { proposal, booking }. Race losers get
 * PROPOSAL_ALREADY_RESPONDED 409.
 *
 * Idempotency-Key header is sent so a retried network failure does not
 * double-submit at the middleware layer (DB layer is also protected via
 * the unique sparse index on Booking.idempotencyKey from P2.2). Header
 * lives in the apiClient { idempotencyKey } option (patient apiClient
 * supports this natively; therapist apiClient does not — see therapist
 * proposalService for the asymmetry note).
 *
 * @param {string} proposalId
 * @returns {Promise<{ success: boolean, data?: { proposal: object, booking: object }, error?: string }>}
 */
export async function acceptProposal(proposalId) {
  var response = await apiClient.post(
    '/bookings/proposals/' + proposalId + '/accept',
    {},
    { idempotencyKey: generateIdempotencyKey() }
  );
  if (!response.success) {
    return { success: false, error: response.error || 'Failed to accept proposal' };
  }
  return { success: true, data: response.data };
}

/**
 * POST /api/v1/bookings/proposals/:id/decline — patient declines a
 * pending proposal with an optional reason (free text; backend clamps
 * to 500 chars).
 *
 * IMPORTANT: the reason persists on the proposal doc but NEVER appears
 * in the therapist's push body — S-followup-6 lockdown enforces this at
 * the notification dispatch layer. Reason is only visible to the
 * therapist via the proposal-detail view (P3.5).
 *
 * @param {string} proposalId
 * @param {string?} reason
 * @returns {Promise<{ success: boolean, data?: { proposal: object }, error?: string }>}
 */
export async function declineProposal(proposalId, reason) {
  var body = { reason: reason || null };
  var response = await apiClient.post(
    '/bookings/proposals/' + proposalId + '/decline',
    body,
    { idempotencyKey: generateIdempotencyKey() }
  );
  if (!response.success) {
    return { success: false, error: response.error || 'Failed to decline proposal' };
  }
  return { success: true, data: response.data };
}
