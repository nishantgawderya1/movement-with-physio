import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * ClerkAuthScreen
 *
 * INTEGRATION POINT — READ BEFORE EDITING
 * ─────────────────────────────────────────────────────────────────────
 * This screen is the authentication entry point.
 *
 * CURRENT STATE: Placeholder only. Simulates successful verification.
 *
 * BACKEND ENGINEER — When integrating Clerk:
 *   1. Replace the body of this screen with Clerk's phone OTP flow
 *   2. Call AuthService.sendOtp(phoneNumber) to initiate verification
 *   3. Call AuthService.verifyOtp(code) to verify the code
 *   4. On success, AuthService updates session state
 *   5. navigation.replace('PersonalInfo') fires after verified
 *
 * IMPORTANT: Do NOT import @clerk/expo directly in this screen.
 * All Clerk calls must go through: src/services/AuthService.js
 * ─────────────────────────────────────────────────────────────────────
 */
export default function ClerkAuthScreen({ navigation }) {

  /**
   * BACKEND ENGINEER:
   * Replace this handler with:
   *   const result = await AuthService.verifyOtp(code)
   *   if (result.success) navigation.replace('PersonalInfo')
   */
  const handleSimulateSuccess = () => {
    navigation.replace('PersonalInfo');
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>

        {/* Integration badge — remove when Clerk is live */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>PLACEHOLDER</Text>
        </View>

        <Text style={styles.title}>Clerk Authentication</Text>

        <Text style={styles.message}>
          This screen will later be replaced by Clerk OTP verification.
        </Text>

        {/* ── BACKEND ENGINEER: Replace this button with Clerk OTP UI ── */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleSimulateSuccess}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Simulate Successful Verification</Text>
        </TouchableOpacity>
        {/* ────────────────────────────────────────────────────────────── */}

        <Text style={styles.hint}>
          See: src/services/AuthService.js for integration instructions
        </Text>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  badge: {
    backgroundColor: '#FEF9C3',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: '#A16207',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 36,
  },
  button: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
});
