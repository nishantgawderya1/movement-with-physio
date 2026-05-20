import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, BackHandler } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '@clerk/clerk-expo';
import AuthNavigator from './AuthNavigator';
import AppStack from './AppStack';
import IncomingInstantCallModal from '../components/notifications/IncomingInstantCallModal';
import { colors } from '../constants/colors';

/**
 * AppNavigator — single NavigationContainer that switches between
 * AuthNavigator (signed-out) and AppStack (signed-in) based on Clerk.
 *
 * React Navigation cleanly unmounts/remounts the inner stack when the
 * branch changes, so signing in flips automatically to the dashboard and
 * signing out flips back to the auth flow — no imperative replace() calls
 * needed inside screens.
 *
 * Loader is shown until Clerk reports isLoaded so we don't briefly flash
 * the wrong stack on cold start.
 *
 * Android hardware back is intercepted at the container level: if the
 * inner stack can go back, we pop; otherwise we let the system handle
 * (exit / minimise). Without this, pressing back from PersonalInfo would
 * either no-op or close the entire app.
 */
const AppNavigator = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const navigationRef = useRef(null);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const nav = navigationRef.current;
      if (nav && nav.canGoBack()) {
        nav.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  if (!isLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {isSignedIn ? (
        <>
          <AppStack />
          {/* Phase 3B — app-level modal for incoming instant-call requests.
              Subscribes to videoSocket; appears over any signed-in screen.
              See component docs for the FCM-vs-socket emit gap (backend
              currently emits via FCM only; adding the socket.emit on the
              backend's instant flow makes this fire in real time). */}
          <IncomingInstantCallModal navigation={navigationRef.current} />
        </>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});

export default AppNavigator;
