/**
 * PreCallLobbyScreen
 *
 * Shown before a therapist joins a scheduled video session. Loads the
 * booking + call from the backend, displays patient info + body part,
 * starts a local camera preview, and gates the "Join Call" CTA behind
 * the server-computed `canJoin` flag (true once we're inside the
 * VIDEO_CALL_JOIN_WINDOW_MINUTES window).
 *
 * Route params:
 *   { callId: string, bookingId: string }
 *
 * On Join: navigation.replace to VideoCall with
 *   { callId, otherUserId, assessmentId }.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mediaDevices, RTCView } from 'react-native-webrtc';

import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { getCall } from '../../services/videoCallService';
import { getBooking } from '../../services/bookingService';
import BodyPartBadge from '../../components/video/BodyPartBadge';

function formatScheduledAt(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  var h = d.getHours();
  var m = d.getMinutes();
  var ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if (h === 0) h = 12;
  var dateStr = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  return dateStr + ' · ' + h + ':' + (m < 10 ? '0' + m : m) + ' ' + ampm;
}

export default function PreCallLobbyScreen({ navigation, route }) {
  var params = route.params || {};
  var callId = params.callId;
  var bookingId = params.bookingId;

  var [call, setCall] = useState(null);
  var [booking, setBooking] = useState(null);
  var [loadError, setLoadError] = useState(null);
  var [loading, setLoading] = useState(true);

  var [previewStream, setPreviewStream] = useState(null);
  var [previewError, setPreviewError] = useState(null);

  var previewStreamRef = useRef(null);
  var pollHandleRef = useRef(null);

  // ── Load call + booking on mount, then poll the call every 5s to pick
  //    up canJoin flipping true as the window opens.
  useEffect(function () {
    var cancelled = false;
    async function load() {
      var [callResp, bookingResp] = await Promise.all([
        getCall(callId),
        bookingId ? getBooking(bookingId) : Promise.resolve({ success: true, data: null }),
      ]);
      if (cancelled) return;
      if (callResp.success) setCall(callResp.data);
      else setLoadError(callResp.error || 'Failed to load call');
      if (bookingResp.success && bookingResp.data) setBooking(bookingResp.data);
      setLoading(false);
    }
    load();
    pollHandleRef.current = setInterval(load, 5000);
    return function () {
      cancelled = true;
      if (pollHandleRef.current) clearInterval(pollHandleRef.current);
    };
  }, [callId, bookingId]);

  // ── Local camera preview (no peer connection here)
  useEffect(function () {
    var cancelled = false;
    async function start() {
      try {
        var stream = await mediaDevices.getUserMedia({
          audio: true,
          video: { facingMode: 'user' },
        });
        if (cancelled) {
          stream.getTracks().forEach(function (t) { t.stop(); });
          return;
        }
        previewStreamRef.current = stream;
        setPreviewStream(stream);
      } catch (e) {
        setPreviewError((e && e.message) || 'Could not access camera');
      }
    }
    start();
    return function () {
      cancelled = true;
      if (previewStreamRef.current) {
        try {
          previewStreamRef.current.getTracks().forEach(function (t) { t.stop(); });
        } catch (e) {}
        previewStreamRef.current = null;
      }
    };
  }, []);

  function handleJoin() {
    if (!call || !call.canJoin) return;
    // Tear down the preview before navigating — the call hook will mint
    // its own stream.
    if (previewStreamRef.current) {
      try {
        previewStreamRef.current.getTracks().forEach(function (t) { t.stop(); });
      } catch (e) {}
      previewStreamRef.current = null;
    }
    setPreviewStream(null);
    navigation.replace('VideoCall', {
      callId: callId,
      otherUserId: (call.otherParty && call.otherParty.id) || null,
      assessmentId: call.assessmentId || null,
      bookingId: bookingId,
    });
  }

  function handleBack() {
    navigation.goBack();
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.placeholderText}>Loading session…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity onPress={handleBack} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  var bodyPart = (booking && booking.assessmentId && Array.isArray(booking.assessmentId.bodyParts)
    ? booking.assessmentId.bodyParts[0]
    : null);
  var otherName = (call && call.otherParty && call.otherParty.name) || 'Patient';
  var scheduledAt = (call && call.scheduledAt) || (booking && booking.slotStart);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pre-call lobby</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.previewWrap}>
          {previewStream ? (
            <RTCView
              streamURL={previewStream.toURL()}
              style={styles.preview}
              objectFit="cover"
              mirror={true}
            />
          ) : (
            <View style={styles.previewPlaceholder}>
              <Ionicons name="videocam-off-outline" size={28} color={colors.textLight} />
              <Text style={styles.placeholderText}>
                {previewError || 'Starting camera…'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.metaCard}>
          <Text style={styles.patientName}>{otherName}</Text>
          <Text style={styles.metaLine}>{formatScheduledAt(scheduledAt)}</Text>
          {bodyPart ? <View style={{ marginTop: 6 }}><BodyPartBadge bodyPart={bodyPart} /></View> : null}
          {!call?.canJoin ? (
            <Text style={styles.waitText}>
              The join window opens shortly before the scheduled time.
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.joinBtn, (!call || !call.canJoin) && styles.joinBtnDisabled]}
          onPress={handleJoin}
          disabled={!call || !call.canJoin}
        >
          <Ionicons name="videocam" size={18} color={colors.white} />
          <Text style={styles.joinBtnText}>Join Call</Text>
        </TouchableOpacity>
      </View>
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

  body: { flex: 1, padding: 16, gap: 14 },

  previewWrap: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    alignItems: 'center', justifyContent: 'center',
  },
  preview: { flex: 1, width: '100%', height: '100%' },
  previewPlaceholder: { alignItems: 'center', gap: 8 },
  placeholderText: { fontSize: fonts.sm, color: colors.textLight, marginTop: 6 },

  metaCard: {
    backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.cardBorder,
    borderRadius: 14, padding: 14, gap: 6,
  },
  patientName: { fontSize: fonts.lg, color: colors.textDark, fontWeight: fonts.semibold },
  metaLine: { fontSize: fonts.sm, color: colors.textMedium },
  waitText: { marginTop: 8, fontSize: fonts.xs, color: colors.textLight },

  joinBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8,
    height: 52, borderRadius: 28,
    backgroundColor: colors.primary,
  },
  joinBtnDisabled: { backgroundColor: colors.textLight },
  joinBtnText: { color: colors.white, fontSize: fonts.md, fontWeight: fonts.semibold },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  errorText: { color: colors.error, fontSize: fonts.sm, textAlign: 'center' },
  secondaryBtn: {
    marginTop: 8, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  secondaryBtnText: { fontSize: fonts.sm, color: colors.textDark, fontWeight: fonts.semibold },
});
