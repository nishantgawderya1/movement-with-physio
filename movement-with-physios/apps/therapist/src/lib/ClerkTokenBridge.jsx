import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useAuth, useClerk } from '@clerk/clerk-expo';
import { tokenProvider } from './tokenProvider';
import { apiClient } from './apiClient';
import { chatSocket } from './chatSocket';

/**
 * Wait until tokenProvider.getToken() resolves to a non-null value, or until
 * `attempts` tries elapse (~3s total). Mitigates a race where Clerk reports
 * isSignedIn=true a few hundred ms before getToken() can return a JWT.
 *
 * @param {number} [attempts=15]
 * @param {number} [intervalMs=200]
 * @returns {Promise<string|null>}
 */
async function awaitToken(attempts = 15, intervalMs = 200) {
  for (let i = 0; i < attempts; i++) {
    const t = await tokenProvider.getToken();
    if (t) return t;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}

/**
 * ClerkTokenBridge — invisible component bridging Clerk auth to the plain-
 * module singletons (tokenProvider, apiClient, chatSocket).
 *
 * Mount once inside <ClerkProvider>. It:
 *   1. Registers Clerk's getToken with tokenProvider
 *   2. Fetches the therapist's Mongo _id once after sign-in
 *   3. Connects/disconnects the chat Socket.IO client on auth changes
 */
export default function ClerkTokenBridge() {
  const auth = useAuth();
  const { isSignedIn, isLoaded, getToken } = auth;
  const { signOut } = useClerk();

  useEffect(() => {
    tokenProvider.setTokenFetcher(() => getToken());
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;

    if (isSignedIn) {
      // Reset role/onboarding flags on every fresh sign-in. Without this, the
      // singleton retains stale values from the previous Clerk identity (e.g.
      // a returning user's onboardingCompleted=true bleeds into the next
      // sign-up's Bootstrap decision and skips PersonalInfo).
      tokenProvider.setSignedIn(true);
      tokenProvider.setReady(false);
      tokenProvider.setOnboardingCompleted(false);
      tokenProvider.setIsNewSignup(false);
      tokenProvider.setMyUserId(null);

      // Provision the Mongo User doc on first sign-in (idempotent), then
      // fetch the therapist profile to capture our Mongo _id +
      // onboardingCompleted flag. Only after both succeed do we mark the
      // bridge "ready" — the Bootstrap screen waits on this so Dashboard's
      // queries never race ahead of the User doc being created.
      (async () => {
        // Wait for Clerk to actually produce a JWT before hitting the API —
        // otherwise the first request goes out without an Authorization
        // header and the backend returns 401 'Unauthorized'.
        const tok = await awaitToken();
        if (cancelled) return;
        if (!tok) {
          // eslint-disable-next-line no-console
          console.warn('[ClerkTokenBridge] Clerk getToken never resolved; aborting init');
          tokenProvider.setReady(true);
          return;
        }

        const init = await apiClient.post('/auth/me/init', { role: 'therapist' });
        if (cancelled) return;
        if (!init.success) {
          // eslint-disable-next-line no-console
          console.warn('[ClerkTokenBridge] /auth/me/init failed:', init.status, init.error);
          // 409 = this email is already registered with a different role
          // (likely as a patient on the other app). One Clerk identity = one
          // role by design — show a clear message and sign the user out so
          // they can pick a different email.
          if (init.status === 409) {
            Alert.alert(
              'Email already in use',
              (init.error || 'This email is registered with a different role.') +
                '\n\nUse a different email to sign in to the therapist app.',
              [{ text: 'OK', onPress: () => { signOut().catch(() => {}); } }]
            );
            tokenProvider.setReady(true);
            return;
          }
          tokenProvider.setReady(true);
          return;
        }
        if (init.success && init.data && init.data.user) {
          tokenProvider.setMyUserId(String(init.data.user._id));
          tokenProvider.setOnboardingCompleted(!!init.data.user.onboardingCompleted);
          // isNew is true only on the very first /me/init for this Clerk
          // account. Bootstrap uses this to decide whether to drop the
          // user into onboarding (PersonalInfo) or skip straight to Dashboard.
          tokenProvider.setIsNewSignup(!!init.data.isNew);
        }
        const prof = await apiClient.get('/therapists/me/profile');
        if (cancelled) return;
        if (prof.success && prof.data && prof.data._id) {
          tokenProvider.setMyUserId(String(prof.data._id));
          tokenProvider.setOnboardingCompleted(!!prof.data.onboardingCompleted);
        }
        chatSocket.connect();
        tokenProvider.setReady(true);
      })();
    } else {
      // Full reset on sign-out — every per-user flag must go back to default
      // or it bleeds into whoever signs in next.
      tokenProvider.setSignedIn(false);
      tokenProvider.setReady(false);
      tokenProvider.setMyUserId(null);
      tokenProvider.setOnboardingCompleted(false);
      tokenProvider.setIsNewSignup(false);
      chatSocket.disconnect();
    }

    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn]);

  return null;
}
