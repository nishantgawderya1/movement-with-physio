import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '../lib/apiClient';
import { tokenProvider } from '../lib/tokenProvider';

/**
 * Backoff schedule (ms) between profile-fetch attempts. Its length also caps
 * the retry count. Covers the post-sign-in window where Clerk hasn't minted a
 * JWT yet, plus a cold/briefly-unreachable backend.
 */
var PROFILE_RETRY_DELAYS_MS = [400, 800, 1500, 2500, 4000];

/**
 * Wait (up to ~3s) for Clerk to mint a session JWT before calling the API.
 * Clerk flips isSignedIn=true a few hundred ms before getToken() can resolve a
 * token; a tokenless GET /patient/profile 401s, which would leave onboarding
 * state at its default false and misroute an onboarded user into onboarding.
 * Mirrors the same guard in ClerkTokenBridge.
 * @returns {Promise<string|null>}
 */
async function awaitProfileToken() {
  for (var i = 0; i < 15; i++) {
    var t = await tokenProvider.getToken();
    if (t) return t;
    await new Promise(function (r) { setTimeout(r, 200); });
  }
  return null;
}

/**
 * Fallback patient shape used before the backend profile arrives. Empty
 * defaults — never fake data — so screens render placeholders, not lies.
 */
const EMPTY_PATIENT = {
  name: '',
  email: '',
  // Phase 3 — primary body part. Null until the patient has captured one.
  // Booking flow falls back to 'general' on null so this is safe.
  painLocation: null,
  streak: 0,
  adherence: 0,
  todayPlan: { title: '', minutes: 0, exercises: 0 },
  painTrend: [],
  weekProgress: { rangeOfMotion: 0, painReduction: 0 },
};

const PatientContext = createContext(null);

/**
 * Provides the signed-in patient's real profile + dashboard data.
 *
 * The previous version hardcoded "Priya" and fake numbers. This version
 * pulls from /patient/profile (name) and /patient/dashboard (sessions,
 * upcoming bookings). Fields the backend doesn't track yet (streak,
 * adherence %, pain trend, week progress) stay at 0 — screens that need
 * them should fall back to empty states rather than display fake numbers.
 *
 * Wrap the root navigator (AppNavigator) in this provider.
 * @param {{ children: React.ReactNode }} props
 */
export function PatientProvider({ children }) {
  var [patient, setPatient] = useState(EMPTY_PATIENT);
  var [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  // False until the first /patient/profile response lands (success OR
  // explicit failure). RootNavigator uses this to avoid flickering existing
  // users through the onboarding gate during the post-signin fetch window.
  var [isProfileLoaded, setIsProfileLoaded] = useState(false);
  // Monotonic tag so an older in-flight retry loop bails the moment a newer
  // refresh (or a sign-out) supersedes it.
  var refreshSeqRef = useRef(0);

  var refresh = useCallback(function () {
    // Fire only when signed in — otherwise we'd 401 every time.
    if (!tokenProvider.isSignedIn()) return;

    var seq = (refreshSeqRef.current = refreshSeqRef.current + 1);
    function isStale() {
      return seq !== refreshSeqRef.current || !tokenProvider.isSignedIn();
    }

    (async function attempt(tries) {
      // Beat the post-sign-in token race: wait for a JWT before fetching so the
      // request carries Authorization and doesn't 401.
      var tok = await awaitProfileToken();
      if (isStale()) return;

      var res = tok
        ? await apiClient.get('/patient/profile')
        : { success: false, status: 0, error: 'clerk token not ready' };
      if (isStale()) return;

      if (res.success && res.data) {
        setPatient(function (prev) {
          return Object.assign({}, prev, {
            name: res.data.name || '',
            email: res.data.email || '',
            // Phase 3 — surface painLocation so ProfileScreen can show + update it.
            painLocation: res.data.painLocation || null,
          });
        });
        if (typeof res.data.onboardingCompleted === 'boolean') {
          setIsOnboardingComplete(res.data.onboardingCompleted);
        }
        // Only NOW is the profile authoritative. Marking loaded on a FAILED
        // fetch (the old behavior) latched the gate into the onboarding branch
        // with the default-false flag — the launch-time misroute this fixes.
        setIsProfileLoaded(true);
        return;
      }

      // Transient failure (token not ready yet, cold/unreachable backend). Do
      // NOT mark the profile loaded — retry with backoff. The gate keeps
      // showing the splash window (isProfileLoaded=false) rather than wrongly
      // dropping an onboarded user onto PersonalInfo.
      if (tries < PROFILE_RETRY_DELAYS_MS.length) {
        await new Promise(function (r) { setTimeout(r, PROFILE_RETRY_DELAYS_MS[tries]); });
        if (isStale()) return;
        return attempt(tries + 1);
      }

      // Retries exhausted — leave isProfileLoaded=false rather than misroute.
      // The next auth change or a relaunch re-attempts.
      // eslint-disable-next-line no-console
      console.warn('[PatientContext] /patient/profile failed after retries:', res.status, res.error);
    })(0);
  }, []);

  // Refresh on auth state change. tokenProvider.onAuthChange fires whenever
  // ClerkTokenBridge flips signed-in state.
  useEffect(function () {
    refresh();
    var unsub = tokenProvider.onAuthChange(function (signedIn) {
      if (signedIn) {
        // Reset loaded so the gate waits for the FRESH user's profile, not
        // the previous user's cached one (relevant when one device hosts
        // sign-out → sign-in as a different account).
        setIsProfileLoaded(false);
        refresh();
      } else {
        setPatient(EMPTY_PATIENT);
        setIsOnboardingComplete(false);
        setIsProfileLoaded(false);
      }
    });
    return unsub;
  }, [refresh]);

  function completeOnboarding() {
    setIsOnboardingComplete(true);
  }

  function resetOnboarding() {
    setIsOnboardingComplete(false);
  }

  return (
    <PatientContext.Provider
      value={Object.assign({}, patient, {
        isOnboardingComplete: isOnboardingComplete,
        isProfileLoaded: isProfileLoaded,
        completeOnboarding: completeOnboarding,
        resetOnboarding: resetOnboarding,
        refresh: refresh,
      })}
    >
      {children}
    </PatientContext.Provider>
  );
}

/**
 * Access patient data and onboarding state from any screen.
 * Must be called inside a PatientProvider.
 * @returns {{ name: string, streak: number, adherence: number,
 *   todayPlan: { title: string, minutes: number, exercises: number },
 *   painTrend: number[], weekProgress: { rangeOfMotion: number, painReduction: number },
 *   isOnboardingComplete: boolean, isProfileLoaded: boolean,
 *   completeOnboarding: Function, refresh: Function }}
 */
export function usePatient() {
  var context = useContext(PatientContext);
  if (!context) {
    throw new Error('usePatient must be used inside PatientProvider');
  }
  return context;
}
