import React, { useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { useOnboarding } from '../../context/OnboardingContext';
import OnboardingShell from '../../components/auth/OnboardingShell';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { PATIENT_ROUTES } from '../../constants/routes';

/**
 * Step 1 — Collect patient name and age.
 *
 * @param {{ navigation: object }} props
 */
export default function PersonalInfoScreen({ navigation }) {
  const { name: contextName, age: contextAge, updateOnboardingData } = useOnboarding();

  const [name, setName] = useState(contextName || '');
  const [age, setAge] = useState(contextAge ? String(contextAge) : '');

  var ageNum = parseInt(age, 10);
  var isValid =
    name.trim().length > 0 &&
    !isNaN(ageNum) &&
    ageNum >= 1 &&
    ageNum <= 120;

  function handleContinue() {
    updateOnboardingData({ name: name.trim(), age: ageNum });
    navigation.navigate(PATIENT_ROUTES.PAIN_LOCATION);
  }

  function handleBack() {
    navigation.goBack();
  }

  return (
    <OnboardingShell
      step={1}
      heading="What's your name?"
      subtitle="We'd love to know how to address you"
      onBack={handleBack}
      onContinue={handleContinue}
      isContinueDisabled={!isValid}
    >
      <View style={styles.fieldGroup}>
        <TextInput
          style={styles.input}
          placeholder="Full name"
          placeholderTextColor={colors.placeholder}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          returnKeyType="next"
          accessibilityLabel="Full name"
        />
        <TextInput
          style={[styles.input, styles.inputSpaced]}
          placeholder="Age"
          placeholderTextColor={colors.placeholder}
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
    borderColor: colors.inputBorder,
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
