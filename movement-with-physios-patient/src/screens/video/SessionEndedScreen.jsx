/**
 * SessionEndedScreen — post-call summary for the patient.
 *
 * Route params:
 *   { durationSeconds }
 *   Also accepts (and ignores) { callId, bookingId, assessmentId } passed
 *   by VideoCallScreen for route-param parity with the therapist app.
 *
 * CTA:
 *   - Back to Home (popToTop — returns to the Home tab's root screen)
 *
 * Ported from movement-with-physios/apps/therapist/src/screens/video/SessionEndedScreen.jsx
 * with patient-specific simplifications:
 *   - No assessment fetch (patient never sees the assessment).
 *   - No "View Assessment PDF" CTA + no PDF polling.
 *   - "Back to Bookings" → "Back to Home" via navigation.popToTop().
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';

function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0:00';
  var m = Math.floor(seconds / 60);
  var s = seconds % 60;
  return m + ':' + (s < 10 ? '0' + s : s);
}

export default function SessionEndedScreen({ navigation, route }) {
  var params = route.params || {};
  var durationSeconds = params.durationSeconds || 0;

  function handleBackToHome() {
    // Pops the entire video stack back to its root (the Home tab's root
    // screen). No need to reference the specific route by name.
    navigation.popToTop();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark" size={36} color="#FFFFFF" />
        </View>
        <Text style={styles.title}>Session ended</Text>
        <Text style={styles.duration}>Duration: {formatDuration(durationSeconds)}</Text>

        <TouchableOpacity style={styles.secondaryBtn} onPress={handleBackToHome}>
          <Text style={styles.secondaryBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

var styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 24, gap: 12,
  },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  title: { fontSize: fonts.xxl, color: colors.textDark, fontWeight: fonts.bold },
  duration: { fontSize: fonts.sm, color: colors.textMedium, marginBottom: 8 },

  secondaryBtn: {
    marginTop: 8,
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1, borderColor: colors.border,
  },
  secondaryBtnText: { fontSize: fonts.sm, color: colors.textDark, fontWeight: fonts.semibold },
});
