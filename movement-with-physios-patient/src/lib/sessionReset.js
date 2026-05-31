/**
 * Hardened sign-out + persisted-session cleanup.
 *
 * @clerk/clerk-expo persists the session JWT in the tokenCache under
 * "__clerk_client_jwt" (createClerkInstance.js:43, saveToken at line 149) and
 * only clears it on a publishable-key change (line 60) — NEVER on signOut().
 * So a stale JWT can survive sign-out in SecureStore and re-hydrate a
 * signed-in client on the next launch. We clear it explicitly.
 *
 * ⚠️ VERSION-PINNED KEY — FRAGILE, RE-VERIFY ON EVERY clerk-expo BUMP ⚠️
 * "__clerk_client_jwt" is a PRIVATE internal of @clerk/clerk-expo 2.19.31 —
 * it is NOT an exported/public constant. If a clerk-expo upgrade renames it,
 * clearClerkSessionCache() will silently no-op (it deletes a key that no
 * longer exists): NO error, NO test failure — and the sign-out re-hydration
 * bug returns invisibly. On ANY @clerk/clerk-expo version change, re-verify
 * this constant against
 *   node_modules/@clerk/clerk-expo/dist/provider/singleton/createClerkInstance.js
 * (search for `const KEY =`) and update CLERK_TOKEN_CACHE_KEYS to match.
 */
import { tokenCache } from './tokenCache';

// Confirmed key(s) used by @clerk/clerk-expo 2.19.31's tokenCache integration.
// See the version-pin warning above before changing.
var CLERK_TOKEN_CACHE_KEYS = ['__clerk_client_jwt'];

/**
 * Remove the persisted Clerk session JWT(s) from the tokenCache. Best-effort
 * per key — never throws.
 * @returns {Promise<void>}
 */
export async function clearClerkSessionCache() {
  for (var i = 0; i < CLERK_TOKEN_CACHE_KEYS.length; i++) {
    try {
      await tokenCache.clearToken(CLERK_TOKEN_CACHE_KEYS[i]);
    } catch (e) {
      // best-effort; cache clear must not block sign-out
    }
  }
}

/**
 * Sign out of Clerk, THEN hard-clear the persisted session JWT so the next
 * launch can't re-hydrate a signed-in state. Clearing happens AFTER signOut()
 * resolves because Clerk's onAfterResponse re-saves the (signed-out) client
 * JWT — clearing first would be overwritten.
 *
 * Throws if signOut() throws. Callers MUST surface the error (a swallowed
 * failure leaves the user silently signed in).
 *
 * @param {() => Promise<void>} signOut - useClerk().signOut
 * @returns {Promise<void>}
 */
export async function hardSignOut(signOut) {
  await signOut();
  await clearClerkSessionCache();
}
