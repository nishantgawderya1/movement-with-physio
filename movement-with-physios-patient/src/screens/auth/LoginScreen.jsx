import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { PATIENT_ROUTES } from '../../constants/routes';

const FEATURES = [
  {
    icon: 'location-outline',
    title: 'Made for India',
    subtitle: 'Designed for Indian healthcare needs',
  },
  {
    icon: 'people-outline',
    title: 'Therapist Supervised',
    subtitle: 'Licensed professionals monitor your progress',
  },
  {
    icon: 'lock-closed-outline',
    title: 'Secure & Encrypted',
    subtitle: 'Only you can access your medical information',
  },
];

/**
 * Login / welcome screen.
 * CTA "Start My Recovery" → PersonalInfo onboarding.
 * CTA "Login" → ClerkAuth stub.
 *
 * @param {{ navigation: object }} props
 */
export default function LoginScreen({ navigation }) {
  function handleStartRecovery() {
    navigation.navigate(PATIENT_ROUTES.PERSONAL_INFO);
  }

  function handleLogin() {
    navigation.navigate(PATIENT_ROUTES.CLERK_AUTH);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero heading */}
        <View style={styles.heroSection}>
          <Text style={styles.heading}>Welcome !!</Text>
          <Text style={styles.subtitle}>
            Your personal physiotherapy companion.{'\n'}
            Start healing, one step at a time.
          </Text>
        </View>

        {/* Feature rows */}
        <View style={styles.featuresSection}>
          {FEATURES.map(function (feature) {
            return (
              <View key={feature.icon} style={styles.featureRow}>
                <View style={styles.iconCircle}>
                  <Ionicons name={feature.icon} size={22} color={colors.primary} />
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* CTAs — pinned outside scroll */}
      <View style={styles.ctaSection}>
        <Pressable onPress={handleStartRecovery} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Start My Recovery</Text>
        </Pressable>
        <Pressable onPress={handleLogin} style={styles.outlineBtn}>
          <Text style={styles.outlineBtnText}>Login</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  heading: {
    fontFamily: fonts.heading.regular,
    fontSize: fonts.xxxl,
    lineHeight: fonts.xxxl * 1.35,
    color: colors.textDark,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: fonts.sm,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: fonts.sm * 1.6,
  },
  featuresSection: {
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: fonts.md,
    fontWeight: fonts.semibold,
    color: colors.textDark,
    marginBottom: 2,
  },
  featureSubtitle: {
    fontSize: fonts.sm,
    color: colors.textLight,
    lineHeight: fonts.sm * 1.5,
  },
  ctaSection: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: colors.white,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: colors.textOnPrimary,
    fontSize: fonts.md,
    fontWeight: fonts.semibold,
  },
  outlineBtn: {
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  outlineBtnText: {
    color: colors.primary,
    fontSize: fonts.md,
    fontWeight: fonts.semibold,
  },
});
