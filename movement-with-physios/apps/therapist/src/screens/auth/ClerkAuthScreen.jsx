import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { apiClient } from '../../lib/apiClient';
import { colors } from '../../constants/colors';
import { fonts, fontFamilies } from '../../constants/fonts';
import ScreenContainer from '../../components/ScreenContainer';
import InputField from '../../components/InputField';
import AppButton from '../../components/AppButton';
import InlineBanner from '../../components/InlineBanner';

/**
 * ClerkAuthScreen — Email OTP for therapist app.
 *
 * Flow:
 *  1. If already signed in → auto-redirect to Dashboard immediately
 *  2. Enter email → Clerk sends 6-digit code
 *  3. Enter code → session created → Dashboard (existing user) or PersonalInfo (new user)
 *
 * Uses email OTP instead of phone OTP (Clerk blocks Indian +91 numbers on test plan).
 */
export default function ClerkAuthScreen() {
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();

  const [step, setStep] = useState('email');   // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [flow, setFlow] = useState(null);       // 'signIn' | 'signUp'
  const [banner, setBanner] = useState({ visible: false, message: '', variant: 'error' });

  const isReady = signInLoaded && signUpLoaded;

  /* Routing on auth state is handled by AppNavigator (it swaps to AppStack
     whenever isSignedIn becomes true). No imperative redirect needed here. */

  // Step-change transition: fade + small rise (~200ms).
  const stepAnim = useRef(new Animated.Value(1)).current;
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return; // skip animation on first mount; content renders at opacity 1
    }
    stepAnim.setValue(0);
    Animated.timing(stepAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [step]);

  function dismissBanner() {
    setBanner((b) => ({ ...b, visible: false }));
  }

  /* ── Step 1: Send email OTP ──────────────────────────────── */
  async function handleSendOTP() {
    if (!isReady || !email.trim()) return;
    setLoading(true);
    try {
      // Pre-flight: reject emails registered as patients BEFORE engaging the
      // Clerk OTP flow. Avoids the bad UX where the user enters a code, gets
      // signed in, and is immediately bounced out by the /me/init 409.
      const trimmed = email.trim().toLowerCase();
      const status = await apiClient.post('/auth/email-status', {
        email: trimmed,
        expectedRole: 'therapist',
      });
      if (status.success && status.data && status.data.ok === false) {
        setBanner({
          visible: true,
          variant: 'error',
          message:
            `This email is registered as a ${status.data.conflictRole}. ` +
            'Use the patient app to sign in, or use a different email here.',
        });
        setLoading(false);
        return;
      }
      // Try existing user sign-in first
      await signIn.create({ identifier: email.trim() });
      const factor = signIn.supportedFirstFactors?.find(
        (f) => f.strategy === 'email_code'
      );
      if (!factor) throw new Error('Email code not supported for this account');
      await signIn.prepareFirstFactor({
        strategy: 'email_code',
        emailAddressId: factor.emailAddressId,
      });
      setFlow('signIn');
      setStep('otp');
    } catch (err) {
      const code = err?.errors?.[0]?.code;
      const msg = (err?.message || '').toLowerCase();

      // Active session already exists — AppNavigator will route to AppStack
      // as soon as isSignedIn settles. Nothing to do here.
      if (
        code === 'session_exists' ||
        code === 'already_signed_in' ||
        msg.includes('already signed in') ||
        msg.includes('session exists')
      ) {
        return;
      }

      if (code === 'form_identifier_not_found') {
        // New therapist — sign up
        try {
          await signUp.create({ emailAddress: email.trim() });
          await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
          setFlow('signUp');
          setStep('otp');
        } catch (signUpErr) {
          setBanner({
            visible: true,
            variant: 'error',
            message: signUpErr?.errors?.[0]?.longMessage || signUpErr.message,
          });
        }
      } else {
        setBanner({
          visible: true,
          variant: 'error',
          message: err?.errors?.[0]?.longMessage || err.message,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  /* ── Step 2: Verify OTP ──────────────────────────────────── */
  async function handleVerifyOTP() {
    if (!isReady || !otp.trim()) return;
    setLoading(true);
    try {
      if (flow === 'signIn') {
        const result = await signIn.attemptFirstFactor({
          strategy: 'email_code',
          code: otp,
        });
        if (result.status === 'complete') {
          // Setting the active session flips isSignedIn → AppNavigator
          // swaps to AppStack automatically. No imperative navigation.
          await setSignInActive({ session: result.createdSessionId });
        } else {
          setBanner({
            visible: true,
            variant: 'error',
            message: `Status: ${result.status}. Please try again.`,
          });
        }
      } else {
        const result = await signUp.attemptEmailAddressVerification({ code: otp });
        if (result.status === 'complete') {
          await setSignUpActive({ session: result.createdSessionId });
          // AppStack lands new users on Dashboard. They can complete
          // PersonalInfo from there until we add an onboarding gate.
        } else {
          setBanner({
            visible: true,
            variant: 'error',
            message: `Status: ${result.status}. Please try again.`,
          });
        }
      }
    } catch (err) {
      setBanner({
        visible: true,
        variant: 'error',
        message: err?.errors?.[0]?.longMessage || err.message,
      });
    } finally {
      setLoading(false);
    }
  }

  /* ── UI ──────────────────────────────────────────────────── */
  const heroTitle = step === 'email' ? 'Welcome to MWP' : 'Verify your email';
  const heroSubtitle =
    step === 'email'
      ? "Enter your work email and we'll send a 6-digit code to sign you in."
      : `We sent a 6-digit code to ${email}. Enter it below to continue.`;

  const stepContentStyle = {
    opacity: stepAnim,
    transform: [
      { translateY: stepAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
    ],
  };

  return (
    <View style={styles.root}>
      <InlineBanner
        visible={banner.visible}
        message={banner.message}
        variant={banner.variant}
        onDismiss={dismissBanner}
      />

      <ScreenContainer style={styles.scrollContent}>
        <Text style={styles.stepIndicator}>
          {step === 'email' ? 'Step 1 of 2' : 'Step 2 of 2'}
        </Text>

        <Animated.View style={stepContentStyle}>
          <Ionicons
            name="medkit-outline"
            size={32}
            color="rgba(26, 92, 74, 0.4)"
            style={styles.heroIcon}
          />
          <Text style={styles.hero}>{heroTitle}</Text>
          <Text style={styles.subtitle}>{heroSubtitle}</Text>

          {step === 'email' ? (
            <>
              <InputField
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@clinic.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoFocus
              />
              <AppButton
                variant="pill"
                title="Continue"
                onPress={handleSendOTP}
                loading={loading}
                disabled={!email.trim() || loading}
              />
            </>
          ) : (
            <>
              <InputField
                label="Verification code"
                value={otp}
                onChangeText={setOtp}
                placeholder="••••••"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                inputStyle={styles.otpInput}
              />
              <AppButton
                variant="pill"
                title="Continue"
                onPress={handleVerifyOTP}
                loading={loading}
                disabled={!otp.trim() || loading}
              />
              <Pressable
                style={styles.changeEmail}
                onPress={() => {
                  setStep('email');
                  setOtp('');
                }}
              >
                <Text style={styles.changeEmailText}>← Change email</Text>
              </Pressable>
            </>
          )}
        </Animated.View>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scrollContent: { justifyContent: 'center', paddingVertical: 40 },
  stepIndicator: {
    fontFamily: fontFamilies.dmSans.medium,
    fontSize: 12,
    color: colors.textLight,
    letterSpacing: 0.5,
    marginBottom: 20,
  },
  heroIcon: { marginBottom: 16 },
  hero: {
    fontFamily: fontFamilies.instrumentSerif,
    fontSize: fonts.xxxl,
    lineHeight: fonts.xxxl * 1.2,
    color: colors.textDark,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: fontFamilies.dmSans.regular,
    fontSize: fonts.md,
    lineHeight: fonts.md * 1.5,
    color: colors.textMedium,
    marginBottom: 28,
  },
  otpInput: {
    letterSpacing: 8,
    textAlign: 'center',
    fontSize: fonts.xl,
  },
  changeEmail: { alignItems: 'center', marginTop: 18 },
  changeEmailText: {
    fontFamily: fontFamilies.dmSans.semibold,
    fontSize: 14,
    color: colors.primary,
  },
});
