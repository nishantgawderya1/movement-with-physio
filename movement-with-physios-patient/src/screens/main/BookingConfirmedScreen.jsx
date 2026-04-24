import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Share,
  Linking,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { PATIENT_ROUTES } from '../../constants/routes';

var MEETING_LINK = 'https://meet.mwp.care/room/pat-ab12cd34';

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
 * Booking confirmed success screen — redesigned with animated entry,
 * therapist detail card, meeting link with copy/open, calendar & share
 * actions, and footer navigation.
 *
 * Receives route.params: { therapist, slot, selectedSlot }
 * @param {{ navigation: object, route: object }} props
 */
export default function BookingConfirmedScreen({ navigation, route }) {
  var insets = useSafeAreaInsets();
  var therapist = route.params?.therapist ?? { name: 'Dr. Sarah James', specialization: 'Physiotherapist' };
  var selectedSlot = route.params?.selectedSlot ?? route.params?.slot ?? '11:00 AM';

  var [linkCopied, setLinkCopied] = useState(false);

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

  // ── Handlers ─────────────────────────────────────────────
  function handleCopyLink() {
    Clipboard.setStringAsync(MEETING_LINK).then(function () {
      setLinkCopied(true);
      setTimeout(function () { setLinkCopied(false); }, 2000);
    });
  }

  function handleOpenLink() {
    Linking.openURL(MEETING_LINK);
  }

  function handleAddToCalendar() {
    Alert.alert('Opening Calendar', 'This will add your session to your calendar.');
  }

  function handleShare() {
    Share.share({
      message:
        'MWP Session booked with ' +
        therapist.name +
        ' at ' +
        selectedSlot +
        '.\nJoin: ' +
        MEETING_LINK,
    });
  }

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
          value="Today, Feb 15 2026"
        />
        <DetailRow
          icon="time-outline"
          label="Time"
          value={selectedSlot}
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

      {/* ── MEETING LINK CARD ── */}
      <Animated.View style={[styles.linkCard, contentAnimStyle]}>
        <View style={styles.linkCardInner}>
          {/* Left: label + URL */}
          <View style={styles.linkLeft}>
            <Text style={styles.linkLabel}>MEETING LINK</Text>
            <Text style={styles.linkUrl} numberOfLines={1} ellipsizeMode="tail">
              {MEETING_LINK}
            </Text>
          </View>

          {/* Right: copy + open */}
          <View style={styles.linkActions}>
            <Pressable style={styles.linkIconBtn} onPress={handleCopyLink}>
              <Ionicons
                name={linkCopied ? 'checkmark-done' : 'copy-outline'}
                size={20}
                color={linkCopied ? colors.primary : colors.primary}
              />
            </Pressable>
            <Pressable style={styles.linkIconBtn} onPress={handleOpenLink}>
              <Ionicons name="open-outline" size={20} color={colors.primary} />
            </Pressable>
          </View>
        </View>
      </Animated.View>

      {/* ── CALENDAR ROW ── */}
      <Animated.View style={[styles.calendarRow, contentAnimStyle]}>
        <Pressable style={styles.calendarBtn} onPress={handleAddToCalendar}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <Text style={styles.calendarBtnText}>Add to Calendar</Text>
        </Pressable>
        <Pressable style={styles.calendarBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={18} color={colors.primary} />
          <Text style={styles.calendarBtnText}>Share</Text>
        </Pressable>
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

  // ── Meeting link card ──
  linkCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    padding: 16,
  },
  linkCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  linkLeft: {
    flex: 1,
  },
  linkLabel: {
    fontFamily: fonts.body.semibold,
    fontSize: 11,
    color: colors.primaryDark,
    letterSpacing: 1.2,
  },
  linkUrl: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.primary,
    marginTop: 4,
  },
  linkActions: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
  },
  linkIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Calendar row ──
  calendarRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    gap: 10,
  },
  calendarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calendarBtnText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.textDark,
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
