import React, { useCallback } from 'react';
import { View } from 'react-native';
import {
  useFonts,
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';
import * as SplashScreenExpo from 'expo-splash-screen';
import { ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from './src/lib/tokenCache';
import ClerkTokenBridge from './src/lib/ClerkTokenBridge';
import AppNavigator from './src/navigation/AppNavigator';

SplashScreenExpo.preventAutoHideAsync();

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function App() {
  const [fontsLoaded] = useFonts({
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreenExpo.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <ClerkTokenBridge />
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <AppNavigator />
      </View>
    </ClerkProvider>
  );
}
