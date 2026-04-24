// src/screens/auth/BookingConfirmedScreen.jsx
// ─────────────────────────────────────────────────────────────────────────────
// FIGMA REFERENCE: Booking Confirmed Splash Screen
// Shown for 3 seconds after "Confirm Booking" — then auto-advances.
//
// Receives route.params: { selectedDate: 'Mon, 9 Mar' }
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts, fontFamilies } from '../../constants/fonts';

const DISPLAY_DURATION = 3000; // ms before auto-advance
const NEXT_SCREEN      = 'PendingVerificationDashboard';

const BookingConfirmedScreen = ({ navigation, route }) => {
  const selectedDate = route?.params?.selectedDate ?? null;

  // ── Animations ──────────────────────────────────────────────────────────────
  const scaleBounce = useRef(new Animated.Value(0)).current;
  const fadeContent = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Bounce in the checkmark circle
    Animated.spring(scaleBounce, {
      toValue: 1,
      tension: 60,
      friction: 6,
      useNativeDriver: true,
    }).start();

    // 2. Fade in text content slightly after
    Animated.timing(fadeContent, {
      toValue: 1,
      duration: 500,
      delay: 300,
      useNativeDriver: true,
    }).start();

    // 3. Progress bar fills over DISPLAY_DURATION
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: DISPLAY_DURATION,
      useNativeDriver: false, // width cannot use native driver
    }).start();

    // 4. Auto-navigate after duration
    const timer = setTimeout(() => {
      navigation.replace(NEXT_SCREEN);
    }, DISPLAY_DURATION);

    return () => clearTimeout(timer);
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* ── Checkmark circle ────────────────────────────────────── */}
        <Animated.View style={[styles.checkCircle, { transform: [{ scale: scaleBounce }] }]}>
          {/* Outer glow ring */}
          <View style={styles.glowRing} />
          <Ionicons name="checkmark" size={52} color={colors.white} />
        </Animated.View>

        {/* ── Text content ─────────────────────────────────────────── */}
        <Animated.View style={[styles.textBlock, { opacity: fadeContent }]}>
          <Text style={styles.heading}>Booking Confirmed!</Text>
          <Text style={styles.subtitle}>
            Your verification call has been{'\n'}successfully scheduled.
          </Text>

          {selectedDate ? (
            <View style={styles.datePill}>
              <Ionicons name="calendar-outline" size={15} color={colors.primary} />
              <Text style={styles.datePillText}>{selectedDate}</Text>
            </View>
          ) : null}

          <Text style={styles.note}>
            Our team will reach out to you on the selected date to verify your credentials and complete your onboarding.
          </Text>
        </Animated.View>

        {/* ── Progress bar ─────────────────────────────────────────── */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.progressLabel}>Taking you to next step…</Text>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 48,
  },

  // Checkmark
  checkCircle: {
    width: 110, height: 110,
    borderRadius: 55,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 36,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  glowRing: {
    position: 'absolute',
    width: 130, height: 130,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: colors.primary,
    opacity: 0.2,
  },

  // Text
  textBlock:  { alignItems: 'center', marginBottom: 48 },
  heading: {
    fontFamily: fontFamilies.instrumentSerif,
    fontSize: fonts.xxl,
    fontWeight: fonts.bold,
    color: colors.textDark,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fonts.sm,
    color: colors.textMedium,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },

  // Date pill
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 20,
  },
  datePillText: {
    fontSize: fonts.sm,
    fontWeight: fonts.semibold,
    color: colors.primary,
  },

  note: {
    fontSize: fonts.xs,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },

  // Progress bar
  progressTrack: {
    width: '70%',
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.cardBorder,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  progressLabel: {
    fontSize: fonts.xs,
    color: colors.textLight,
    fontStyle: 'italic',
  },
});

export default BookingConfirmedScreen;
