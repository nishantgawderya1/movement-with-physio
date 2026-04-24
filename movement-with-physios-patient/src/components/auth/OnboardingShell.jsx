import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';

const TOTAL_STEPS = 7;

/**
 * Shared layout shell for every onboarding step screen.
 *
 * @param {{ step: number, heading: string, subtitle: string,
 *   onBack?: () => void, onContinue: () => void,
 *   isContinueDisabled: boolean, continueLabel?: string,
 *   children: React.ReactNode }} props
 */
export default function OnboardingShell({
  step,
  heading,
  subtitle,
  onBack,
  onContinue,
  isContinueDisabled,
  continueLabel = 'Continue',
  children,
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={onBack}
            style={styles.backBtn}
            hitSlop={12}
            disabled={!onBack}
          >
            {onBack ? (
              <Ionicons name="chevron-back" size={24} color={colors.textDark} />
            ) : (
              <View style={styles.backPlaceholder} />
            )}
          </Pressable>
          <Text style={styles.stepText}>
            Step {step} of {TOTAL_STEPS}
          </Text>
        </View>

        {/* Scrollable content */}
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.heading}>{heading}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <View style={styles.childrenWrapper}>
            {children}
          </View>
        </ScrollView>

        {/* Footer — outside ScrollView so it stays fixed */}
        <View style={styles.footer}>
          <Pressable
            onPress={isContinueDisabled ? undefined : onContinue}
            style={[styles.continueBtn, isContinueDisabled && styles.continueBtnDisabled]}
            accessibilityRole="button"
            accessibilityLabel={continueLabel}
          >
            <Text style={styles.continueBtnText}>{continueLabel}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backPlaceholder: {
    width: 24,
    height: 24,
  },
  stepText: {
    fontSize: fonts.sm,
    color: colors.textLight,
    fontWeight: fonts.medium,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  childrenWrapper: {
    flex: 1,
  },
  heading: {
    fontFamily: fonts.heading.regular,
    fontSize: fonts.xxl,
    lineHeight: fonts.xxl * 1.35,
    color: colors.textDark,
    marginTop: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: fonts.md,
    color: colors.textMedium,
    marginBottom: 32,
    lineHeight: fonts.md * 1.5,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: colors.background,
  },
  continueBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueBtnDisabled: {
    backgroundColor: colors.primaryLight,
    opacity: 0.7,
  },
  continueBtnText: {
    color: colors.textOnPrimary,
    fontSize: fonts.md,
    fontWeight: fonts.semibold,
  },
});
