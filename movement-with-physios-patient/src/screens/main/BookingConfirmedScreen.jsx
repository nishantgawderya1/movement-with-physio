import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { PATIENT_ROUTES } from '../../constants/routes';

// Backend returns local as "YYYY-MM-DD HH:mm" (24-hour). Convert HH:mm only
// to a 12-hour AM/PM label. Duplicated in SlotSelectionScreen per the
// no-utils-directory decision (CLAUDE.md rule 9).
function formatLocalTime(localStr) {
  if (!localStr) return '';
  var parts = localStr.split(' ');
  var time = parts[1] || '';
  var hm = time.split(':');
  var h = parseInt(hm[0], 10);
  var m = parseInt(hm[1], 10);
  if (isNaN(h) || isNaN(m)) return localStr;
  var ampm = h >= 12 ? 'PM' : 'AM';
  var hh = h % 12; if (hh === 0) hh = 12;
  return hh + ':' + (m < 10 ? '0' + m : m) + ' ' + ampm;
}

// ─────────────────────────────────────────────────────────────
// Detail row sub-component
// ─────────────────────────────────────────────────────────────

/**
 * Single booking detail row with icon, label and right-aligned value.
 * @param {{ icon: string, label: string, value: string }} props
 */
function DetailRow({ icon, label, value }) {
  return (
    <View style={rowStyles.row}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{value}</Text>
    </View>
  );
}

var rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
  },
  label: {
    flex: 1,
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.textMedium,
  },
  value: {
    fontFamily: fonts.body.semibold,
    fontSize: 14,
    color: colors.textDark,
    textAlign: 'right',
  },
});

// ─────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────

/**
 * Booking confirmed success screen — animated entry, a therapist + booking
 * detail card, an inline "open the app at session time to join" note, and
 * footer navigation back home / to book another.
 *
 * Receives route.params: { therapist, selectedSlot, dateLabel }
 *   - selectedSlot: { utc, local, available } — the slot object SlotSelection picked
 *   - dateLabel: human display string, e.g. "Today, Jun 4, 2026"
 * @param {{ navigation: object, route: object }} props
 */
export default function BookingConfirmedScreen({ navigation, route }) {
  var insets = useSafeAreaInsets();
  var therapist = route.params?.therapist ?? { name: 'Dr. Sarah James', specialization: 'Physiotherapist' };
  // No legacy param fallback; SlotSelection sends the canonical shape.
  // No hardcoded default time — a missing slot should surface, not be masked.
  var selectedSlot = route.params?.selectedSlot ?? null;
  var dateLabel = route.params?.dateLabel ?? 'Date unavailable';

  // ── Animations ────────────────────────────────────────────
  var checkScale = useRef(new Animated.Value(0)).current;
  var contentOpacity = useRef(new Animated.Value(0)).current;
  var contentSlide = useRef(new Animated.Value(30)).current;

  useEffect(function () {
    Animated.parallel([
      Animated.spring(checkScale, {
        toValue: 1,
        stiffness: 200,
        damping: 15,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 400,
        delay: 350,
        useNativeDriver: true,
      }),
      Animated.timing(contentSlide, {
        toValue: 0,
        duration: 400,
        delay: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Therapist initials
  var initials = therapist.name
    .split(' ')
    .map(function (w) { return w[0]; })
    .slice(0, 2)
    .join('');

  // Animated style for the cards / content below the checkmark
  var contentAnimStyle = {
    opacity: contentOpacity,
    transform: [{ translateY: contentSlide }],
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── TOP SECTION ── */}
      <View style={styles.topSection}>
        {/* Animated ringed checkmark */}
        <Animated.View style={[styles.outerRing, { transform: [{ scale: checkScale }] }]}>
          <View style={styles.innerCircle}>
            <Ionicons name="checkmark" size={44} color={colors.textOnPrimary} />
          </View>
        </Animated.View>

        <Text style={styles.heading}>Booking Confirmed!</Text>
        <Text style={styles.subheading}>Your session has been scheduled</Text>
      </View>

      {/* ── BOOKING DETAILS CARD ── */}
      <Animated.View style={[styles.detailCard, contentAnimStyle]}>
        {/* Therapist row */}
        <View style={styles.therapistRow}>
          <View style={styles.therapistAvatar}>
            <Text style={styles.therapistInitials}>{initials}</Text>
          </View>
          <View style={styles.therapistInfo}>
            <Text style={styles.therapistName}>{therapist.name}</Text>
            <Text style={styles.therapistSpec}>
              {therapist.specialization || 'Physiotherapist'}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Detail rows */}
        <DetailRow
          icon="calendar-outline"
          label="Date"
          value={dateLabel}
        />
        <DetailRow
          icon="time-outline"
          label="Time"
          value={selectedSlot ? formatLocalTime(selectedSlot.local) : '—'}
        />
        <DetailRow
          icon="timer-outline"
          label="Duration"
          value="30 Minutes"
        />
        <DetailRow
          icon="card-outline"
          label="Fee"
          value="₹500"
        />
        <DetailRow
          icon="videocam-outline"
          label="Type"
          value="Video Consultation"
        />
      </Animated.View>

      {/* ── JOIN NOTE ── */}
      <Animated.View style={[styles.joinNote, contentAnimStyle]}>
        <Ionicons name="videocam-outline" size={18} color={colors.primary} />
        <Text style={styles.joinNoteText}>
          Open the app at session time to join your video call.
        </Text>
      </Animated.View>

      {/* ── FOOTER ── */}
      <Animated.View style={[styles.footer, contentAnimStyle]}>
        <Pressable
          style={styles.homeBtn}
          onPress={function () { navigation.navigate(PATIENT_ROUTES.HOME); }}
        >
          <Text style={styles.homeBtnText}>Back to Home</Text>
        </Pressable>

        <Pressable
          style={styles.bookAnotherBtn}
          onPress={function () { navigation.navigate(PATIENT_ROUTES.BOOK_THERAPIST); }}
        >
          <Text style={styles.bookAnotherText}>Book Another Session</Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

var styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: 0,
  },

  // ── Top section ──
  topSection: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 8,
  },
  outerRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heading: {
    fontFamily: fonts.heading.semibold,
    fontSize: 28,
    color: colors.textDark,
    marginTop: 20,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subheading: {
    fontFamily: fonts.body.regular,
    fontSize: 15,
    color: colors.textMedium,
    marginTop: 6,
    textAlign: 'center',
  },

  // ── Booking details card ──
  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 32,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  therapistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  therapistAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  therapistInitials: {
    fontFamily: fonts.body.semibold,
    fontSize: fonts.md,
    color: colors.textOnPrimary,
  },
  therapistInfo: {
    flex: 1,
  },
  therapistName: {
    fontFamily: fonts.heading.regular,
    fontSize: 18,
    color: colors.textDark,
  },
  therapistSpec: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: colors.textMedium,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 16,
    marginBottom: 4,
  },

  // ── Join note ──
  joinNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  joinNoteText: {
    flex: 1,
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.primaryDark,
    lineHeight: 18,
  },

  // ── Footer ──
  footer: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  homeBtn: {
    width: '100%',
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeBtnText: {
    fontFamily: fonts.body.semibold,
    fontSize: 15,
    color: colors.textOnPrimary,
    letterSpacing: 0.3,
  },
  bookAnotherBtn: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  bookAnotherText: {
    fontFamily: fonts.body.medium,
    fontSize: 14,
    color: colors.primary,
  },
});
