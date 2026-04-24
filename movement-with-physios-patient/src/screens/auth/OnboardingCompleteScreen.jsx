import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { usePatient } from '../../context/PatientContext';

/**
 * Onboarding success screen — white bg, sequential mount animations,
 * fade-out transition before handing off to the Main navigator.
 */
export default function OnboardingCompleteScreen() {
  var { completeOnboarding } = usePatient();

  // ── Animation refs ────────────────────────────────────────────
  var screenOpacity = useRef(new Animated.Value(1)).current;
  var ringScale     = useRef(new Animated.Value(0)).current;
  var checkOpacity  = useRef(new Animated.Value(0)).current;
  var textSlide     = useRef(new Animated.Value(24)).current;
  var textOpacity   = useRef(new Animated.Value(0)).current;
  var btnSlide      = useRef(new Animated.Value(20)).current;
  var btnOpacity    = useRef(new Animated.Value(0)).current;

  useEffect(function () {
    Animated.sequence([
      // 1. Ring springs in
      Animated.spring(ringScale, {
        toValue: 1,
        stiffness: 180,
        damping: 14,
        useNativeDriver: true,
      }),
      // 2. Checkmark + heading fade/slide in together
      Animated.parallel([
        Animated.timing(checkOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(textOpacity,  { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(textSlide,    { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
      // 3. Button fades up
      Animated.parallel([
        Animated.timing(btnOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(btnSlide,   { toValue: 0, duration: 250, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  // ── Two-stage exit: content out → full screen white → state flip ──
  function handleNavigate() {
    Animated.parallel([
      Animated.timing(textOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(btnOpacity,  { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(ringScale,   { toValue: 0.85, duration: 250, useNativeDriver: true }),
    ]).start(function () {
      // Fade the entire screen to white so MainNavigator mounts into white
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(function () {
        completeOnboarding();
      });
    });
  }

  return (
    <Animated.View style={[styles.screenWrap, { opacity: screenOpacity }]}>
      <SafeAreaView style={styles.safe}>
        {/* ── Top decorative line ── */}
        <View style={styles.decorLine} />

        {/* ── Animated icon ── */}
        <Animated.View style={[styles.ringWrap, { transform: [{ scale: ringScale }] }]}>
          <View style={styles.outerRing}>
            <Animated.View style={[styles.innerCircle, { opacity: checkOpacity }]}>
              <Ionicons name="checkmark" size={36} color={colors.textOnPrimary} />
            </Animated.View>
          </View>
        </Animated.View>

        {/* ── Heading group ── */}
        <Animated.View
          style={[
            styles.headingGroup,
            { opacity: textOpacity, transform: [{ translateY: textSlide }] },
          ]}
        >
          <Text style={styles.heading}>You're all set.</Text>
          <Text style={styles.subheading}>
            {'Your recovery journey\nbegins now.'}
          </Text>

          {/* Dot divider */}
          <View style={styles.dotRow}>
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>

          {/* Reassurance copy */}
          <Text style={styles.reassurance}>
            {'Your therapist will reach out within 24 hours\nto confirm your first session.'}
          </Text>
        </Animated.View>

        {/* ── CTA button ── */}
        <Animated.View
          style={[
            styles.btnWrap,
            { opacity: btnOpacity, transform: [{ translateY: btnSlide }] },
          ]}
        >
          <Pressable style={styles.btn} onPress={handleNavigate}>
            <Text style={styles.btnText}>Go to Dashboard</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </Animated.View>
  );
}

var styles = StyleSheet.create({
  // Outermost wrapper — carries screenOpacity for full-screen fade
  screenWrap: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safe: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  // ── Decorative line ──
  decorLine: {
    width: 40,
    height: 3,
    backgroundColor: colors.primaryLight,
    borderRadius: 99,
    marginBottom: 48,
  },

  // ── Icon / ring ──
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: colors.primaryLight,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Heading group ──
  headingGroup: {
    marginTop: 32,
    alignItems: 'center',
  },
  heading: {
    fontFamily: fonts.heading.semibold,
    fontSize: 30,
    color: colors.textDark,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subheading: {
    fontFamily: fonts.heading.italic,
    fontSize: 18,
    color: colors.textMedium,
    marginTop: 10,
    lineHeight: 26,
    textAlign: 'center',
  },

  // ── Dot divider ──
  dotRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 32,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 99,
    backgroundColor: colors.primaryLight,
  },

  // ── Reassurance text ──
  reassurance: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.textLight,
    marginTop: 20,
    textAlign: 'center',
    lineHeight: 22,
  },

  // ── CTA button ──
  btnWrap: {
    width: '100%',
    marginTop: 48,
  },
  btn: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    fontFamily: fonts.body.semibold,
    fontSize: 15,
    color: colors.textOnPrimary,
    letterSpacing: 0.3,
  },
});
