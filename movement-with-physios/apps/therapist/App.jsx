import React, { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import {
  useFonts,
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';
import * as SplashScreenExpo from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from './src/lib/tokenCache';
import ClerkTokenBridge from './src/lib/ClerkTokenBridge';
import AppNavigator from './src/navigation/AppNavigator';
import { navigationRef } from './src/lib/navigationRef';
import { ROUTES } from './src/constants/routes';

SplashScreenExpo.preventAutoHideAsync();

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

/**
 * Foreground notification policy. Suppress the OS banner when the therapist
 * is in an active video session — clinical-context safety: never interrupt
 * a live therapy session with another booking notification. The
 * notification still lands in the system list and badge so the therapist
 * can review missed pushes after the call ends; only the in-call banner +
 * sound are silenced.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => {
    const currentRoute = navigationRef.current?.getCurrentRoute?.()?.name;
    const inVideo =
      currentRoute === ROUTES.VIDEO_CALL || currentRoute === ROUTES.PRE_CALL_LOBBY;
    return {
      shouldShowBanner: !inVideo,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    };
  },
});

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

  // Tap-on-banner routing. Therapist app has no iOS action buttons (those
  // live on the patient app's PROPOSAL category in P4.2), so the response
  // listener only handles the default-tap case. All proposal lifecycle
  // pushes route to the Bookings screen where context is available.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data || {};
      const type = data.type;
      if (
        type === 'proposal_accepted' ||
        type === 'proposal_declined' ||
        type === 'proposal_expired'
      ) {
        navigationRef.current?.navigate(ROUTES.BOOKINGS);
      }
    });
    return () => sub.remove();
  }, []);

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
