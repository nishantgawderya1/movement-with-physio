/**
 * BookingDetailScreen
 *
 * Route params: { bookingId }.
 *
 * Sections:
 *   - Header: avatar + name + body part badge
 *   - Date/time, Notes, Meeting type, Status
 *   - CTAs (by meetingType + status):
 *       video + canJoin           → "Join Call"
 *       video + assessment ready  → "View Assessment PDF"
 *       instant_pending           → "Accept" + "Decline"
 *       upcoming + not completed  → "Cancel"
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { ROUTES } from '../../constants/routes';
import BodyPartBadge from '../../components/video/BodyPartBadge';
import {
  getBooking,
  acceptInstant,
  declineInstant,
  cancelBooking,
} from '../../services/bookingService';
import { getCall } from '../../services/videoCallService';
import { getPdf } from '../../services/assessmentService';

function formatSlot(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function patientName(b) {
  return (b && b.patientId && b.patientId.name) || 'Patient';
}

export default function BookingDetailScreen({ navigation, route }) {
  var bookingId = route.params && route.params.bookingId;

  var [booking, setBooking] = useState(null);
  var [callMeta, setCallMeta] = useState(null);
  var [pdfUrl, setPdfUrl] = useState(null);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);
  var [acting, setActing] = useState(false);

  var load = useCallback(async function () {
    setError(null);
    var resp = await getBooking(bookingId);
    if (!resp.success) {
      setError(resp.error || 'Failed to load booking');
      setLoading(false);
      return;
    }
    setBooking(resp.data);

    // If this is a video booking, pull the enriched call view (for canJoin).
    if (resp.data && resp.data.videoCallId) {
      var callId = typeof resp.data.videoCallId === 'object'
        ? resp.data.videoCallId._id
        : resp.data.videoCallId;
      var cResp = await getCall(callId);
      if (cResp.success) setCallMeta(cResp.data);
    }

    // PDF check if the linked assessment is completed.
    var a = resp.data && resp.data.assessmentId;
    if (a && typeof a === 'object' && a.status === 'completed' && a.pdfKey) {
      var pResp = await getPdf(a._id);
      if (pResp.success && pResp.data && pResp.data.status === 'ready') {
        setPdfUrl(pResp.data.url);
      }
    }
    setLoading(false);
  }, [bookingId]);

  useEffect(function () {
    setLoading(true);
    load();
  }, [load]);

  async function handleAccept() {
    if (acting) return;
    setActing(true);
    var r = await acceptInstant(bookingId);
    setActing(false);
    if (r.success) {
      Alert.alert('Accepted', 'You accepted the instant call request.');
      load();
    } else {
      Alert.alert('Error', r.error || 'Failed to accept');
    }
  }

  async function handleDecline() {
    if (acting) return;
    setActing(true);
    var r = await declineInstant(bookingId);
    setActing(false);
    if (r.success) {
      navigation.goBack();
    } else {
      Alert.alert('Error', r.error || 'Failed to decline');
    }
  }

  function handleCancel() {
    Alert.alert('Cancel booking?', 'This cannot be undone.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel booking', style: 'destructive', onPress: async function () {
          var r = await cancelBooking(bookingId);
          if (r.success) {
            navigation.goBack();
          } else {
            Alert.alert('Error', r.error || 'Failed to cancel');
          }
        }
      }
    ]);
  }

  function handleJoinCall() {
    var callId = booking.videoCallId && (booking.videoCallId._id || booking.videoCallId);
    navigation.navigate(ROUTES.PRE_CALL_LOBBY, { callId: callId, bookingId: bookingId });
  }

  function handleViewPdf() {
    if (pdfUrl) Linking.openURL(pdfUrl);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }
  if (error || !booking) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error || 'Booking not found'}</Text>
          <TouchableOpacity onPress={function () { navigation.goBack(); }} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  var name = patientName(booking);
  var isVideo = booking.meetingType === 'video';
  var canJoin = !!(callMeta && callMeta.canJoin);
  var isInstantPending = booking.status === 'instant_pending';
  var isCancellable = ['confirmed', 'pending', 'instant_pending'].indexOf(booking.status) >= 0;
  var assessment = booking.assessmentId;
  var bodyPart = (assessment && Array.isArray(assessment.bodyParts))
    ? assessment.bodyParts[0]
    : (booking.patientId && booking.patientId.painLocation) || null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={function () { navigation.goBack(); }} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.patientCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(name.charAt(0) + (name.split(/\s+/).slice(-1)[0] || '').charAt(0)).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{name}</Text>
          {bodyPart ? <BodyPartBadge bodyPart={bodyPart} /> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Date & time</Text>
          <Text style={styles.sectionValue}>{formatSlot(booking.slotStart)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Meeting type</Text>
          <View style={styles.iconRow}>
            <Ionicons
              name={isVideo ? 'videocam-outline' : 'person-outline'}
              size={16}
              color={colors.primary}
            />
            <Text style={styles.sectionValue}>{isVideo ? 'Video call' : 'In person'}</Text>
          </View>
        </View>

        {booking.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text style={styles.sectionValue}>{booking.notes}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Status</Text>
          <Text style={styles.sectionValue}>{(booking.status || '').replace(/_/g, ' ')}</Text>
        </View>

        {/* CTAs */}
        <View style={styles.actions}>
          {isInstantPending ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.primaryBtn, styles.flexBtn]}
                onPress={handleAccept}
                disabled={acting}
              >
                <Text style={styles.primaryBtnText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryBtn, styles.flexBtn]}
                onPress={handleDecline}
                disabled={acting}
              >
                <Text style={styles.secondaryBtnText}>Decline</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {isVideo && canJoin ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleJoinCall}>
              <Ionicons name="videocam" size={16} color={colors.white} />
              <Text style={styles.primaryBtnText}>Join Call</Text>
            </TouchableOpacity>
          ) : null}

          {pdfUrl ? (
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleViewPdf}>
              <Ionicons name="document-text-outline" size={16} color={colors.primary} />
              <Text style={styles.secondaryBtnText}>View Assessment PDF</Text>
            </TouchableOpacity>
          ) : null}

          {isCancellable ? (
            <TouchableOpacity style={styles.dangerBtn} onPress={handleCancel}>
              <Text style={styles.dangerBtnText}>Cancel booking</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

var styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: fonts.md, color: colors.textDark, fontWeight: fonts.semibold },

  body: { padding: 18, paddingBottom: 32, gap: 16 },

  patientCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1, borderColor: colors.cardBorder,
    paddingVertical: 18,
    gap: 8,
  },
  avatar: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: fonts.lg, color: colors.primary, fontWeight: fonts.bold },
  name: { fontSize: fonts.lg, color: colors.textDark, fontWeight: fonts.semibold },

  section: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1, borderColor: colors.cardBorder,
    padding: 14,
    gap: 4,
  },
  sectionLabel: { fontSize: fonts.xs, color: colors.textLight, fontWeight: fonts.medium },
  sectionValue: { fontSize: fonts.sm, color: colors.textDark, textTransform: 'capitalize' },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  actions: { gap: 10, marginTop: 6 },
  actionRow: { flexDirection: 'row', gap: 10 },
  flexBtn: { flex: 1 },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 28,
    backgroundColor: colors.primary,
  },
  primaryBtnText: { color: colors.white, fontWeight: fonts.semibold, fontSize: fonts.sm },

  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8,
    height: 48, borderRadius: 28,
    borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.white,
  },
  secondaryBtnText: { color: colors.primary, fontWeight: fonts.semibold, fontSize: fonts.sm },

  dangerBtn: {
    height: 48, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.error,
  },
  dangerBtnText: { color: colors.error, fontWeight: fonts.semibold, fontSize: fonts.sm },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  errorText: { color: colors.error, fontSize: fonts.sm },
});
