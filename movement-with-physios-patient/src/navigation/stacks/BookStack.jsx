import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TransitionPresets } from '@react-navigation/stack';
import { PATIENT_ROUTES } from '../../constants/routes';

import AppointmentsRootScreen from '../../screens/main/AppointmentsRootScreen';
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
 * Stack navigator for the Appointments tab (formerly the Book tab).
 *
 * After P4.3 restructure:
 *   AppointmentsRootScreen (NEW tab root) → BookTherapist → SlotSelection → BookingConfirmed
 *
 * Tab-root gesture lock moved from BookTherapistScreen to AppointmentsRootScreen
 * (AppointmentsRootScreen now occupies the tab root slot; BookTherapistScreen is
 * a pushed screen, so swipe-back is enabled to let users return to the root).
 *
 * Uses @react-navigation/stack (not native-stack) for TransitionPresets support.
 * Screens manage their own headers (headerShown: false at every level).
 */
export default function BookStack() {
  return (
    <Stack.Navigator
      initialRouteName={PATIENT_ROUTES.APPOINTMENTS}
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
        name={PATIENT_ROUTES.APPOINTMENTS}
        component={AppointmentsRootScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name={PATIENT_ROUTES.BOOK_THERAPIST}
        component={BookTherapistScreen}
        options={{ headerShown: false }}
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
