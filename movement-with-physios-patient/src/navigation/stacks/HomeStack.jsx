import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TransitionPresets } from '@react-navigation/stack';
import { PATIENT_ROUTES } from '../../constants/routes';

import HomeScreen from '../../screens/main/HomeScreen';
import SessionScreen from '../../screens/main/SessionScreen';

const Stack = createStackNavigator();

/**
 * iOS-style spring transition spec shared across open/close.
 */
const SPRING_TRANSITION = {
  animation: 'spring',
  config: {
    stiffness: 1000,
    damping: 500,
    mass: 3,
    overshootClamping: true,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
};

/**
 * Stack navigator for the Home tab.
 * Flow: Home → Session
 * Uses @react-navigation/stack for TransitionPresets.SlideFromRightIOS.
 */
export default function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        ...TransitionPresets.SlideFromRightIOS,
        transitionSpec: {
          open: SPRING_TRANSITION,
          close: SPRING_TRANSITION,
        },
      }}
    >
      <Stack.Screen name={PATIENT_ROUTES.HOME_SCREEN} component={HomeScreen} />
      <Stack.Screen name={PATIENT_ROUTES.SESSION} component={SessionScreen} />
    </Stack.Navigator>
  );
}
