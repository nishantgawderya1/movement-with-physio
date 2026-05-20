/**
 * bookingService — therapist-facing bookings API surface.
 *
 * Every method returns { success: true, data, pagination? } or
 * { success: false, error } so screens don't branch on transport.
 */

import { apiClient } from '../lib/apiClient';

/**
 * GET /api/v1/bookings — list bookings for the authenticated therapist.
 * Server filters by status + meetingType when provided.
 *
 * @param {{ status?: string, meetingType?: string, cursor?: string, limit?: number }} [opts]
 * @returns {Promise<{ success: boolean, data?: Array, pagination?: Object, error?: string }>}
 */
export async function listBookings({ status, meetingType, cursor, limit = 20 } = {}) {
  var query = {};
  if (status) query.status = status;
  if (meetingType) query.meetingType = meetingType;
  if (cursor) query.cursor = cursor;
  if (limit) query.limit = String(limit);
  var response = await apiClient.get('/bookings', query);
  if (!response.success) {
    return { success: false, error: response.error || 'Failed to load bookings' };
  }
  // Backend returns paginated envelope at the top level via apiResponse.paginated:
  // { success, data: [...], pagination: { ... } }. apiClient surfaces .data;
  // pagination would live at response (peer of .data). Older endpoints just
  // return data, so fall back gracefully.
  return {
    success: true,
    data: Array.isArray(response.data) ? response.data : (response.data?.data || []),
    pagination: response.pagination || response.data?.pagination,
  };
}

/**
 * GET /api/v1/bookings/:id
 */
export async function getBooking(bookingId) {
  var response = await apiClient.get(`/bookings/${bookingId}`);
  if (!response.success) {
    return { success: false, error: response.error || 'Failed to load booking' };
  }
  return { success: true, data: response.data };
}

/**
 * POST /api/v1/bookings/:id/accept — therapist accepts an instant request.
 */
export async function acceptInstant(bookingId) {
  var response = await apiClient.post(`/bookings/${bookingId}/accept`, {});
  if (!response.success) {
    return { success: false, error: response.error || 'Failed to accept' };
  }
  return { success: true, data: response.data };
}

/**
 * POST /api/v1/bookings/:id/decline — therapist declines an instant request.
 */
export async function declineInstant(bookingId) {
  var response = await apiClient.post(`/bookings/${bookingId}/decline`, {});
  if (!response.success) {
    return { success: false, error: response.error || 'Failed to decline' };
  }
  return { success: true, data: response.data };
}

/**
 * PATCH /api/v1/bookings/:id/cancel — cancel an upcoming booking.
 */
export async function cancelBooking(bookingId, reason) {
  var response = await apiClient.patch(`/bookings/${bookingId}/cancel`, { reason });
  if (!response.success) {
    return { success: false, error: response.error || 'Failed to cancel' };
  }
  return { success: true, data: response.data };
}
