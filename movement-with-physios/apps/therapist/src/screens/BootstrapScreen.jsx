import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { tokenProvider } from '../lib/tokenProvider';
import { colors } from '../constants/colors';

/**
 * BootstrapScreen — initial route of AppStack.
 *
 * Stays mounted with a loader until ClerkTokenBridge finishes provisioning
 * the Mongo User doc (POST /auth/me/init) and fetching the profile. Then it
 * decides where to send the user:
 *
 *   isNewSignup = true   → PersonalInfo (truly first sign-in: collect details)
 *   isNewSignup = false  → Dashboard    (returning user: skip onboarding)
 *
 * The `isNew` flag comes from /auth/me/init and is true ONLY on the very
 * first call for a given Clerk account. This guarantees returning users
 * never get sent back through the onboarding flow even if they used the
 * [DEV] Skip button last time and never marked onboardingCompleted=true.
 *
 * This also guarantees no screen fires authenticated queries before the
 * User doc exists, eliminating the race where rbac('therapist') would
 * 403 a newly signed-up therapist.
 *
 * @param {{ navigation: object }} props
 */
function decideRoute() {
  // Returning users always go to Dashboard. PersonalInfo is only for the
  // very first sign-in (isNewSignup=true). If, for any reason, the user
  // has already completed onboarding, also skip straight to Dashboard.
  if (tokenProvider.getOnboardingCompleted()) return 'Dashboard';
  if (tokenProvider.isNewSignup()) return 'PersonalInfo';
  return 'Dashboard';
}

export default function BootstrapScreen({ navigation }) {
  // Re-run the routing decision whenever this screen becomes focused (e.g.
  // after sign-out → sign-in cycle).
  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;

      function route() {
        if (cancelled) return;
        navigation.replace(decideRoute());
      }

      if (tokenProvider.isReady()) {
        route();
        return;
      }
      const unsub = tokenProvider.onReady(() => {
        route();
        unsub();
      });

      return () => { cancelled = true; unsub(); };
    }, [navigation])
  );

  // Belt-and-suspenders: if tokenProvider was already ready when this mounts
  // outside a focus cycle, fire once via useEffect too.
  useEffect(() => {
    if (tokenProvider.isReady()) {
      navigation.replace(decideRoute());
    }
  }, [navigation]);

  return (
    <View style={styles.loader}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
