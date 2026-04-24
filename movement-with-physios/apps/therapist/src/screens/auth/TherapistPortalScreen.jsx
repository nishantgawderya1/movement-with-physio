// src/screens/auth/TherapistPortalScreen.jsx
// ─────────────────────────────────────────────────────────────────────────────
// FIGMA REFERENCE: iPhone 17-1 — Therapist Portal Screen
// This is a NEW screen — does not replace or modify LoginScreen
// Backend developer: only replace the handleSignIn mock function below
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts, fontFamilies } from '../../constants/fonts';

const TherapistPortalScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ── MOCK — Backend developer: replace this block only ────────────────────
  const handleSignIn = () => {
    console.log('[MOCK] Sign In — Email:', email);
    // TODO: import AuthService and call AuthService.login(email, password)
    // TODO: on success → navigate to Dashboard
    // TODO: on failure → show error message
  };
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Teal Icon Box with Pulse ──────────────────────────── */}
          <View style={styles.iconBox}>
            <Ionicons name="pulse" size={36} color={colors.white} />
          </View>

          {/* ── Heading ──────────────────────────────────────────── */}
          <Text style={styles.heading}>Therapist Portal</Text>
          <Text style={styles.subheading}>Sign in to manage your clients</Text>

          {/* ── Form Card ────────────────────────────────────────── */}
          <View style={styles.card}>
            {/* Email */}
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="doctor@reviveai.com"
                placeholderTextColor={colors.placeholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            {/* Password */}
            <Text style={[styles.label, styles.labelGap]}>Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.placeholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={colors.textLight}
                />
              </TouchableOpacity>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotRow}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* ── Sign In Button ────────────────────────────────────── */}
          <TouchableOpacity
            style={styles.signInBtn}
            activeOpacity={0.85}
            onPress={handleSignIn}
          >
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 52,
    paddingBottom: 40,
    alignItems: 'center',
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  heading: {
    fontFamily: fontFamilies.instrumentSerif,
    fontSize: 26,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 6,
  },
  subheading: {
    fontSize: fonts.sm,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 32,
  },
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  label: {
    fontSize: fonts.sm,
    fontWeight: fonts.semibold,
    color: colors.textDark,
    marginBottom: 6,
  },
  labelGap: { marginTop: 16 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    backgroundColor: colors.inputBg,
    paddingHorizontal: 14,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: fonts.md,
    color: colors.textDark,
  },
  eyeBtn: { padding: 4 },
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: 12,
  },
  forgotText: {
    fontSize: fonts.sm,
    color: colors.primary,
    fontWeight: fonts.semibold,
  },
  signInBtn: {
    width: '100%',
    height: 52,
    backgroundColor: colors.buttonPrimary,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    fontSize: fonts.md,
    color: colors.buttonPrimaryText,
    fontWeight: fonts.bold,
    letterSpacing: 0.3,
  },
});

export default TherapistPortalScreen;
