import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TransitionPresets } from '@react-navigation/stack';
import { PATIENT_ROUTES } from '../../constants/routes';

import BookTherapistScreen from '../../screens/main/BookTherapistScreen';
import SlotSelectionScreen from '../../screens/main/SlotSelectionScreen';
import BookingConfirmedScreen from '../../screens/main/BookingConfirmedScreen';

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
 * Stack navigator for the Book tab.
 * Uses @react-navigation/stack (not native-stack) for TransitionPresets support.
 * Flow: BookTherapist → SlotSelection → BookingConfirmed
 * All screens have headers hidden — each screen manages its own header.
 */
export default function BookStack() {
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
      <Stack.Screen
        name={PATIENT_ROUTES.BOOK_THERAPIST}
        component={BookTherapistScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name={PATIENT_ROUTES.SLOT_SELECTION}
        component={SlotSelectionScreen}
      />
      <Stack.Screen
        name={PATIENT_ROUTES.BOOKING_CONFIRMED}
        component={BookingConfirmedScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
