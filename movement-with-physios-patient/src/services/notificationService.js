/**
 * notificationService — push notification permission, token registration,
 * PROPOSAL iOS category registration, and clear flow for the patient app.
 *
 * Backs the session-proposals feature: backend sends a PROPOSAL_RECEIVED
 * push with apns.category='PROPOSAL' (from P1.2 + P2.1) so the iOS Accept
 * and Decline action buttons render in the push itself. The PROPOSAL
 * category MUST be registered at app startup for those buttons to appear
 * — without it, the push renders as a plain notification with no actions.
 *
 * Style mirrors src/services/videoCallService.js: var declarations, named
 * exports, { success, data?, error? } envelope returned from every call.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
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
 * active session. For new users, Clerk's session activates at the end
 * of OnboardingCompleteScreen so this hook satisfies the locked decision
 * "request permission only after onboarding completes" without special-
 * casing. Idempotent: the backend diff-writes on no-change so calling on
 * every cold-start is cheap.
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

/**
 * Register the PROPOSAL iOS notification category with Accept/Decline
 * action buttons. Call at app startup in a useEffect on first render —
 * iOS persists category registration across launches but registering
 * defensively on every cold-start is cheap and ensures the buttons
 * always render even if the user reinstalled or system state drifted.
 *
 * CRITICAL contract: the identifier 'PROPOSAL' MUST match the backend's
 * NOTIFICATION_CATEGORIES.PROPOSAL constant (P1.2). The backend threads
 * apns.payload.aps.category='PROPOSAL' through the FCM payload; without
 * this registration on the device, iOS renders the push as plain text
 * with no action buttons. The action identifiers ('ACCEPT_PROPOSAL' and
 * 'DECLINE_PROPOSAL') are consumed by the response listener in App.jsx
 * — keep them in sync if either side changes.
 *
 * Android handles action buttons via a different mechanism (Notification
 * Channels) — out of scope for v1; iOS-only.
 *
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function registerProposalCategory() {
  if (Platform.OS !== 'ios') {
    return { success: true };
  }
  try {
    await Notifications.setNotificationCategoryAsync('PROPOSAL', [
      {
        identifier: 'ACCEPT_PROPOSAL',
        buttonTitle: 'Accept',
        options: {
          opensAppToForeground: true,
          isAuthenticationRequired: false,
          isDestructive: false,
        },
      },
      {
        identifier: 'DECLINE_PROPOSAL',
        buttonTitle: 'Decline',
        options: {
          opensAppToForeground: true,
          isAuthenticationRequired: false,
          isDestructive: true,
        },
      },
    ]);
    return { success: true };
  } catch (err) {
    var msg = (err && err.message) ? err.message : String(err);
    return { success: false, error: 'Failed to register PROPOSAL category: ' + msg };
  }
}
