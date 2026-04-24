import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { TransitionPresets } from '@react-navigation/stack';
import { OnboardingProvider } from '../context/OnboardingContext';
import { PATIENT_ROUTES } from '../constants/routes';
import { colors } from '../constants/colors';
import { fonts } from '../constants/fonts';

import SplashScreen from '../screens/splash/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import PersonalInfoScreen from '../screens/auth/PersonalInfoScreen';
import PainLocationScreen from '../screens/auth/PainLocationScreen';
import PainSeverityScreen from '../screens/auth/PainSeverityScreen';
import PainDurationScreen from '../screens/auth/PainDurationScreen';
import TreatmentHistoryScreen from '../screens/auth/TreatmentHistoryScreen';
import RecoveryGoalsScreen from '../screens/auth/RecoveryGoalsScreen';
import AvailabilityScreen from '../screens/auth/AvailabilityScreen';
import OnboardingCompleteScreen from '../screens/auth/OnboardingCompleteScreen';

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
 * Placeholder screen for Clerk authentication (stub — not yet implemented).
 */
function ClerkAuthScreen() {
  return (
    <View style={clerkStyles.container}>
      <Text style={clerkStyles.label}>Login coming soon</Text>
    </View>
  );
}

/**
 * Auth + onboarding navigator.
 * Uses @react-navigation/stack (not native-stack) for TransitionPresets support.
 * Wraps the full stack in OnboardingProvider so all screens share onboarding state.
 *
 * Flow: Splash → Login → PersonalInfo → PainLocation → PainSeverity →
 *        PainDuration → TreatmentHistory → RecoveryGoals → Availability → OnboardingComplete
 */
export default function AuthNavigator() {
  return (
    <OnboardingProvider>
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
        <Stack.Screen name={PATIENT_ROUTES.SPLASH} component={SplashScreen} />
        <Stack.Screen name={PATIENT_ROUTES.LOGIN} component={LoginScreen} />
        <Stack.Screen name={PATIENT_ROUTES.CLERK_AUTH} component={ClerkAuthScreen} />
        <Stack.Screen name={PATIENT_ROUTES.PERSONAL_INFO} component={PersonalInfoScreen} />
        <Stack.Screen name={PATIENT_ROUTES.PAIN_LOCATION} component={PainLocationScreen} />
        <Stack.Screen name={PATIENT_ROUTES.PAIN_SEVERITY} component={PainSeverityScreen} />
        <Stack.Screen name={PATIENT_ROUTES.PAIN_DURATION} component={PainDurationScreen} />
        <Stack.Screen name={PATIENT_ROUTES.TREATMENT_HISTORY} component={TreatmentHistoryScreen} />
        <Stack.Screen name={PATIENT_ROUTES.RECOVERY_GOALS} component={RecoveryGoalsScreen} />
        <Stack.Screen name={PATIENT_ROUTES.AVAILABILITY} component={AvailabilityScreen} />
        <Stack.Screen name={PATIENT_ROUTES.ONBOARDING_COMPLETE} component={OnboardingCompleteScreen} />
      </Stack.Navigator>
    </OnboardingProvider>
  );
}

var clerkStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  label: {
    fontSize: fonts.xl,
    color: colors.textDark,
  },
});
