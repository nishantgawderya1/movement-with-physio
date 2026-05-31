import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Alert } from 'react-native';
import { useClerk } from '@clerk/clerk-expo';
import { useOnboarding } from '../../context/OnboardingContext';
import OnboardingShell from '../../components/auth/OnboardingShell';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { PATIENT_ROUTES } from '../../constants/routes';
import { apiClient } from '../../lib/apiClient';
import { hardSignOut } from '../../lib/sessionReset';

/**
 * Step 1 — Collect patient name and age.
 *
 * @param {{ navigation: object }} props
 */
export default function PersonalInfoScreen({ navigation }) {
  const { name: contextName, age: contextAge, updateOnboardingData } = useOnboarding();
  const { signOut } = useClerk();

  const [name, setName] = useState(contextName || '');
  const [age, setAge] = useState(contextAge ? String(contextAge) : '');

  var ageNum = parseInt(age, 10);
  var isValid =
    name.trim().length > 0 &&
    !isNaN(ageNum) &&
    ageNum >= 1 &&
    ageNum <= 120;

  function handleContinue() {
    var trimmedName = name.trim();
    updateOnboardingData({ name: trimmedName, age: ageNum });
    // Backfill the name onto the backend User doc. /me/init is idempotent —
    // it created the doc on sign-in; this call updates the name if missing.
    // Fire-and-forget: we don't block onboarding on this.
    apiClient.post('/auth/me/init', { role: 'patient', name: trimmedName }).catch(function () {});
    navigation.navigate(PATIENT_ROUTES.PAIN_LOCATION);
  }

  function handleBack() {
    navigation.goBack();
  }

  // Escape hatch for the gate trap: a signed-in-but-not-onboarded identity is
  // routed here as the lone stack screen (initialRouteName=PERSONAL_INFO), so
  // the back button is dead ("GO_BACK was not handled"). Signing out flips
  // isSignedIn=false; RootNavigator then swaps to the auth stack (Splash →
  // Login) on its own — no manual navigation needed.
  function handleStartOver() {
    Alert.alert(
      'Start over?',
      'This signs you out and returns to the login screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            try {
              await hardSignOut(signOut);
            } catch (e) {
              // eslint-disable-next-line no-console
              console.error('[PersonalInfo] start over (sign out) failed:', e);
              Alert.alert(
                'Sign out failed',
                (e && e.message) ? e.message : 'Could not sign out. Please try again.'
              );
            }
          },
        },
      ]
    );
  }

  return (
    <OnboardingShell
      step={1}
      heading="What's your name?"
      subtitle="We'd love to know how to address you"
      onBack={handleBack}
      onContinue={handleContinue}
      isContinueDisabled={!isValid}
      onStartOver={handleStartOver}
    >
      <View style={styles.fieldGroup}>
        <TextInput
          style={styles.input}
          placeholder="Full name"
          placeholderTextColor={colors.textLight}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          returnKeyType="next"
          accessibilityLabel="Full name"
        />
        <TextInput
          style={[styles.input, styles.inputSpaced]}
          placeholder="Age"
          placeholderTextColor={colors.textLight}
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
          maxLength={3}
          returnKeyType="done"
          accessibilityLabel="Age"
        />
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: fonts.md,
    color: colors.textDark,
    backgroundColor: colors.inputBg,
  },
  inputSpaced: {
    marginTop: 16,
  },
});
