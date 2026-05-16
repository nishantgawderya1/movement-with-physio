import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../screens/splash/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import TherapistPortalScreen from '../screens/auth/TherapistPortalScreen';
import ClerkAuthScreen from '../screens/auth/ClerkAuthScreen';
import RegistrationNextStep from '../screens/auth/RegistrationNextStep';

const SCREEN_OPTIONS = {
  headerShown: false,
  animation: 'slide_from_right',
  animationDuration: 280,
  freezeOnBlur: true,
};

// Signed-OUT navigator. Only contains screens reachable by a logged-out user.
// Once Clerk's isSignedIn flips, the top-level AppNavigator unmounts this stack
// and mounts AppStack instead — no imperative navigation needed.
const Stack = createNativeStackNavigator();

const AuthNavigator = () => (
  <Stack.Navigator screenOptions={SCREEN_OPTIONS}>
    <Stack.Screen name="Splash" component={SplashScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="TherapistPortal" component={TherapistPortalScreen} />
    <Stack.Screen name="ClerkAuth" component={ClerkAuthScreen} />
    <Stack.Screen name="RegistrationNextStep" component={RegistrationNextStep} />
  </Stack.Navigator>
);

export default AuthNavigator;
