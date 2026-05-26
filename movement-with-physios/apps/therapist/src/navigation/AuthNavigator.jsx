import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../screens/splash/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import ClerkAuthScreen from '../screens/auth/ClerkAuthScreen';

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
    <Stack.Screen name="ClerkAuth" component={ClerkAuthScreen} />
  </Stack.Navigator>
);

export default AuthNavigator;
