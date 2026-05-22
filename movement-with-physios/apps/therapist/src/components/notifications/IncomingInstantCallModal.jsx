/**
 * IncomingInstantCallModal
 *
 * Mounted at the AppStack level (above all screens). Listens on the
 * existing videoSocket for `video_call_requested` events targeted at the
 * authenticated therapist.
 *
 * Wire status: the backend's `bookingService.createInstantBooking` currently
 * enqueues an FCM push notification (NOTIFICATION_TYPES.VIDEO_CALL_REQUESTED)
 * via JOB_NAMES.SEND_NOTIFICATION — it does NOT yet emit a socket event on
 * the `/video` namespace. So this modal's subscription is the in-app
 * pipeline ready for when the backend adds a `socket.to('user:<id>').emit(
 * 'video_call_requested', payload)` call alongside the FCM push. Until then
 * it stays dormant. Adding the backend emit is a one-line follow-up.
 *
 * Payload shape expected (matches what the backend's instant flow already
 * passes in the FCM `data` object):
 *   { bookingId: string, patientId: string, patientName?: string,
 *     patientPhoto?: string, bodyPart?: string, delayMinutes: '15'|'30' }
 *
 * Three actions: Accept | Decline | Snooze (re-fires the modal 2 min later).
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { videoSocket } from '../../lib/videoSocket';
import { acceptInstant, declineInstant } from '../../services/bookingService';
import BodyPartBadge from '../video/BodyPartBadge';
import { ROUTES } from '../../constants/routes';

var SNOOZE_MS = 2 * 60 * 1000;

/**
 * @param {object} props
 * @param {object} props.navigation - root navigation ref (for navigating to BookingDetail on accept)
 */
export default function IncomingInstantCallModal({ navigation }) {
  var [payload, setPayload] = useState(null);
  var [acting, setActing] = useState(false);
  var snoozedRef = useRef(new Map()); // bookingId -> timeoutHandle

  useEffect(function () {
    // Make sure the socket is connected so we receive emits — chat and video
    // both reuse the singleton, so multiple connect() calls are no-ops.
    videoSocket.connect();

    var unsub = videoSocket.on('video_call_requested', function (incoming) {
      // Ignore if we already have a different request modal open (most
      // therapists will only see one at a time anyway).
      if (payload && payload.bookingId !== (incoming && incoming.bookingId)) {
        return;
      }
      if (incoming && incoming.bookingId) {
        setPayload(incoming);
      }
    });

    return function () {
      unsub();
      // Clear any pending snooze timers on unmount.
      snoozedRef.current.forEach(function (h) { clearTimeout(h); });
      snoozedRef.current.clear();
    };
  }, [payload]);

  function dismiss() {
    setPayload(null);
  }

  async function handleAccept() {
    if (!payload || acting) return;
    setActing(true);
    var r = await acceptInstant(payload.bookingId);
    setActing(false);
    if (r.success) {
      var bookingId = payload.bookingId;
      dismiss();
      if (navigation && typeof navigation.navigate === 'function') {
        navigation.navigate(ROUTES.BOOKING_DETAIL, { bookingId: bookingId });
      }
    } else {
      Alert.alert('Could not accept', r.error || 'Try again.');
    }
  }

  async function handleDecline() {
    if (!payload || acting) return;
    setActing(true);
    var r = await declineInstant(payload.bookingId);
    setActing(false);
    if (r.success) {
      dismiss();
    } else {
      Alert.alert('Could not decline', r.error || 'Try again.');
    }
  }

  function handleSnooze() {
    if (!payload) return;
    var p = payload;
    dismiss();
    var h = setTimeout(function () {
      setPayload(p);
      snoozedRef.current.delete(p.bookingId);
    }, SNOOZE_MS);
    snoozedRef.current.set(p.bookingId, h);
  }

  if (!payload) return null;

  var name = payload.patientName || 'Patient';
  var delay = payload.delayMinutes ? `call in ${payload.delayMinutes} min` : 'instant call';

  return (
    <Modal
      visible={!!payload}
      transparent
      animationType="fade"
      onRequestClose={dismiss}
    >
      <Pressable style={styles.backdrop} onPress={handleSnooze}>
        <Pressable style={styles.card} onPress={function () { /* swallow */ }}>
          <View style={styles.iconCircle}>
            <Ionicons name="videocam" size={26} color={colors.white} />
          </View>
          <Text style={styles.title}>Incoming call request</Text>
          <Text style={styles.subtitle}>{name} wants to {delay}</Text>
          {payload.bodyPart ? <View style={{ marginTop: 6 }}><BodyPartBadge bodyPart={payload.bodyPart} /></View> : null}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryBtn, acting && styles.btnDisabled]}
              onPress={handleAccept}
              disabled={acting}
            >
              <Text style={styles.primaryBtnText}>{acting ? '…' : 'Accept'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, acting && styles.btnDisabled]}
              onPress={handleDecline}
              disabled={acting}
            >
              <Text style={styles.secondaryBtnText}>Decline</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.snoozeBtn} onPress={handleSnooze}>
            <Text style={styles.snoozeText}>Snooze 2 min</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

var styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  title: { fontSize: fonts.lg, color: colors.textDark, fontWeight: fonts.semibold },
  subtitle: { fontSize: fonts.sm, color: colors.textMedium, textAlign: 'center' },

  actions: {
    flexDirection: 'row', gap: 10, marginTop: 16, width: '100%',
  },
  primaryBtn: {
    flex: 1, height: 46, borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: { color: colors.white, fontWeight: fonts.semibold, fontSize: fonts.sm },
  secondaryBtn: {
    flex: 1, height: 46, borderRadius: 23,
    borderWidth: 1, borderColor: colors.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  secondaryBtnText: { color: colors.textDark, fontWeight: fonts.semibold, fontSize: fonts.sm },
  btnDisabled: { opacity: 0.6 },

  snoozeBtn: { marginTop: 10, padding: 6 },
  snoozeText: { color: colors.textMedium, fontSize: fonts.sm },
});
