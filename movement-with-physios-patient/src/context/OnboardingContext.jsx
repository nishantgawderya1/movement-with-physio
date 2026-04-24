import React, { createContext, useContext, useState } from 'react';

const initialState = {
  name: '',
  age: '',
  painLocations: [],
  painSeverity: null,
  painDuration: '',
  hadPreviousTreatment: null,
  previousTreatmentDetails: '',
  recoveryGoals: [],
  availability: [],
};

const OnboardingContext = createContext(null);

/**
 * Provides onboarding state to the entire auth flow.
 * Wrap the AuthNavigator in this provider.
 * @param {{ children: React.ReactNode }} props
 */
export function OnboardingProvider({ children }) {
  const [data, setData] = useState(initialState);

  /**
   * Merges a partial update into the onboarding state, like setState.
   * @param {Partial<typeof initialState>} partial
   */
  function updateOnboardingData(partial) {
    setData(function (prev) {
      return Object.assign({}, prev, partial);
    });
  }

  return (
    <OnboardingContext.Provider value={{ ...data, updateOnboardingData }}>
      {children}
    </OnboardingContext.Provider>
  );
}

/**
 * Access onboarding state and updater from any screen in the auth flow.
 * Must be called inside an OnboardingProvider.
 * @returns {{ name: string, age: string, painLocations: string[], painSeverity: number|null,
 *   painDuration: string, hadPreviousTreatment: boolean|null, previousTreatmentDetails: string,
 *   recoveryGoals: string[], availability: string[], updateOnboardingData: Function }}
 */
export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used inside OnboardingProvider');
  }
  return context;
}
