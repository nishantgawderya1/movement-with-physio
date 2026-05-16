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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { apiClient } from '../../lib/apiClient';

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

  const isReady = signInLoaded && signUpLoaded;

  /* Routing on auth state is handled by AppNavigator (it swaps to AppStack
     whenever isSignedIn becomes true). No imperative redirect needed here. */

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
        Alert.alert(
          'Wrong app for this email',
          `This email is registered as a ${status.data.conflictRole}. ` +
            'Use the patient app to sign in, or use a different email here.'
        );
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
          Alert.alert('Error', signUpErr?.errors?.[0]?.longMessage || signUpErr.message);
        }
      } else {
        Alert.alert('Error', err?.errors?.[0]?.longMessage || err.message);
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
          Alert.alert('Incomplete', `Status: ${result.status}. Please try again.`);
        }
      } else {
        const result = await signUp.attemptEmailAddressVerification({ code: otp });
        if (result.status === 'complete') {
          await setSignUpActive({ session: result.createdSessionId });
          // AppStack lands new users on Dashboard. They can complete
          // PersonalInfo from there until we add an onboarding gate.
        } else {
          Alert.alert('Incomplete', `Status: ${result.status}. Please try again.`);
        }
      }
    } catch (err) {
      Alert.alert('Invalid Code', err?.errors?.[0]?.longMessage || err.message);
    } finally {
      setLoading(false);
    }
  }

  /* ── UI ──────────────────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.badge}>THERAPIST PORTAL</Text>
            <Text style={styles.title}>
              {step === 'email' ? 'Sign in to your account' : 'Enter verification code'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'email'
                ? 'Enter your email to receive a one-time code'
                : `We sent a 6-digit code to\n${email}`}
            </Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {step === 'email' ? (
              <>
                <Text style={styles.label}>Email address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@clinic.com"
                  placeholderTextColor="#94A3B8"
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
                    : <Text style={styles.btnText}>Send Code →</Text>}
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.label}>6-digit code</Text>
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  placeholder="••••••"
                  placeholderTextColor="#94A3B8"
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
                  style={styles.backBtn}
                  onPress={() => { setStep('email'); setOtp(''); }}
                >
                  <Text style={styles.backText}>← Change email</Text>
                </Pressable>
              </>
            )}
          </View>

          {__DEV__ && (
            <Text style={styles.devNote}>
              ℹ️  Dev: Use your real email. Code arrives in ~5 seconds.
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const PRIMARY = '#1E3A5F';
const ACCENT = '#2563EB';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: { alignItems: 'center', marginBottom: 32 },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: ACCENT,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 16,
    overflow: 'hidden',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: PRIMARY,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
  },
  otpInput: {
    letterSpacing: 8,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
  },
  btn: {
    backgroundColor: ACCENT,
    borderRadius: 10,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  backBtn: { alignItems: 'center', marginTop: 16 },
  backText: { color: ACCENT, fontSize: 14, fontWeight: '500' },
  devNote: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 12,
    color: '#94A3B8',
  },
});
