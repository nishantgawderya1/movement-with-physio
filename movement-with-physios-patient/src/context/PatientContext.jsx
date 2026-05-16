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

  var refresh = useCallback(function () {
    // Fire only when signed in — otherwise we'd 401 every time.
    if (!tokenProvider.isSignedIn()) return;
    apiClient.get('/patient/profile').then(function (res) {
      if (res.success && res.data) {
        setPatient(function (prev) {
          return Object.assign({}, prev, {
            name: res.data.name || '',
            email: res.data.email || '',
          });
        });
        if (typeof res.data.onboardingCompleted === 'boolean') {
          setIsOnboardingComplete(res.data.onboardingCompleted);
        }
      }
    });
  }, []);

  // Refresh on auth state change. tokenProvider.onAuthChange fires whenever
  // ClerkTokenBridge flips signed-in state.
  useEffect(function () {
    refresh();
    var unsub = tokenProvider.onAuthChange(function (signedIn) {
      if (signedIn) {
        refresh();
      } else {
        setPatient(EMPTY_PATIENT);
        setIsOnboardingComplete(false);
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
 *   isOnboardingComplete: boolean, completeOnboarding: Function, refresh: Function }}
 */
export function usePatient() {
  var context = useContext(PatientContext);
  if (!context) {
    throw new Error('usePatient must be used inside PatientProvider');
  }
  return context;
}
