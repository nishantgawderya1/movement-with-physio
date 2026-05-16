/**
 * Clerk token cache — Expo Go compatible.
 *
 * expo-secure-store's AES encryption module (ExpoCryptoAES) is only available
 * in native development builds, not Expo Go. This cache tries SecureStore first
 * and falls back to an in-memory Map so the app works in both environments.
 *
 * For production / development builds: SecureStore is used (fully secure).
 * For Expo Go testing: in-memory Map is used (session lost on app restart — acceptable for dev).
 */

// In-memory fallback
const memoryStore = new Map();

let SecureStore = null;
try {
  SecureStore = require('expo-secure-store');
} catch {
  // SecureStore native module not available (Expo Go)
}

async function getToken(key) {
  try {
    if (SecureStore) return await SecureStore.getItemAsync(key);
  } catch {}
  return memoryStore.get(key) ?? null;
}

async function saveToken(key, value) {
  try {
    if (SecureStore) { await SecureStore.setItemAsync(key, value); return; }
  } catch {}
  memoryStore.set(key, value);
}

async function clearToken(key) {
  try {
    if (SecureStore) { await SecureStore.deleteItemAsync(key); return; }
  } catch {}
  memoryStore.delete(key);
}

export const tokenCache = { getToken, saveToken, clearToken };
