// src/screens/auth/PersonalInfoScreen.jsx
// ─────────────────────────────────────────────────────────────────────────────
// FIGMA REFERENCE: Personal Info Screen — "What's Your Name?"
// Part of therapist onboarding flow after mobile OTP verification.
// Backend developer: wire up handleContinue to save name via TherapistService
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect } from 'react';
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
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts, fontFamilies } from '../../constants/fonts';

const PersonalInfoScreen = ({ navigation }) => {

  // ── Form state ────────────────────────────────────────────────────────────
  const [fullName, setFullName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // ── Fade-in animation on screen load ─────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // MOCK HANDLER
  // Backend developer: replace this function body only.
  // Import TherapistService and save the name to the user profile.
  // ─────────────────────────────────────────────────────────────────────────
  const handleContinue = () => {
    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (fullName.trim().length < 3) {
      setErrorMessage('Please enter a valid full name.');
      return;
    }
    setErrorMessage('');
    console.log('[MOCK] Full name saved:', fullName.trim());
    // TODO: await TherapistService.savePersonalInfo({ fullName: fullName.trim() });
    navigation.navigate('ProfessionalCredentials'); // placeholder — update when next screen is ready
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Top Bar ─────────────────────────────────────────────── */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={22} color={colors.textDark} />
            </TouchableOpacity>
            <View style={styles.brandRow}>
              <View style={styles.brandIcon}>
                <Ionicons name="pulse" size={16} color={colors.white} />
              </View>
              <Text style={styles.brandText}>Join us !</Text>
            </View>
          </View>

          {/* ── Animated content wrapper ─────────────────────────────── */}
          <Animated.View style={[
            styles.contentWrapper,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}>

            {/* ── User Icon ────────────────────────────────────────── */}
            {/* Circular teal icon with person silhouette inside       */}
            <View style={styles.userIconBox}>
              <Ionicons name="person" size={30} color={colors.white} />
            </View>

            {/* ── Main Heading ─────────────────────────────────────── */}
            {/* Figma: large, Instrument Serif, dark                   */}
            <Text style={styles.heading}>What's Your Name?</Text>

            {/* ── Clarification text ───────────────────────────────── */}
            <Text style={styles.clarification}>
              Used for your therapist profile and{'\n'}visible to patients.
            </Text>

            {/* ── Secondary text ───────────────────────────────────── */}
            <Text style={styles.secondary}>
              This will be displayed to your clients.
            </Text>

            {/* ── Input Card ───────────────────────────────────────── */}
            <View style={styles.card}>

              <Text style={styles.label}>Full Name</Text>

              <View style={[
                styles.inputWrapper,
                errorMessage ? styles.inputError : null,
              ]}>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={val => {
                    setFullName(val);
                    setErrorMessage('');
                  }}
                  placeholder="Dr. Anjali Sharma"
                  placeholderTextColor={colors.textLight}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleContinue}
                />
              </View>

              {/* Inline error banner */}
              {errorMessage ? (
                <View style={styles.errorBanner}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={15}
                    color="#C53030"
                  />
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
              ) : null}

            </View>

            {/* ── Continue Button ──────────────────────────────────── */}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                !fullName.trim() && styles.primaryBtnDisabled,
              ]}
              onPress={handleContinue}
              disabled={!fullName.trim()}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Continue</Text>
            </TouchableOpacity>

          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background },
  flex:    { flex: 1 },
  scroll:  {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // ── Top Bar ───────────────────────────────────────────────────────────────
  topBar:    { flexDirection: 'row', alignItems: 'center', marginBottom: 36 },
  backBtn:   { padding: 4, marginRight: 12 },
  brandRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandIcon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  brandText: {
    fontFamily: fontFamilies.instrumentSerif,
    fontSize: fonts.lg,
    color: colors.textDark,
  },

  // ── Content wrapper ───────────────────────────────────────────────────────
  contentWrapper: { flex: 1 },

  // ── User icon ─────────────────────────────────────────────────────────────
  userIconBox: {
    width: 68, height: 68,
    borderRadius: 34,               // circular — not rounded square
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },

  // ── Headings ──────────────────────────────────────────────────────────────
  heading: {
    fontFamily: fontFamilies.instrumentSerif,
    fontSize: fonts.xxl,
    fontWeight: fonts.bold,
    color: colors.textDark,
    marginBottom: 8,
  },
  clarification: {
    fontSize: fonts.sm,
    color: colors.textLight,
    lineHeight: 20,
    marginBottom: 4,
  },
  secondary: {
    fontSize: fonts.xs,
    color: colors.textLight,
    marginBottom: 28,
    fontStyle: 'italic',
  },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  label: {
    fontSize: fonts.sm,
    fontWeight: fonts.semibold,
    color: colors.textDark,
    marginBottom: 8,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    height: 50,
    justifyContent: 'center',
  },
  inputError: {
    borderColor: '#FC8181',
  },
  input: {
    fontSize: fonts.md,
    color: colors.textDark,
    flex: 1,
  },

  // ── Error banner ──────────────────────────────────────────────────────────
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FED7D7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    gap: 8,
  },
  errorBannerText: {
    fontSize: fonts.xs,
    color: '#C53030',
    flex: 1,
    lineHeight: 18,
  },

  // ── Button ────────────────────────────────────────────────────────────────
  primaryBtn: {
    width: '100%', height: 52,
    backgroundColor: colors.primary,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: {
    color: colors.white,
    fontSize: fonts.md,
    fontWeight: fonts.bold,
    letterSpacing: 0.3,
  },
});

export default PersonalInfoScreen;
