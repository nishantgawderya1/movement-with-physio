/**
 * availabilityService — therapist instant-call availability toggle.
 * Backed by PATCH /api/v1/therapists/me/instant-availability (the new
 * endpoint added in Phase 2B; distinct from the existing
 * PUT /me/availability which manages slot scheduling).
 */

import { apiClient } from '../lib/apiClient';

/**
 * Toggle the authenticated therapist's `availableNow` flag.
 * Backend also enqueues a 2-hour auto-clear job when turning ON so the
 * flag won't stay set forever if the therapist forgets.
 *
 * @param {boolean} availableNow
 * @returns {Promise<{ success: boolean, data?: { availableNow: boolean, availableNowSince: string|null }, error?: string }>}
 */
export async function toggleAvailability(availableNow) {
  var response = await apiClient.patch(
    '/therapists/me/instant-availability',
    { availableNow: !!availableNow }
  );
  if (!response.success) {
    return { success: false, error: response.error || 'Failed to toggle availability' };
  }
  return { success: true, data: response.data };
}
