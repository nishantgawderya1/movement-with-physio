/**
 * AuthService.js
 *
 * AUTHENTICATION ABSTRACTION LAYER
 * ─────────────────────────────────────────────────────────────────────────────
 * PURPOSE:
 * This is the ONLY file that will communicate with Clerk.
 * Screens must never import @clerk/expo directly.
 * All authentication actions go through this service.
 *
 * WHY THIS MATTERS:
 * If the auth provider changes (Clerk → Firebase, custom API, etc.),
 * only this file changes — not every screen in the app.
 *
 * CURRENT STATE: All methods are stubs. No Clerk installed yet.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * BACKEND ENGINEER — INTEGRATION STEPS:
 *
 * 1. Run: npx expo install @clerk/expo expo-secure-store expo-web-browser expo-auth-session
 * 2. Add to .env.local: EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
 * 3. Create src/lib/tokenCache.js (see comment on getSessionToken below)
 * 4. Wrap App.jsx with <ClerkProvider publishableKey={...} tokenCache={tokenCache}>
 * 5. Replace each stub method below with the real Clerk implementation shown
 *    in each method's JSDoc comment
 * 6. Update RootNavigator.jsx to use isAuthenticated() for session-based routing
 * ─────────────────────────────────────────────────────────────────────────────
 */

const AuthService = {

  /**
   * Check if user has an active session.
   * @returns {boolean}
   *
   * BACKEND ENGINEER — Replace with:
   *   Must be called from inside a React component or context.
   *   const { isSignedIn } = useAuth()  ← from @clerk/expo
   *   Or expose a reactive session value via React Context.
   */
  isAuthenticated: () => {
    // TODO: Return real Clerk session state
    return false;
  },

  /**
   * Send OTP to a phone number.
   * @param {string} phoneNumber - E.164 format e.g. "+61412345678"
   * @returns {Promise<{ success: boolean, phoneNumberId?: string }>}
   *
   * BACKEND ENGINEER — Replace with:
   *   const { signIn } = useSignIn()  ← from @clerk/expo
   *   await signIn.create({ identifier: phoneNumber })
   *   const factor = signIn.supportedFirstFactors.find(f => f.strategy === 'phone_code')
   *   await signIn.prepareFirstFactor({ strategy: 'phone_code', phoneNumberId: factor.phoneNumberId })
   *   return { success: true, phoneNumberId: factor.phoneNumberId }
   */
  sendOtp: async (phoneNumber) => {
    console.warn('[AuthService] sendOtp() called — stub. Replace with Clerk.');
    return { success: true };
  },

  /**
   * Verify OTP code entered by user.
   * @param {string} code - 6-digit OTP code
   * @returns {Promise<{ success: boolean, sessionId?: string }>}
   *
   * BACKEND ENGINEER — Replace with:
   *   const result = await signIn.attemptFirstFactor({ strategy: 'phone_code', code })
   *   if (result.status === 'complete') {
   *     await setActive({ session: result.createdSessionId })
   *     return { success: true, sessionId: result.createdSessionId }
   *   }
   *   return { success: false }
   */
  verifyOtp: async (code) => {
    console.warn('[AuthService] verifyOtp() called — stub. Replace with Clerk.');
    return { success: true, sessionId: 'stub-session' };
  },

  /**
   * Sign out the current user and clear session.
   * @returns {Promise<void>}
   *
   * BACKEND ENGINEER — Replace with:
   *   const { signOut } = useAuth()  ← from @clerk/expo
   *   await signOut()
   */
  signOut: async () => {
    console.warn('[AuthService] signOut() called — stub. Replace with Clerk.');
  },

  /**
   * Get the current authenticated user's profile.
   * @returns {object|null}
   *
   * BACKEND ENGINEER — Replace with:
   *   const { user } = useUser()  ← from @clerk/expo
   *   return user
   */
  getCurrentUser: () => {
    return null;
  },

  /**
   * Get JWT token for authenticated API requests.
   * @returns {Promise<string|null>}
   *
   * BACKEND ENGINEER — Replace with:
   *   const { getToken } = useAuth()  ← from @clerk/expo
   *   return await getToken()
   *
   * TOKEN CACHE SETUP (create src/lib/tokenCache.js):
   *   import * as SecureStore from 'expo-secure-store'
   *   export const tokenCache = {
   *     async getToken(key) { return SecureStore.getItemAsync(key) },
   *     async saveToken(key, value) { return SecureStore.setItemAsync(key, value) },
   *   }
   */
  getSessionToken: async () => {
    return null;
  },

};

export default AuthService;
