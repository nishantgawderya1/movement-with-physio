import React, { createContext, useContext, useState } from 'react';

const MOCK_PATIENT = {
  name: 'Priya',
  streak: 12,
  adherence: 85,
  todayPlan: { title: 'Morning Mobility', minutes: 15, exercises: 6 },
  painTrend: [7, 6, 6, 5, 5, 4, 3],
  weekProgress: { rangeOfMotion: 68, painReduction: 42 },
};

const PatientContext = createContext(null);

/**
 * Provides mock patient data and onboarding-complete state to the main app.
 * Wrap the root navigator (AppNavigator) in this provider.
 * @param {{ children: React.ReactNode }} props
 */
export function PatientProvider({ children }) {
  const [patient] = useState(MOCK_PATIENT);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);

  /**
   * Call this when the user finishes onboarding to switch to the main app.
   */
  function completeOnboarding() {
    setIsOnboardingComplete(true);
  }

  /**
   * Call this on logout to return to the auth flow.
   */
  function resetOnboarding() {
    setIsOnboardingComplete(false);
  }

  return (
    <PatientContext.Provider value={{ ...patient, isOnboardingComplete, completeOnboarding, resetOnboarding }}>
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
 *   isOnboardingComplete: boolean, completeOnboarding: Function }}
 */
export function usePatient() {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error('usePatient must be used inside PatientProvider');
  }
  return context;
}
