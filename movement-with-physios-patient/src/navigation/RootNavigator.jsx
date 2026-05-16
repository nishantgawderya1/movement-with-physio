import React from 'react';
import { useAuth } from '@clerk/clerk-expo';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';

/**
 * Switches between the auth flow and the main app based on
 * Clerk's real session state (isSignedIn).
 */
export default function RootNavigator() {
  const { isSignedIn, isLoaded } = useAuth();

  // While Clerk is loading the session, render nothing (splash is still showing)
  if (!isLoaded) return null;

  return isSignedIn ? <MainNavigator key="main" /> : <AuthNavigator key="auth" />;
}
