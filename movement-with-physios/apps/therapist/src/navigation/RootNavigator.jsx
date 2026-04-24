import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';

/**
 * RootNavigator
 *
 * CURRENT STATE: Always renders AuthNavigator (no session check yet).
 *
 * BACKEND ENGINEER — To enable session-based routing:
 *   1. Import AuthService from '../services/AuthService'
 *   2. Replace: const isAuthenticated = false
 *      With:    const isAuthenticated = AuthService.isAuthenticated()
 *   3. Wrap with Clerk's useAuth() hook or a session context
 *
 * Stack structure:
 *   AuthNavigator → SplashScreen, WelcomeScreen, ClerkAuthScreen
 *   AppNavigator  → PersonalInfoScreen, TherapistPortalScreen, DashboardScreen
 */
export default function RootNavigator() {
  // TODO (Backend Engineer): Replace false with AuthService.isAuthenticated()
  const isAuthenticated = false;

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
