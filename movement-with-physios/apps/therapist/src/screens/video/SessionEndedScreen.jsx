/**
 * SessionEndedScreen — post-call summary.
 *
 * Route params:
 *   { callId, bookingId, assessmentId?, durationSeconds }
 *
 * CTAs:
 *   - View Assessment PDF (when assessmentId present + status='completed' + pdfKey)
 *   - Back to Bookings (always — navigates to the Bookings list, popping the
 *     pre-call / call / ended stack)
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { getAssessment, getPdf } from '../../services/assessmentService';
import { ROUTES } from '../../constants/routes';

function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0:00';
  var m = Math.floor(seconds / 60);
  var s = seconds % 60;
  return m + ':' + (s < 10 ? '0' + s : s);
}

export default function SessionEndedScreen({ navigation, route }) {
  var params = route.params || {};
  var assessmentId = params.assessmentId;
  var durationSeconds = params.durationSeconds || 0;

  var [assessment, setAssessment] = useState(null);
  var [pdfUrl, setPdfUrl] = useState(null);
  var [pdfChecking, setPdfChecking] = useState(false);

  useEffect(function () {
    if (!assessmentId) return;
    var cancelled = false;
    setPdfChecking(true);
    (async function () {
      var aResp = await getAssessment(assessmentId);
      if (cancelled) return;
      if (aResp.success) setAssessment(aResp.data);

      // Only poll for PDF if the therapist actually completed it.
      if (aResp.success && aResp.data && aResp.data.status === 'completed') {
        var pResp = await getPdf(assessmentId);
        if (!cancelled && pResp.success && pResp.data && pResp.data.status === 'ready') {
          setPdfUrl(pResp.data.url);
        }
      }
      setPdfChecking(false);
    })();
    return function () { cancelled = true; };
  }, [assessmentId]);

  function handleBackToBookings() {
    // Pops back to Bookings; if not in the stack, navigates there.
    navigation.navigate(ROUTES.BOOKINGS || 'Bookings');
  }

  function handleViewPdf() {
    if (pdfUrl) Linking.openURL(pdfUrl);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark" size={36} color={colors.white} />
        </View>
        <Text style={styles.title}>Session ended</Text>
        <Text style={styles.duration}>Duration: {formatDuration(durationSeconds)}</Text>

        {assessment && assessment.status === 'completed' ? (
          <View style={styles.assessRow}>
            {pdfChecking ? (
              <ActivityIndicator color={colors.primary} />
            ) : pdfUrl ? (
              <TouchableOpacity style={styles.primaryBtn} onPress={handleViewPdf}>
                <Ionicons name="document-text-outline" size={16} color={colors.white} />
                <Text style={styles.primaryBtnText}>View Assessment PDF</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.muted}>PDF still generating — check Bookings shortly.</Text>
            )}
          </View>
        ) : null}

        <TouchableOpacity style={styles.secondaryBtn} onPress={handleBackToBookings}>
          <Text style={styles.secondaryBtnText}>Back to Bookings</Text>
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
  assessRow: { marginTop: 6, alignItems: 'center', minHeight: 44 },
  muted: { fontSize: fonts.sm, color: colors.textLight },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 999,
  },
  primaryBtnText: { color: colors.white, fontWeight: fonts.semibold, fontSize: fonts.sm },

  secondaryBtn: {
    marginTop: 8,
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  secondaryBtnText: { fontSize: fonts.sm, color: colors.textDark, fontWeight: fonts.semibold },
});
