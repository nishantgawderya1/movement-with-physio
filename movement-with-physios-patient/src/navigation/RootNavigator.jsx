import React from 'react';
import { usePatient } from '../context/PatientContext';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';

/**
 * Switches between the auth flow and the main app based on
 * isOnboardingComplete from PatientContext.
 */
export default function RootNavigator() {
  var { isOnboardingComplete } = usePatient();
  return isOnboardingComplete ? <MainNavigator /> : <AuthNavigator />;
}
