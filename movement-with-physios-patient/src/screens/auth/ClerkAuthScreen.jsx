import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { PATIENT_ROUTES } from '../../constants/routes';
import { apiClient } from '../../lib/apiClient';

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

  const isReady = signInLoaded && signUpLoaded;

  const isSignUp = mode === 'signup';

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
        Alert.alert(
          'Wrong app for this email',
          `This email is registered as a ${status.data.conflictRole}. ` +
            'Use the therapist app to sign in, or use a different email here.'
        );
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
        Alert.alert(
          'Account already exists',
          'An account with this email already exists.\nPlease use the "Login" button instead.',
          [{ text: 'OK' }]
        );
      } else if (!isSignUp && code === 'form_identifier_not_found') {
        Alert.alert(
          'No account found',
          'No account found for this email.\nPlease tap "Start My Recovery" to create one.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', err?.errors?.[0]?.longMessage || err.message);
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
          Alert.alert(
            'Could not complete sign-up',
            `Status: ${result.status}. Missing: ${result.missingFields?.join(', ') ?? 'none'}`
          );
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
          Alert.alert('Incomplete', `Unexpected status: ${result.status}`);
        }
      }
    } catch (err) {
      Alert.alert('Invalid Code', err?.errors?.[0]?.longMessage || err.message);
    } finally {
      setLoading(false);
    }
  }

  /* ── UI ──────────────────────────────────────────────── */
  const headerTitle   = step === 'email'
    ? (isSignUp ? 'Create your account' : 'Welcome back')
    : 'Check your inbox';
  const headerSubtitle = step === 'email'
    ? (isSignUp
        ? 'Enter your email to get started'
        : 'Enter your email to sign in')
    : `A 6-digit code was sent to\n${email}`;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{headerTitle}</Text>
          <Text style={styles.subtitle}>{headerSubtitle}</Text>

          {step === 'email' ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                autoFocus
              />
              <Pressable
                style={[styles.btn, (!email.trim() || loading) && styles.btnDisabled]}
                onPress={handleSendOTP}
                disabled={!email.trim() || loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>Send Code</Text>}
              </Pressable>
            </>
          ) : (
            <>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="6-digit code"
                placeholderTextColor={colors.textLight}
                keyboardType="number-pad"
                value={otp}
                onChangeText={setOtp}
                maxLength={6}
                autoFocus
              />
              <Pressable
                style={[styles.btn, (!otp.trim() || loading) && styles.btnDisabled]}
                onPress={handleVerifyOTP}
                disabled={!otp.trim() || loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>Verify & Continue</Text>}
              </Pressable>

              <Pressable
                style={styles.secondaryBtn}
                onPress={() => { setStep('email'); setOtp(''); }}
              >
                <Text style={styles.secondaryText}>← Change email</Text>
              </Pressable>
            </>
          )}
        </View>

        {__DEV__ && (
          <Text style={styles.devNote}>
            {isSignUp
              ? 'ℹ️  New account will be created. Check inbox for OTP.'
              : 'ℹ️  Sign in only. Account must already exist.'}
          </Text>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white || '#fff' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  card: {
    backgroundColor: colors.white || '#fff',
    borderRadius: 20,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    fontSize: fonts.xl || 22,
    color: colors.textDark,
    marginBottom: 8,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: fonts.sm || 14,
    color: colors.textLight,
    marginBottom: 28,
    lineHeight: 22,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    fontSize: fonts.md || 16,
    color: colors.textDark,
    marginBottom: 16,
    backgroundColor: '#fafafa',
  },
  otpInput: {
    letterSpacing: 6,
    textAlign: 'center',
    fontSize: fonts.xl || 22,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  btnText: {
    color: '#fff',
    fontSize: fonts.md || 16,
    fontWeight: '600',
  },
  secondaryBtn: { alignItems: 'center', marginTop: 18 },
  secondaryText: {
    color: colors.primary,
    fontSize: fonts.sm || 14,
    fontWeight: '500',
  },
  devNote: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 12,
    color: colors.textLight || '#999',
  },
});
