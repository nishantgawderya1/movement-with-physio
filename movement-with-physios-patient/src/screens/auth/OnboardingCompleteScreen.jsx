import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { usePatient } from '../../context/PatientContext';
import { markPending as markPendingOnboarding } from '../../lib/pendingOnboarding';
import { apiClient } from '../../lib/apiClient';
import { tokenProvider } from '../../lib/tokenProvider';

/**
 * Wait (≤3s) for Clerk to mint a session JWT before the authenticated write.
 * After setActive() (signup) the token takes a few hundred ms to mint; without
 * it the POST goes out unauthenticated and 401s. Mirrors ClerkTokenBridge.
 * @returns {Promise<string|null>}
 */
async function awaitToken() {
  for (var i = 0; i < 15; i++) {
    var t = await tokenProvider.getToken();
    if (t) return t;
    await new Promise(function (r) { setTimeout(r, 200); });
  }
  return null;
}

/**
 * THE reliable backend write of onboarding completion, called by BOTH the
 * signup and the already-signed-in paths. Backend initUser backfills
 * onboardingCompleted on the existing user (idempotent), so this is safe
 * alongside ClerkTokenBridge's pending-flag write — making that bridge write
 * a redundant backup rather than the single load-bearing path it used to be.
 * @returns {Promise<{ success: boolean, status?: number, error?: string }>}
 */
async function persistOnboardingComplete() {
  await awaitToken();
  return apiClient.post('/auth/me/init', { role: 'patient', onboardingCompleted: true });
}

/**
 * Onboarding success screen — white bg, sequential mount animations,
 * fade-out transition before handing off to the Main navigator.
 */
export default function OnboardingCompleteScreen() {
  var { completeOnboarding, refresh } = usePatient();
  var [isSubmitting, setIsSubmitting] = useState(false);
  var [persistError, setPersistError] = useState(null);

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

  // ── Two-stage exit animation (success only): content out → full screen white.
  // Runs onDone after the fade so the gate swap happens behind the white.
  function runExitAnimation(onDone) {
    Animated.parallel([
      Animated.timing(textOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(btnOpacity,  { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(ringScale,   { toValue: 0.85, duration: 250, useNativeDriver: true }),
    ]).start(function () {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(function () {
        if (onDone) onDone();
      });
    });
  }

  // Completion handler. Persistence is the FIRST thing we do — and it ALWAYS
  // runs (both signup and already-signed-in paths) via persistOnboardingComplete.
  // We only flip the local gate (completeOnboarding) on a SUCCESSFUL write;
  // a failed write keeps the user here with a retry affordance instead of
  // faking a dashboard that silently re-traps on relaunch.
  async function handleNavigate() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setPersistError(null);

    // Capture before nulling — also tells us whether the screen will unmount
    // immediately (signup setActive flips isSignedIn → gate swaps away).
    var pending = global.__pendingClerkSession;

    try {
      if (pending) {
        // Signup: the session must activate first so the authenticated write
        // has a token. markPending() keeps the bridge write as a backup; the
        // direct POST below is now the load-bearing one.
        global.__pendingClerkSession = null;
        markPendingOnboarding();
        await pending.setActive({ session: pending.sessionId });
      }

      var res = await persistOnboardingComplete();

      if (!res || !res.success) {
        // Do NOT flip the local gate — that would show a dashboard backed by
        // nothing and silently re-trap on relaunch (the exact failure that
        // made this bug so hard to find). Surface a retryable error.
        // eslint-disable-next-line no-console
        console.warn('[OnboardingComplete] persist failed:', res && res.status, res && res.error);
        setIsSubmitting(false);
        if (pending) {
          // Signup: setActive already swapped the gate away from this screen,
          // so an on-screen banner can't show — surface via Alert. The gate
          // falls back to the honest backend state (no fake dashboard).
          Alert.alert('Couldn’t save your details', 'Please try again.');
        } else {
          setPersistError("Couldn't save your details. Please try again.");
        }
        return;
      }

      // Success: flip the local gate + re-read the backend so context matches.
      if (pending) {
        // Signup: the gate already swapped at setActive; finalize context.
        completeOnboarding();
        if (typeof refresh === 'function') refresh();
      } else {
        // Already signed in: fade out, then flip the gate behind the white.
        runExitAnimation(function () {
          completeOnboarding();
          if (typeof refresh === 'function') refresh();
        });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[OnboardingComplete] persist threw:', e && e.message);
      setIsSubmitting(false);
      if (pending) {
        Alert.alert('Couldn’t save your details', 'Please try again.');
      } else {
        setPersistError("Couldn't save your details. Please try again.");
      }
    }
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
          <Pressable
            style={[styles.btn, isSubmitting && styles.btnDisabled]}
            onPress={handleNavigate}
            disabled={isSubmitting}
          >
            <Text style={styles.btnText}>
              {isSubmitting ? 'Saving…' : (persistError ? 'Try again' : 'Go to Dashboard')}
            </Text>
          </Pressable>
          {persistError ? (
            <Text style={styles.errorText}>{persistError}</Text>
          ) : null}
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
  btnDisabled: {
    backgroundColor: colors.primaryLight,
    opacity: 0.7,
  },
  errorText: {
    fontFamily: fonts.body.medium,
    fontSize: fonts.sm,
    color: colors.danger,
    textAlign: 'center',
    marginTop: 14,
  },
});
