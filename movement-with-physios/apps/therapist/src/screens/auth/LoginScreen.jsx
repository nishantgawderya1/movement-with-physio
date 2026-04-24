// src/screens/auth/LoginScreen.jsx
// ─────────────────────────────────────────────────────────────────────────────
// FIGMA REFERENCE: Screen 2 — Login/Signup Screen
// Design: Welcome screen with feature highlights + two CTA buttons
// "Start My Recovery" navigates to Register (placeholder)
// "Login" navigates to the actual login form (placeholder — backend connects here)
// DO NOT modify navigation targets — backend developer will wire these up
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from 'react-native';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';

const { width } = Dimensions.get('window');

// ── Feature card data ────────────────────────────────────────────────────────
// Matches the 3 rows shown in Figma exactly
const FEATURES = [
  {
    id: '1',
    icon: '📍',
    title: 'Made for India',
    description: 'Your Digital Physiotherapy Assistant.',
  },
  {
    id: '2',
    icon: '🧑‍⚕️',
    title: 'Scale Fast beyond your Clinic',
    description: 'Monitor More Patients. Maintain Clinical Control.',
  },
  {
    id: '3',
    icon: '🛡️',
    title: 'Secure & Encrypted',
    description: "Only you can access patient's medical information",
  },
];

// ── Feature Card Component ───────────────────────────────────────────────────
const FeatureCard = ({ icon, title, description }) => (
  <View style={styles.featureCard}>
    <Text style={styles.featureIcon}>{icon}</Text>
    <View style={styles.featureText}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDesc}>{description}</Text>
    </View>
  </View>
);

// ── Main Screen ──────────────────────────────────────────────────────────────
const LoginScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Heading ──────────────────────────────────────────────── */}
        <Text style={styles.heading}>Welcome !!</Text>

        {/* ── Subtitle ─────────────────────────────────────────────── */}
        <Text style={styles.subtitle}>
          {"Scale Your Practice Without Compromising\nCare. Extend Your Clinic Beyond Walls"}
        </Text>

        {/* ── Feature Cards ────────────────────────────────────────── */}
        <View style={styles.featuresWrapper}>
          {FEATURES.map((f) => (
            <FeatureCard
              key={f.id}
              icon={f.icon}
              title={f.title}
              description={f.description}
            />
          ))}
        </View>

        {/* ── CTA Buttons ──────────────────────────────────────────── */}
        <View style={styles.buttonsWrapper}>

          {/* Primary: Start My Recovery */}
          <TouchableOpacity
            style={styles.buttonPrimary}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('ClerkAuth')}
          >
            <Text style={styles.buttonPrimaryText}>Activate My Clinic</Text>
          </TouchableOpacity>

          {/* Outline: Login */}
          <TouchableOpacity
            style={styles.buttonOutline}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('TherapistPortal')}
          >
            <Text style={styles.buttonOutlineText}>Login</Text>
          </TouchableOpacity>

        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,   // Figma: #F7FAFC
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,                 // Figma: 24px horizontal padding
    paddingTop: 48,
    paddingBottom: 40,
    alignItems: 'center',
  },

  // ── Heading ─────────────────────────────────────────────────────────────
  heading: {
    fontSize: fonts.xxxl,                  // Figma: large bold heading
    fontWeight: fonts.extrabold,
    color: colors.textDark,
    textAlign: 'center',
    marginBottom: 14,
  },

  // ── Subtitle ────────────────────────────────────────────────────────────
  subtitle: {
    fontSize: fonts.sm,
    fontWeight: fonts.regular,
    color: colors.textLight,              // Figma: gray subtitle
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },

  // ── Feature Cards ───────────────────────────────────────────────────────
  featuresWrapper: {
    width: '100%',
    gap: 12,                              // Figma: ~12px gap between cards
    marginBottom: 36,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.cardBorder,       // Figma: light gray border on cards
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  featureIcon: {
    fontSize: 22,
    width: 32,
    textAlign: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: fonts.md,
    fontWeight: fonts.semibold,
    color: colors.textDark,              // Figma: dark title in each card
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: fonts.sm,
    fontWeight: fonts.regular,
    color: colors.textLight,             // Figma: gray description
    lineHeight: 18,
  },

  // ── Buttons ─────────────────────────────────────────────────────────────
  buttonsWrapper: {
    width: '100%',
    gap: 12,
  },
  buttonPrimary: {
    width: '100%',
    height: 52,                          // Figma: pill button height
    backgroundColor: colors.buttonPrimary, // Figma: dark teal filled
    borderRadius: 30,                    // Figma: full pill shape
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPrimaryText: {
    fontSize: fonts.md,
    fontWeight: fonts.bold,
    color: colors.buttonPrimaryText,    // White text on filled button
    letterSpacing: 0.3,
  },
  buttonOutline: {
    width: '100%',
    height: 52,
    backgroundColor: colors.white,
    borderRadius: 30,                    // Figma: full pill shape
    borderWidth: 1.5,
    borderColor: colors.buttonOutlineBorder, // Figma: teal border
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonOutlineText: {
    fontSize: fonts.md,
    fontWeight: fonts.semibold,
    color: colors.buttonOutlineText,    // Teal text on outline button
    letterSpacing: 0.3,
  },
});

export default LoginScreen;
