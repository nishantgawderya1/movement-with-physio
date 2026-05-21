/**
 * WaitingForTherapistScreen — patient is waiting for a therapist to accept
 * (or decline) their instant call request.
 *
 * Flow:
 *   - On mount: GET /bookings/:id once, then poll every 3 seconds.
 *   - On status flip:
 *       'confirmed'        — booking.videoCallId is populated; replace
 *                            navigation stack with PreCallLobby.
 *       'instant_declined' — render declined state with "Back to Home".
 *       'cancelled'        — render cancelled state.
 *       otherwise          — keep showing the spinner + countdown.
 *   - Cancel handler (button + back arrow): PATCH /bookings/:id/cancel,
 *     then popToTop. Going back IS cancelling — there is no "leave the
 *     screen but keep the request open" affordance.
 *
 * Route params: { bookingId: string }
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

import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { PATIENT_ROUTES } from '../../constants/routes';
import { getBooking, cancelBooking } from '../../services/bookingService';

var POLL_INTERVAL_MS = 3000;
var COUNTDOWN_TICK_MS = 5000;

/**
 * Pull the therapist's display name from a booking doc. The booking returned
 * by GET /bookings/:id may or may not populate therapistId — handle both.
 */
function pickTherapistName(booking) {
  if (!booking) return 'Therapist';
  var t = booking.therapistId;
  if (t && typeof t === 'object' && t.name) return t.name;
  return 'Therapist';
}

function pickInitials(name) {
  if (!name || !name.trim()) return 'T';
  var first = name.trim().charAt(0).toUpperCase();
  return first || 'T';
}

function formatRemaining(ms) {
  if (ms <= 0) return 'Request expired';
  var totalSeconds = Math.floor(ms / 1000);
  var minutes = Math.floor(totalSeconds / 60);
  var seconds = totalSeconds % 60;
  if (minutes <= 0) {
    return 'Request expires in ' + seconds + ' sec';
  }
  return 'Request expires in ' + minutes + ' min ' + seconds + ' sec';
}

export default function WaitingForTherapistScreen({ navigation, route }) {
  var params = route.params || {};
  var bookingId = params.bookingId;

  var [booking, setBooking] = useState(null);
  var [loadError, setLoadError] = useState(null);
  var [cancelling, setCancelling] = useState(false);
  var [nowMs, setNowMs] = useState(Date.now());

  var pollHandleRef = useRef(null);
  var countdownHandleRef = useRef(null);
  var cancelledRef = useRef(false);

  function stopPolling() {
    if (pollHandleRef.current) {
      clearInterval(pollHandleRef.current);
      pollHandleRef.current = null;
    }
  }

  function stopCountdown() {
    if (countdownHandleRef.current) {
      clearInterval(countdownHandleRef.current);
      countdownHandleRef.current = null;
    }
  }

  // ── Mount: initial load + start poll + countdown tick
  useEffect(function () {
    if (!bookingId) {
      setLoadError('Missing bookingId');
      return function () {};
    }

    cancelledRef.current = false;

    async function load() {
      var resp = await getBooking(bookingId);
      if (cancelledRef.current) return;
      if (!resp.success) {
        setLoadError(resp.error || 'Could not load request');
        return;
      }
      var b = resp.data;
      setBooking(b);
      setLoadError(null);

      // Status-driven side effects
      if (b && b.status === 'confirmed') {
        stopPolling();
        if (b.videoCallId) {
          navigation.replace(PATIENT_ROUTES.PRE_CALL_LOBBY, {
            callId: String(b.videoCallId),
            bookingId: bookingId,
          });
        }
        // If videoCallId is somehow missing on a confirmed booking, fall
        // through and keep showing the spinner. The next poll tick (if
        // re-armed) or a subsequent fetch will pick it up.
      } else if (b && (b.status === 'instant_declined' || b.status === 'cancelled')) {
        stopPolling();
      }
    }

    load();
    pollHandleRef.current = setInterval(load, POLL_INTERVAL_MS);
    countdownHandleRef.current = setInterval(function () {
      setNowMs(Date.now());
    }, COUNTDOWN_TICK_MS);

    return function () {
      cancelledRef.current = true;
      stopPolling();
      stopCountdown();
    };
  }, [bookingId, navigation]);

  async function handleCancel() {
    if (cancelling) return;
    setCancelling(true);
    var resp = await cancelBooking(bookingId, 'Patient cancelled while waiting');
    if (resp.success) {
      stopPolling();
      stopCountdown();
      navigation.popToTop();
    } else {
      setCancelling(false);
      Alert.alert('Could not cancel', resp.error || 'Try again');
    }
  }

  function handleBackToHome() {
    stopPolling();
    stopCountdown();
    navigation.popToTop();
  }

  function handleRetryLoad() {
    setLoadError(null);
    setBooking(null);
    if (!bookingId) {
      setLoadError('Missing bookingId');
      return;
    }
    getBooking(bookingId).then(function (resp) {
      if (resp.success) setBooking(resp.data);
      else setLoadError(resp.error || 'Could not load request');
    });
  }

  // ── Renders

  function renderHeader(title, onBack) {
    return (
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          accessibilityLabel="Cancel and go back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.safe}>
        {renderHeader('Waiting', handleBackToHome)}
        <View style={styles.body}>
          <View style={[styles.iconCircle, styles.iconCircleDanger]}>
            <Ionicons name="alert-circle-outline" size={36} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Couldn't load request</Text>
          <Text style={styles.subtitle}>{loadError}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleRetryLoad}>
            <Text style={styles.primaryBtnText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleBackToHome}>
            <Text style={styles.secondaryBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  var status = booking && booking.status;

  if (status === 'instant_declined') {
    return (
      <SafeAreaView style={styles.safe}>
        {renderHeader('Call declined', handleBackToHome)}
        <View style={styles.body}>
          <View style={[styles.iconCircle, styles.iconCircleDanger]}>
            <Ionicons name="close-circle-outline" size={36} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Therapist couldn't take the call</Text>
          <Text style={styles.subtitle}>Try scheduling a session instead.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleBackToHome}>
            <Text style={styles.primaryBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'cancelled') {
    return (
      <SafeAreaView style={styles.safe}>
        {renderHeader('Cancelled', handleBackToHome)}
        <View style={styles.body}>
          <View style={[styles.iconCircle, styles.iconCircleDanger]}>
            <Ionicons name="close-circle-outline" size={36} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Call request cancelled</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleBackToHome}>
            <Text style={styles.primaryBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Default: pending (or transient state before first load returns)
  var therapistName = pickTherapistName(booking);
  var initials = pickInitials(therapistName);
  var remainingLabel = null;
  if (booking && booking.instantExpiresAt) {
    var expiresMs = new Date(booking.instantExpiresAt).getTime();
    remainingLabel = formatRemaining(expiresMs - nowMs);
  }

  return (
    <SafeAreaView style={styles.safe}>
      {renderHeader('Waiting', handleCancel)}
      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
        <Text style={styles.title}>{therapistName}</Text>
        <Text style={styles.subtitle}>
          Waiting for {therapistName} to accept your call…
        </Text>
        <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
        {remainingLabel ? (
          <Text style={styles.timer}>{remainingLabel}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.dangerBtn, cancelling && styles.dangerBtnDisabled]}
          onPress={handleCancel}
          disabled={cancelling}
        >
          {cancelling ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.dangerBtnText}>Cancel Request</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

var styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.heading.regular,
    fontSize: fonts.md,
    color: colors.textDark,
  },
  headerSpacer: {
    width: 36,
  },

  // Body
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconCircleDanger: {
    backgroundColor: colors.danger,
  },
  initials: {
    fontFamily: fonts.body.bold,
    fontSize: fonts.xxl,
    color: '#FFFFFF',
    fontWeight: fonts.bold,
  },
  title: {
    fontFamily: fonts.heading.regular,
    fontSize: fonts.lg,
    color: colors.textDark,
    fontWeight: fonts.semibold,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.body.regular,
    fontSize: fonts.sm,
    color: colors.textMedium,
    textAlign: 'center',
    lineHeight: fonts.sm * 1.5,
  },
  spinner: {
    marginTop: 8,
  },
  timer: {
    fontFamily: fonts.body.regular,
    fontSize: fonts.xs,
    color: colors.textLight,
    marginTop: 4,
  },

  primaryBtn: {
    marginTop: 16,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  primaryBtnText: {
    fontFamily: fonts.body.semibold,
    fontSize: fonts.sm,
    color: '#FFFFFF',
  },
  secondaryBtn: {
    marginTop: 4,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: {
    fontFamily: fonts.body.semibold,
    fontSize: fonts.sm,
    color: colors.textDark,
  },

  dangerBtn: {
    marginTop: 24,
    alignSelf: 'stretch',
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerBtnDisabled: {
    opacity: 0.6,
  },
  dangerBtnText: {
    fontFamily: fonts.body.semibold,
    fontSize: fonts.md,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
