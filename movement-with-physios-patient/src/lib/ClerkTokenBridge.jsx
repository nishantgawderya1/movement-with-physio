import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useAuth, useClerk } from '@clerk/clerk-expo';
import { tokenProvider } from './tokenProvider';
import { apiClient } from './apiClient';
import { chatSocket } from './chatSocket';

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

        var init = await apiClient.post('/auth/me/init', { role: 'patient' });
        if (cancelled) return;
        if (!init.success) {
          // eslint-disable-next-line no-console
          console.warn('[ClerkTokenBridge] /auth/me/init failed:', init.status, init.error);
          // 409 = this email is already registered with a different role
          // (likely as a therapist on the other app). One Clerk identity = one
          // role by design — show a clear message and sign the user out.
          if (init.status === 409) {
            Alert.alert(
              'Email already in use',
              (init.error || 'This email is registered with a different role.') +
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
