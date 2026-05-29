/**
 * scheduleService — therapist recurring-weekly availability.
 * Wraps GET + PUT /api/v1/therapists/me/availability. Style mirrors
 * proposalService.js / bookingService.js: named apiClient import,
 * var declarations, JSDoc on every export, manual envelope unwrap, no
 * try/catch (apiClient never throws — returns a shaped envelope always).
 */

import { apiClient } from '../lib/apiClient';

/**
 * GET /api/v1/therapists/me/availability — fetch the authenticated
 * therapist's recurring weekly availability. Backend returns
 * { windows: [], timezone: 'Asia/Kolkata' } when no doc exists yet,
 * so the success branch always has a usable shape.
 *
 * @returns {Promise<{ success: boolean, data?: { windows: Array<{dayOfWeek:number,startMinute:number,endMinute:number}>, timezone: string }, error?: string }>}
 */
export async function getAvailability() {
  var response = await apiClient.get('/therapists/me/availability');
  if (!response.success) {
    return { success: false, error: response.error || 'Failed to load availability' };
  }
  return { success: true, data: response.data };
}

/**
 * PUT /api/v1/therapists/me/availability — replace the authenticated
 * therapist's recurring weekly availability (server upserts one doc per
 * therapist). Backend validates dayOfWeek 0..6, startMinute/endMinute
 * 0..1439 with endMinute > startMinute, ≤20 windows, no overlap on the
 * same dayOfWeek. Backend also busts the per-day slots cache so the
 * patient slot grid reflects the change immediately.
 *
 * @param {{ windows: Array<{dayOfWeek:number,startMinute:number,endMinute:number}>, timezone?: string }} body
 * @returns {Promise<{ success: boolean, data?: { windows: Array, timezone: string }, error?: string }>}
 */
export async function updateAvailability(body) {
  var response = await apiClient.put('/therapists/me/availability', body);
  if (!response.success) {
    return { success: false, error: response.error || 'Failed to save availability' };
  }
  return { success: true, data: response.data };
}
