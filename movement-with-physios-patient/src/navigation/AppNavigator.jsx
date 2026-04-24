import React, { useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { PatientProvider } from '../context/PatientContext';
import RootNavigator from './RootNavigator';

/**
 * Root navigation wrapper.
 *
 * Responsibilities:
 *  1. Wraps the app in PatientProvider (mock patient data + onboarding state).
 *  2. Provides the NavigationContainer (and exposes a ref for BackHandler).
 *  3. Handles Android hardware back button:
 *     - If there is a screen to go back to → goBack() and consume the event.
 *     - If we are at the root (e.g. Home tab) → let the system handle it
 *       (Android default: minimise / exit).
 */
export default function AppNavigator() {
  var navigationRef = useRef(null);

  useEffect(function () {
    var sub = BackHandler.addEventListener('hardwareBackPress', function () {
      var nav = navigationRef.current;
      if (nav && nav.canGoBack()) {
        nav.goBack();
        return true; // event consumed — do not exit
      }
      return false; // let system handle (exit / minimise)
    });

    return function () { sub.remove(); };
  }, []);

  return (
    <PatientProvider>
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>
    </PatientProvider>
  );
}
