import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useAuth, useClerk } from '@clerk/clerk-expo';
import { tokenProvider } from './tokenProvider';
import { apiClient } from './apiClient';
import { chatSocket } from './chatSocket';
import { registerPushToken } from '../services/notificationService';
import { consumePending as consumePendingOnboarding } from './pendingOnboarding';

/**
 * Wait until tokenProvider.getToken() resolves to a non-null value, or
 * give up after ~3 seconds. Mitigates the race where Clerk reports
 * isSignedIn=true a few hundred ms before getToken() can mint a JWT.
 * @returns {Promise<string|null>}
 */
async function awaitToken() {
  for (var i = 0; i < 15; i++) {
    var t = await tokenProvider.getToken();
    if (t) return t;
    await new Promise(function (r) { setTimeout(r, 200); });
  }
  return null;
}

/**
 * ClerkTokenBridge — invisible component that bridges Clerk auth state to
 * the plain-module singletons (tokenProvider, apiClient, chatSocket).
 *
 * Must be mounted exactly once, inside <ClerkProvider>. It:
 *   1. Registers Clerk's getToken with tokenProvider
 *   2. Fetches the user's Mongo _id once after sign-in (so chatService can
 *      distinguish "my" messages)
 *   3. Connects/disconnects the chat Socket.IO client on auth state changes
 *
 * Works identically in Expo Go and native builds.
 *
 * @returns {null}
 */
export default function ClerkTokenBridge() {
  var auth = useAuth();
  var isSignedIn = auth.isSignedIn;
  var isLoaded = auth.isLoaded;
  var getToken = auth.getToken;
  var clerk = useClerk();

  // Register getToken with the provider on every render so the closure stays
  // fresh (Clerk recreates getToken when session changes).
  useEffect(function () {
    tokenProvider.setTokenFetcher(function () { return getToken(); });
  }, [getToken]);

  // React to sign-in / sign-out transitions.
  useEffect(function () {
    if (!isLoaded) return;

    var cancelled = false;

    if (isSignedIn) {
      tokenProvider.setSignedIn(true);

      // Ensure a Mongo User doc exists for this Clerk identity, then capture
      // our own _id. /me/init is idempotent and creates the doc on first
      // sign-in. If the user has a different role on this account, surface
      // the error to the console but don't crash.
      (async function () {
        // Wait for Clerk to mint a JWT before any API call — otherwise the
        // first request goes out without an Authorization header and the
        // backend returns 401.
        var tok = await awaitToken();
        if (cancelled) return;
        if (!tok) {
          // eslint-disable-next-line no-console
          console.warn('[ClerkTokenBridge] Clerk getToken never resolved; aborting init');
          return;
        }

        // If onboarding just finished (OnboardingCompleteScreen called
        // markPending before setActive), carry the flag so the backend
        // creates / backfills the User as already-onboarded in a single
        // round trip.
        var initBody = { role: 'patient' };
        if (consumePendingOnboarding()) {
          initBody.onboardingCompleted = true;
        }
        var init = await apiClient.post('/auth/me/init', initBody);
        if (cancelled) return;
        if (!init.success) {
          // eslint-disable-next-line no-console
          console.warn('[ClerkTokenBridge] /auth/me/init failed:', init.status, init.error, init.code);
          if (init.status === 409) {
            // Two distinct 409s:
            //   USER_EMAIL_TAKEN — email belongs to a (possibly soft-deleted)
            //     account at the Mongo unique-index layer
            //   default          — this Clerk identity is already registered
            //     with a different role (one Clerk identity = one role)
            var isEmailTaken = init.code === 'USER_EMAIL_TAKEN';
            Alert.alert(
              isEmailTaken ? 'Email already in use' : 'Account type mismatch',
              (init.error || (isEmailTaken
                ? 'This email is already registered.'
                : 'This email is registered with a different role.')) +
                '\n\nUse a different email to sign in to the patient app.',
              [{ text: 'OK', onPress: function () { clerk.signOut().catch(function () {}); } }]
            );
            return;
          }
          return;
        }
        if (init.success && init.data && init.data.user && init.data.user._id) {
          tokenProvider.setMyUserId(String(init.data.user._id));
        }
        // Keep a profile fetch in case anything updated it server-side.
        var prof = await apiClient.get('/patient/profile');
        if (cancelled) return;
        if (prof.success && prof.data && prof.data._id) {
          tokenProvider.setMyUserId(String(prof.data._id));
        }
        // Open chat socket once we know who we are.
        chatSocket.connect();

        // Register the device's Expo push token with the backend
        // (PATCH /users/me/fcm-token, endpoint from P1.1 c8898e7). For
        // new users this fires immediately after onboarding completes
        // because OnboardingCompleteScreen activates the Clerk session
        // via setActive(), which flips isSignedIn=true and runs this
        // very effect — satisfying the locked decision "request
        // permission only after onboarding completes" without a
        // separate hook. Fire-and-forget — a failure here (no
        // permission, simulator, no APNs entitlement until prebuild
        // lands) must NOT block sign-in. Backend diff-writes on
        // no-change so cold-start re-registration is cheap.
        registerPushToken().then(function (r) {
          if (!r.success) {
            // eslint-disable-next-line no-console
            console.warn('[ClerkTokenBridge] registerPushToken failed:', r.error);
          }
        });
      })();
    } else {
      tokenProvider.setSignedIn(false);
      tokenProvider.setMyUserId(null);
      chatSocket.disconnect();
    }

    return function () { cancelled = true; };
  }, [isLoaded, isSignedIn]);

  return null;
}
