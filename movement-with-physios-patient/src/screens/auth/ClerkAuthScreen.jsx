import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { PATIENT_ROUTES } from '../../constants/routes';
import { apiClient } from '../../lib/apiClient';
import ScreenContainer from '../../components/common/ScreenContainer';
import TextField from '../../components/ui/TextField';
import AuthPillButton from '../../components/auth/AuthPillButton';
import InlineBanner from '../../components/common/InlineBanner';

/**
 * Email OTP screen — handles two distinct modes:
 *
 *  mode = 'signup'  (Start My Recovery button)
 *    → Creates a new account via Clerk OTP
 *    → On success, stores pending session and navigates to PersonalInfo onboarding
 *    → OnboardingCompleteScreen activates the Clerk session at the end
 *
 *  mode = 'signin'  (Login button)
 *    → Signs in an existing account via Clerk OTP
 *    → On success, calls setActive → RootNavigator detects isSignedIn=true
 *      and auto-switches to MainNavigator (no manual navigation needed)
 *    → If account not found → shows error asking user to Start My Recovery
 */
export default function ClerkAuthScreen({ navigation, route }) {
  const mode = route?.params?.mode ?? 'signin'; // 'signup' | 'signin'

  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();

  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState({ visible: false, message: '', variant: 'error' });

  const isReady = signInLoaded && signUpLoaded;

  const isSignUp = mode === 'signup';

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

  /* ── Step 1: Send email OTP ──────────────────────────── */
  async function handleSendOTP() {
    if (!isReady || !email.trim()) return;
    setLoading(true);
    try {
      // Pre-flight: reject emails registered as therapists BEFORE engaging
      // the Clerk OTP flow. Avoids the bad UX where the user enters a code,
      // briefly signs in, and is immediately bounced by /me/init's 409.
      const trimmed = email.trim().toLowerCase();
      const status = await apiClient.post('/auth/email-status', {
        email: trimmed,
        expectedRole: 'patient',
      });
      if (status.success && status.data && status.data.ok === false) {
        setBanner({
          visible: true,
          variant: 'error',
          message:
            `This email is registered as a ${status.data.conflictRole}. ` +
            'Use the therapist app to sign in, or use a different email here.',
        });
        setLoading(false);
        return;
      }
      if (isSignUp) {
        // ── New user — create account ─────────────────────────
        await signUp.create({ emailAddress: email.trim() });
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setStep('otp');
      } else {
        // ── Existing user — sign in ───────────────────────────
        await signIn.create({ identifier: email.trim() });
        const factor = signIn.supportedFirstFactors?.find(
          (f) => f.strategy === 'email_code'
        );
        if (!factor) throw new Error('Email code auth not enabled for this account.');
        await signIn.prepareFirstFactor({
          strategy: 'email_code',
          emailAddressId: factor.emailAddressId,
        });
        setStep('otp');
      }
    } catch (err) {
      const code = err?.errors?.[0]?.code;
      if (isSignUp && code === 'form_identifier_already_in_use') {
        setBanner({
          visible: true,
          variant: 'error',
          message:
            'An account with this email already exists.\nPlease use the "Login" button instead.',
        });
      } else if (!isSignUp && code === 'form_identifier_not_found') {
        setBanner({
          visible: true,
          variant: 'error',
          message:
            'No account found for this email.\nPlease tap "Start My Recovery" to create one.',
        });
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

  /* ── Step 2: Verify OTP ──────────────────────────────── */
  async function handleVerifyOTP() {
    if (!isReady || !otp.trim()) return;
    setLoading(true);
    try {
      if (isSignUp) {
        // ── Sign-up: verify → onboarding → MainNavigator ──────
        let result = await signUp.attemptEmailAddressVerification({ code: otp });

        // Handle case where Clerk still reports missing fields
        if (result.status === 'missing_requirements') {
          await signUp.update({ firstName: 'New', lastName: 'User' });
          result = await signUp.attemptEmailAddressVerification({ code: otp });
        }

        if (result.status === 'complete') {
          // Store session; OnboardingCompleteScreen activates it after onboarding
          global.__pendingClerkSession = {
            setActive: setSignUpActive,
            sessionId: result.createdSessionId,
          };
          navigation.navigate(PATIENT_ROUTES.PERSONAL_INFO);
        } else {
          setBanner({
            visible: true,
            variant: 'error',
            message: `Could not complete sign-up. Status: ${result.status}. Missing: ${result.missingFields?.join(', ') ?? 'none'}`,
          });
        }
      } else {
        // ── Sign-in: verify → RootNavigator auto-switches ─────
        const result = await signIn.attemptFirstFactor({
          strategy: 'email_code',
          code: otp,
        });

        if (result.status === 'complete') {
          // Activate session. RootNavigator watches isSignedIn and will
          // automatically unmount AuthNavigator and mount MainNavigator.
          // Do NOT call navigation.navigate() — it conflicts with the re-render.
          setSignInActive({ session: result.createdSessionId }).catch(() => {});
        } else {
          setBanner({
            visible: true,
            variant: 'error',
            message: `Unexpected status: ${result.status}`,
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

  /* ── UI ──────────────────────────────────────────────── */
  const heroTitle =
    step === 'email'
      ? (isSignUp ? "Let's get started" : 'Welcome back')
      : 'Check your email';

  const heroSubtitle =
    step === 'email'
      ? (isSignUp
          ? "Enter your email and we'll send a 6-digit code to confirm it's you. No password needed."
          : "Enter your email and we'll send a 6-digit code to sign you in. No password needed.")
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
            name="leaf-outline"
            size={32}
            color="rgba(0, 184, 148, 0.4)"
            style={styles.heroIcon}
          />
          <Text style={styles.hero}>{heroTitle}</Text>
          <Text style={styles.subtitle}>{heroSubtitle}</Text>

          {step === 'email' ? (
            <>
              <TextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoFocus
              />
              <AuthPillButton
                label="Continue"
                onPress={handleSendOTP}
                loading={loading}
                disabled={!email.trim()}
                style={styles.cta}
              />
            </>
          ) : (
            <>
              <TextField
                label="6-digit code"
                value={otp}
                onChangeText={setOtp}
                placeholder="••••••"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                inputStyle={styles.otpInput}
              />
              <AuthPillButton
                label="Continue"
                onPress={handleVerifyOTP}
                loading={loading}
                disabled={!otp.trim()}
                style={styles.cta}
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
    fontFamily: fonts.body.medium,
    fontSize: fonts.xs,
    color: colors.textLight,
    letterSpacing: 0.5,
    marginBottom: 20,
  },
  heroIcon: { marginBottom: 16 },
  hero: {
    fontFamily: fonts.heading.regular,
    fontSize: fonts.xxxl,
    lineHeight: fonts.xxxl * 1.35,
    color: colors.textDark,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: fonts.body.regular,
    fontSize: fonts.md,
    lineHeight: fonts.md * 1.5,
    color: colors.textMedium,
    marginBottom: 28,
  },
  cta: { marginTop: 8 },
  otpInput: {
    letterSpacing: 8,
    textAlign: 'center',
    fontSize: fonts.xl,
  },
  changeEmail: { alignItems: 'center', marginTop: 18 },
  changeEmailText: {
    fontFamily: fonts.body.semibold,
    fontSize: fonts.sm,
    color: colors.primary,
  },
});
