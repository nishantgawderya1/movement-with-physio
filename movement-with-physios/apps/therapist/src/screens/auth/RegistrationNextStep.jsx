// src/screens/auth/RegistrationNextStep.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE: Placeholder screen shown after successful OTP verification.
// This will be replaced with the full registration form in the next sprint.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts, fontFamilies } from '../../constants/fonts';

const RegistrationNextStep = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Success Icon */}
        <View style={styles.iconBox}>
          <Ionicons name="checkmark" size={36} color={colors.white} />
        </View>

        {/* Heading */}
        <Text style={styles.heading}>Mobile Verified!</Text>

        {/* Subheading */}
        <Text style={styles.subheading}>
          Your number has been confirmed.{'\n'}
          Let's complete your therapist registration.
        </Text>

        {/* Continue Button */}
        <TouchableOpacity
          style={styles.btn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('PersonalInfo')}
        >
          <Text style={styles.btnText}>Continue</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    alignItems: 'center',
  },
  iconBox: {
    width: 72, height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  heading: {
    fontFamily: fontFamilies.instrumentSerif,
    fontSize: fonts.xxl,
    color: colors.textDark,
    textAlign: 'center',
    marginBottom: 10,
  },
  subheading: {
    fontSize: fonts.sm,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 32,
  },
  btn: {
    width: '100%',
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: colors.white,
    fontSize: fonts.md,
    fontWeight: fonts.bold,
    letterSpacing: 0.3,
  },
});

export default RegistrationNextStep;
