// src/screens/auth/ProfessionalCredentialsScreen.jsx
// ─────────────────────────────────────────────────────────────────────────────
// FIGMA REFERENCE: Professional Credentials Screen
// Part of therapist onboarding flow — comes after PersonalInfoScreen.
// Backend developer: wire up handleContinue to save credentials via TherapistService
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

const ProfessionalCredentialsScreen = ({ navigation }) => {

  // ── Form state ────────────────────────────────────────────────────────────
  const [degree, setDegree]           = useState('');
  const [licenseNumber, setLicense]   = useState('');
  const [yearsExp, setYearsExp]       = useState('');
  const [specialization, setSpecial]  = useState('');
  const [errors, setErrors]           = useState({});

  // ── Refs for keyboard "next" flow ─────────────────────────────────────────
  const licenseRef  = useRef(null);
  const yearsRef    = useRef(null);
  const specialRef  = useRef(null);

  // ── Fade-in animation on screen load ─────────────────────────────────────
  const fadeAnim  = useRef(new Animated.Value(0)).current;
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

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const newErrors = {};
    if (!degree.trim())        newErrors.degree      = 'Degree / Qualification is required.';
    if (!licenseNumber.trim()) newErrors.license     = 'License number is required.';
    if (!yearsExp.trim())      newErrors.yearsExp    = 'Years of experience is required.';
    else if (isNaN(Number(yearsExp)) || Number(yearsExp) < 0)
                               newErrors.yearsExp    = 'Enter a valid number.';
    if (!specialization.trim()) newErrors.special    = 'Specialization is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // MOCK HANDLER
  // Backend developer: replace this function body only.
  // Import TherapistService and save credentials to the user profile.
  // ─────────────────────────────────────────────────────────────────────────
  const handleContinue = () => {
    if (!validate()) return;
    const payload = {
      degree:         degree.trim(),
      licenseNumber:  licenseNumber.trim(),
      yearsOfExperience: Number(yearsExp.trim()),
      specialization: specialization.trim(),
    };
    console.log('[MOCK] Professional credentials saved:', payload);
    // TODO: await TherapistService.saveCredentials(payload);
    navigation.navigate('GovernmentIDVerification'); // update route when next screen is ready
  };

  const isFormFilled =
    degree.trim() && licenseNumber.trim() && yearsExp.trim() && specialization.trim();

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
            </View>
          </View>

          {/* ── Animated content wrapper ─────────────────────────────── */}
          <Animated.View style={[
            styles.contentWrapper,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}>

            {/* ── Badge / Credential Icon ───────────────────────────── */}
            <View style={styles.badgeIconBox}>
              <Ionicons name="ribbon-outline" size={30} color={colors.primary} />
            </View>

            {/* ── Main Heading ─────────────────────────────────────── */}
            <Text style={styles.heading}>Professional Credentials</Text>

            {/* ── Subtitle ─────────────────────────────────────────── */}
            <Text style={styles.subtitle}>Help us verify your qualifications</Text>

            {/* ── Input Card ───────────────────────────────────────── */}
            <View style={styles.card}>

              {/* Degree / Qualification */}
              <Text style={styles.label}>Degree / Qualification</Text>
              <View style={[styles.inputWrapper, errors.degree && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  value={degree}
                  onChangeText={val => { setDegree(val); setErrors(e => ({ ...e, degree: '' })); }}
                  placeholder="e.g., BPT, MPT"
                  placeholderTextColor={colors.placeholder}
                  autoCapitalize="characters"
                  returnKeyType="next"
                  onSubmitEditing={() => licenseRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>
              {errors.degree ? <Text style={styles.errorText}>{errors.degree}</Text> : null}

              {/* License Number */}
              <Text style={[styles.label, styles.labelSpacing]}>License Number</Text>
              <View style={[styles.inputWrapper, errors.license && styles.inputError]}>
                <TextInput
                  ref={licenseRef}
                  style={styles.input}
                  value={licenseNumber}
                  onChangeText={val => { setLicense(val); setErrors(e => ({ ...e, license: '' })); }}
                  placeholder="Professional license number"
                  placeholderTextColor={colors.placeholder}
                  autoCapitalize="characters"
                  returnKeyType="next"
                  onSubmitEditing={() => yearsRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>
              {errors.license ? <Text style={styles.errorText}>{errors.license}</Text> : null}

              {/* Years of Experience */}
              <Text style={[styles.label, styles.labelSpacing]}>Years of Experience</Text>
              <View style={[styles.inputWrapper, errors.yearsExp && styles.inputError]}>
                <TextInput
                  ref={yearsRef}
                  style={styles.input}
                  value={yearsExp}
                  onChangeText={val => { setYearsExp(val); setErrors(e => ({ ...e, yearsExp: '' })); }}
                  placeholder="e.g., 5"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="numeric"
                  returnKeyType="next"
                  onSubmitEditing={() => specialRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>
              {errors.yearsExp ? <Text style={styles.errorText}>{errors.yearsExp}</Text> : null}

              {/* Specialization */}
              <Text style={[styles.label, styles.labelSpacing]}>Specialization</Text>
              <View style={[styles.inputWrapper, errors.special && styles.inputError]}>
                <TextInput
                  ref={specialRef}
                  style={styles.input}
                  value={specialization}
                  onChangeText={val => { setSpecial(val); setErrors(e => ({ ...e, special: '' })); }}
                  placeholder="e.g., Sports Physiotherapy"
                  placeholderTextColor={colors.placeholder}
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={handleContinue}
                />
              </View>
              {errors.special ? <Text style={styles.errorText}>{errors.special}</Text> : null}

            </View>

            {/* ── Continue Button ──────────────────────────────────── */}
            <TouchableOpacity
              style={[styles.primaryBtn, !isFormFilled && styles.primaryBtnDisabled]}
              onPress={handleContinue}
              disabled={!isFormFilled}
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
  safe:   { flex: 1, backgroundColor: colors.background },
  flex:   { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // ── Top Bar ───────────────────────────────────────────────────────────────
  topBar:    { flexDirection: 'row', alignItems: 'center', marginBottom: 36 },
  backBtn:   { padding: 4, marginRight: 12 },
  brandRow:  { flexDirection: 'row', alignItems: 'center' },
  brandIcon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },

  // ── Content wrapper ───────────────────────────────────────────────────────
  contentWrapper: { flex: 1 },

  // ── Badge icon ────────────────────────────────────────────────────────────
  badgeIconBox: {
    width: 68, height: 68,
    borderRadius: 34,
    backgroundColor: colors.primaryLight,   // light teal circle
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },

  // ── Headings ──────────────────────────────────────────────────────────────
  heading: {
    fontFamily: fontFamilies.instrumentSerif,
    fontSize: fonts.xxl,
    fontWeight: fonts.bold,
    color: colors.textDark,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: fonts.sm,
    color: colors.textMedium,
    marginBottom: 28,
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

  // ── Labels & inputs ───────────────────────────────────────────────────────
  label: {
    fontSize: fonts.sm,
    fontWeight: fonts.semibold,
    color: colors.textDark,
    marginBottom: 8,
  },
  labelSpacing: { marginTop: 16 },
  inputWrapper: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    height: 50,
    justifyContent: 'center',
  },
  inputError: { borderColor: '#FC8181' },
  input: {
    fontSize: fonts.md,
    color: colors.textDark,
    flex: 1,
  },
  errorText: {
    color: colors.error,
    fontSize: fonts.xs,
    marginTop: 5,
    marginLeft: 2,
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

export default ProfessionalCredentialsScreen;
