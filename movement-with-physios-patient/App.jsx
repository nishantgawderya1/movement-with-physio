import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
import {
  Lora_400Regular,
  Lora_400Regular_Italic,
  Lora_600SemiBold,
} from '@expo-google-fonts/lora';
import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
} from '@expo-google-fonts/nunito';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from './src/lib/tokenCache';
import ClerkTokenBridge from './src/lib/ClerkTokenBridge';
import AppNavigator from './src/navigation/AppNavigator';
import { navigationRef } from './src/lib/navigationRef';
import { registerProposalCategory } from './src/services/notificationService';
import { PATIENT_ROUTES } from './src/constants/routes';

// Boot-time marker — confirms which bundle the dev-client is actually
// running. Set EXPO_PUBLIC_COMMIT_SHA at build time to capture the sha.
// eslint-disable-next-line no-console
console.log('[BOOT] bundle commit=' + (process.env.EXPO_PUBLIC_COMMIT_SHA || 'dev'));

SplashScreen.preventAutoHideAsync();

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

/**
 * Type-aware foreground notification policy. proposal_received pushes are
 * the highest signal — banner + sound + badge — because the patient needs
 * to see the Accept/Decline buttons immediately. Everything else gets a
 * silent banner only.
 *
 * VideoCall/PreCallLobby route names will land when the patient WebRTC UI
 * ships; this suppression check no-ops until then but requires no change
 * when it does. Matches the therapist app's clinical-context safety rule.
 */
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification?.request?.content?.data || {};
    const type = data.type;
    const currentRoute = navigationRef.current?.getCurrentRoute?.()?.name;
    const inVideo = currentRoute === 'VideoCall' || currentRoute === 'PreCallLobby';

    if (type === 'proposal_received') {
      return {
        shouldShowBanner: !inVideo,
        shouldShowList: true,
        shouldPlaySound: !inVideo,
        shouldSetBadge: true,
      };
    }
    return {
      shouldShowBanner: !inVideo,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    };
  },
});

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Lora_400Regular,
    Lora_400Regular_Italic,
    Lora_600SemiBold,
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Register the iOS PROPOSAL category at mount so the Accept/Decline
  // action buttons render in proposal_received pushes. iOS persists the
  // registration across launches; registering on every cold-start is
  // cheap and defensive against system-state drift / reinstalls.
  useEffect(() => {
    registerProposalCategory().then((r) => {
      if (!r.success) {
        // eslint-disable-next-line no-console
        console.warn('[App] registerProposalCategory failed:', r.error);
      }
    });
  }, []);

  // Tap-on-banner AND tap-on-action-button routing. actionIdentifier
  // identifies which iOS action was tapped. AppointmentsRootScreen (P4.4)
  // consumes the resulting route param and fires the matching API call.
  //
  // Cross-stack navigation requires nested { screen, params } syntax for
  // React Navigation v7 — top-level params don't pass through to child
  // stack screens. AppointmentsRootScreen lives inside BookStack which
  // mounts under the BOOK_APPOINTMENT tab in MainNavigator, so the path is
  // BOOK_APPOINTMENT > APPOINTMENTS.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data || {};
      const actionId = response.actionIdentifier;

      if (data.type === 'proposal_received' && data.proposalId) {
        if (actionId === 'ACCEPT_PROPOSAL') {
          navigationRef.current?.navigate(PATIENT_ROUTES.BOOK_APPOINTMENT, {
            screen: PATIENT_ROUTES.APPOINTMENTS,
            params: { acceptProposalId: data.proposalId },
          });
        } else if (actionId === 'DECLINE_PROPOSAL') {
          navigationRef.current?.navigate(PATIENT_ROUTES.BOOK_APPOINTMENT, {
            screen: PATIENT_ROUTES.APPOINTMENTS,
            params: { declineProposalId: data.proposalId },
          });
        } else {
          // Default tap (notification body, not an action button)
          navigationRef.current?.navigate(PATIENT_ROUTES.BOOK_APPOINTMENT, {
            screen: PATIENT_ROUTES.APPOINTMENTS,
            params: { focusProposalId: data.proposalId },
          });
        }
      }
    });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <ClerkTokenBridge />
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
