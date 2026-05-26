import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';

/**
 * RootNavigator
 *
 * NOTE: This component is NOT the active navigator. The app renders
 * `AppNavigator` (see App.jsx), which already drives session-based routing
 * via Clerk's `useAuth()` — switching between AuthNavigator (signed-out) and
 * AppStack (signed-in). The old AuthService abstraction has been removed.
 *
 * This file is retained only as a legacy entry point and is a candidate for
 * a future cleanup pass.
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
