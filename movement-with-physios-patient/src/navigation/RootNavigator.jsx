import React from 'react';
import { useAuth } from '@clerk/clerk-expo';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import { usePatient } from '../context/PatientContext';
import { PATIENT_ROUTES } from '../constants/routes';

/**
 * Routes between auth/onboarding and main app:
 *
 *   - Clerk not loaded                     → null (splash still showing)
 *   - Signed in, profile not yet fetched   → null (avoid the flicker of
 *                                            briefly showing onboarding to
 *                                            an existing user whose backend
 *                                            profile is still loading)
 *   - Signed in, profile says incomplete   → AuthNavigator starting at
 *                                            PersonalInfo. Fresh signups
 *                                            and any signed-in user the
 *                                            backend reports as incomplete
 *                                            land here.
 *   - Signed in, profile says complete     → MainNavigator
 *   - Not signed in                        → AuthNavigator (Splash)
 */
export default function RootNavigator() {
  const { isSignedIn, isLoaded } = useAuth();
  const { isProfileLoaded, isOnboardingComplete } = usePatient();

  if (!isLoaded) return null;

  if (isSignedIn) {
    if (!isProfileLoaded) return null;
    if (!isOnboardingComplete) {
      return (
        <AuthNavigator
          key="auth-onboarding"
          initialRouteName={PATIENT_ROUTES.PERSONAL_INFO}
        />
      );
    }
    return <MainNavigator key="main" />;
  }

  return <AuthNavigator key="auth" />;
}
