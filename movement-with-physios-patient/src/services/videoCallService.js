/**
 * videoCallService — REST surface for the /api/v1/video/calls/* endpoints.
 * Sockets live in src/lib/videoSocket.js, not here.
 *
 * Ported from movement-with-physios/apps/therapist/src/services/videoCallService.js
 *  — surface identical (patient and therapist hit the same endpoints).
 *  — patient role flipped to offerer in useVideoCall hook (Batch 2).
 *
 * Style matches movement-with-physios-patient/src/services/chatService.js
 * (pure functions, `var`, JSDoc).
 */

import { apiClient } from '../lib/apiClient';

/**
 * GET /api/v1/video/calls/:callId
 * Returns the enriched call view (participants, otherParty, canJoin,
 * assessmentMode hint).
 *
 * @param {string} callId
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function getCall(callId) {
  var response = await apiClient.get('/video/calls/' + callId);
  if (!response.success) {
    return { success: false, error: response.error || 'Failed to load call' };
  }
  return { success: true, data: response.data };
}

/**
 * POST /api/v1/video/calls/:callId/join
 * Records the participant's joinedAt, advances status, and returns the
 * ICE config payload inline ({ iceServers, ttlSeconds }).
 *
 * @param {string} callId
 * @returns {Promise<{ success: boolean, data?: { iceServers: Array, ttlSeconds: number }, error?: string }>}
 */
export async function joinCall(callId) {
  var response = await apiClient.post('/video/calls/' + callId + '/join', {});
  if (!response.success) {
    return { success: false, error: response.error || 'Failed to join call' };
  }
  return { success: true, data: response.data };
}

/**
 * POST /api/v1/video/calls/:callId/leave
 * Marks leftAt; idempotent — returns { alreadyEnded: true } if the call was
 * already terminated (e.g. via socket end_call).
 *
 * @param {string} callId
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function leaveCall(callId) {
  var response = await apiClient.post('/video/calls/' + callId + '/leave', {});
  if (!response.success) {
    return { success: false, error: response.error || 'Failed to leave call' };
  }
  return { success: true, data: response.data };
}

/**
 * GET /api/v1/video/ice-config — short-lived TURN credentials.
 * Used by the lobby's local preview where we don't want to register a
 * full /join yet.
 *
 * @returns {Promise<{ success: boolean, data?: { iceServers: Array, ttlSeconds: number }, error?: string }>}
 */
export async function getIceConfig() {
  var response = await apiClient.get('/video/ice-config');
  if (!response.success) {
    return { success: false, error: response.error || 'Failed to fetch ICE config' };
  }
  return { success: true, data: response.data };
}
