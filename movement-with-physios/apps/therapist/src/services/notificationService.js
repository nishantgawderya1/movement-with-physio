/**
 * notificationService — push notification permission, token registration,
 * and clear flow for the therapist app. Backs the session-proposals feature:
 * therapist receives PROPOSAL_ACCEPTED / PROPOSAL_DECLINED pushes when the
 * patient responds. Tap-to-open only on this side — no action buttons
 * (those live on the patient app via the PROPOSAL iOS notification
 * category, registered in P4.2).
 *
 * Style mirrors src/services/videoCallService.js: var declarations, named
 * exports, { success, data?, error? } envelope returned from every call.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { apiClient } from '../lib/apiClient';

/**
 * Request notification permission from the user. Idempotent — returns
 * the existing grant if already granted; only prompts if undetermined.
 *
 * @returns {Promise<{ success: boolean, data?: { status: string }, error?: string }>}
 */
export async function requestPermissions() {
  if (!Device.isDevice) {
    return { success: false, error: 'Push notifications only work on physical devices' };
  }
  var existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') {
    return { success: true, data: { status: 'granted' } };
  }
  var asked = await Notifications.requestPermissionsAsync();
  if (asked.status === 'granted') {
    return { success: true, data: { status: asked.status } };
  }
  return { success: false, error: 'Permission ' + asked.status };
}

/**
 * Fetch the Expo push token and register it with the backend via
 * PATCH /api/v1/users/me/fcm-token (endpoint from P1.1 c8898e7).
 *
 * Call AFTER Clerk sign-in completes — apiClient relies on
 * tokenProvider.getToken() which can only mint a JWT once Clerk has an
 * active session. Idempotent: the backend diff-writes when the token is
 * unchanged so calling this on every cold-start is cheap.
 *
 * EAS projectId is intentionally NOT passed — neither app.json nor
 * app.config.js carries an expo.extra.eas.projectId yet. Expo's default
 * project resolution applies. If this fails at runtime (we'll see it on
 * the first P5 device test), provision EAS and pass { projectId: ... }.
 *
 * @returns {Promise<{ success: boolean, data?: { token: string, updated: boolean }, error?: string }>}
 */
export async function registerPushToken() {
  if (!Device.isDevice) {
    return { success: false, error: 'Cannot register push token on simulator' };
  }
  var perm = await requestPermissions();
  if (!perm.success) return perm;

  var token;
  try {
    var tokenResp = await Notifications.getExpoPushTokenAsync();
    token = tokenResp.data;
  } catch (err) {
    var msg = (err && err.message) ? err.message : String(err);
    return { success: false, error: 'Failed to fetch push token: ' + msg };
  }

  var resp = await apiClient.patch('/users/me/fcm-token', { fcmToken: token });
  if (!resp.success) {
    return { success: false, error: 'Failed to register token with backend: ' + (resp.error || 'unknown error') };
  }
  return {
    success: true,
    data: { token: token, updated: !!(resp.data && resp.data.updated) },
  };
}

/**
 * Clear the registered token on sign-out. Best-effort — failure does not
 * block the sign-out flow.
 *
 * MUST be called BEFORE Clerk's signOut(): once Clerk signs out,
 * tokenProvider.getToken() returns null and the PATCH would 401.
 *
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function clearPushToken() {
  var resp = await apiClient.patch('/users/me/fcm-token', { fcmToken: null });
  if (!resp.success) {
    return { success: false, error: resp.error || 'Failed to clear token' };
  }
  return { success: true };
}
