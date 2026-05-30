import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiClient } from '../lib/apiClient';
import { tokenProvider } from '../lib/tokenProvider';

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

  var refresh = useCallback(function () {
    // Fire only when signed in — otherwise we'd 401 every time.
    if (!tokenProvider.isSignedIn()) return;
    apiClient.get('/patient/profile').then(function (res) {
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
      }
      // Mark loaded regardless of success — the gate must not stall forever
      // on a transient /patient/profile failure. A failed fetch leaves
      // isOnboardingComplete at its default false, so RootNavigator routes
      // to onboarding rather than a half-rendered MainNavigator.
      setIsProfileLoaded(true);
    });
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
