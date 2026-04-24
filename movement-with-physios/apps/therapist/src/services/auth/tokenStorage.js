// ─────────────────────────────────────────────────────────────────────────────
// tokenStorage — Auth token persistence for Movement With Physios
//
// This file handles saving, reading, and clearing the JWT auth token.
// Currently uses an in-memory variable as a mock.
//
// Backend developer: replace the in-memory mock with expo-secure-store
// so tokens persist across app restarts and are stored securely on device.
//
// Install command:  npx expo install expo-secure-store
// ─────────────────────────────────────────────────────────────────────────────

// Mock in-memory storage (lost on app restart — intentional for development)
let _token = null;

/**
 * Save the auth token after successful login or registration.
 *
 * @param {string} token — JWT token string from the API
 * @returns {Promise<void>}
 */
export async function saveToken(token) {
  // TODO: Replace with expo-secure-store:
  // ─────────────────────────────────────
  // import * as SecureStore from 'expo-secure-store';
  // await SecureStore.setItemAsync('auth_token', token);
  // ─────────────────────────────────────

  _token = token;
  console.log('[tokenStorage] Token saved (in-memory mock)');
}

/**
 * Retrieve the stored auth token.
 *
 * @returns {Promise<string|null>} The stored token, or null if none exists
 */
export async function getToken() {
  // TODO: Replace with expo-secure-store:
  // ─────────────────────────────────────
  // import * as SecureStore from 'expo-secure-store';
  // return await SecureStore.getItemAsync('auth_token');
  // ─────────────────────────────────────

  return _token;
}

/**
 * Remove the stored auth token (used on logout).
 *
 * @returns {Promise<void>}
 */
export async function removeToken() {
  // TODO: Replace with expo-secure-store:
  // ─────────────────────────────────────
  // import * as SecureStore from 'expo-secure-store';
  // await SecureStore.deleteItemAsync('auth_token');
  // ─────────────────────────────────────

  _token = null;
  console.log('[tokenStorage] Token removed (in-memory mock)');
}
