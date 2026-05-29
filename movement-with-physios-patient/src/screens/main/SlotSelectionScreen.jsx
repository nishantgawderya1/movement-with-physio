import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { PATIENT_ROUTES } from '../../constants/routes';
import InlineBanner from '../../components/common/InlineBanner';
import { getSlots } from '../../services/bookingService';

// Backend booking window is BOOKING_WINDOW_DAYS=7 (today..today+6) in IST.
// We render the same span as a horizontal 7-pill day strip.
var DAY_OFFSETS = [0, 1, 2, 3, 4, 5, 6];

// ── Date helpers ──────────────────────────────────────────────────────────
// All date math goes through Intl with timeZone:'Asia/Kolkata' so the device's
// local tz cannot disagree with the backend's "today". Without this guard, a
// patient on a non-IST device near midnight could pick a day strip pill whose
// API date is yesterday/tomorrow vs what the backend's IST clock thinks. Using
// the en-CA locale guarantees YYYY-MM-DD on Intl output without rearrangement.

function targetDate(offsetDays) {
  return new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
}

function formatDateForApi(offsetDays) {
  var fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return fmt.format(targetDate(offsetDays));
}

// Pill chip label: short, weekday-only for offsets 2-6 (the 7-day window
// guarantees no weekday repeats). Used ONLY in the day strip UI.
function pillLabel(offsetDays) {
  if (offsetDays === 0) return 'Today';
  if (offsetDays === 1) return 'Tomorrow';
  var fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
  });
  return fmt.format(targetDate(offsetDays)); // "Sun", "Mon", ...
}

// Fully qualified date label: written into the summary card AND carried on
// the navigation payload to BookingConfirmed. Built independently of
// pillLabel so a future pill-only tweak cannot leak into the confirmation
// record.
function buildDateLabel(offsetDays) {
  var prefix;
  if (offsetDays === 0) prefix = 'Today';
  else if (offsetDays === 1) prefix = 'Tomorrow';
  else {
    var wkFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
    });
    prefix = wkFmt.format(targetDate(offsetDays));
  }
  var dateFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    month: 'short', day: 'numeric', year: 'numeric',
  });
  return prefix + ', ' + dateFmt.format(targetDate(offsetDays));
}

// Backend returns local as "YYYY-MM-DD HH:mm" (24-hour). Convert HH:mm only
// to a 12-hour AM/PM label. Duplicated in BookingConfirmedScreen per the
// no-utils-directory decision.
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

/**
 * Time slot selection screen — fetches real availability slots for the
 * chosen therapist + date from GET /bookings/slots.
 *
 * @param {{ navigation: object, route: object }} props
 */
export default function SlotSelectionScreen({ navigation, route }) {
  var therapist = route.params.therapist;

  var [selectedDateOffset, setSelectedDateOffset] = useState(0);
  var [slots, setSlots] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);
  // selectedSlot is now the BACKEND OBJECT {utc, local, available}, not a
  // display string. utc is what step 7 (POST /bookings) will need.
  var [selectedSlot, setSelectedSlot] = useState(null);

  useEffect(function () {
    var cancelled = false;
    // Switching dates clears any prior selection — a slot from yesterday's
    // grid must NOT survive into today's confirmation.
    setSelectedSlot(null);
    setError(null);
    setLoading(true);

    getSlots({
      therapistId: therapist.id,
      date: formatDateForApi(selectedDateOffset),
    }).then(function (resp) {
      if (cancelled) return;
      if (resp.success) {
        setSlots(Array.isArray(resp.data) ? resp.data : []);
      } else {
        setError(resp.error || 'Could not load slots');
        setSlots([]);
      }
      setLoading(false);
    });

    return function () { cancelled = true; };
  }, [therapist.id, selectedDateOffset]);

  function handleConfirm() {
    if (!selectedSlot) return;
    navigation.navigate(PATIENT_ROUTES.BOOKING_CONFIRMED, {
      therapist: therapist,
      selectedSlot: selectedSlot, // object {utc, local, available}
      dateLabel: buildDateLabel(selectedDateOffset),
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <InlineBanner
        visible={!!error}
        variant="error"
        message={error || ''}
        onDismiss={function () { setError(null); }}
      />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={function () { navigation.goBack(); }}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Select a Slot</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Therapist mini-info */}
        <View style={styles.therapistRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitials}>
              {therapist.name.split(' ').slice(1).map(function (w) { return w[0]; }).join('')}
            </Text>
          </View>
          <View>
            <Text style={styles.therapistName}>{therapist.name}</Text>
            <Text style={styles.therapistSpec}>{therapist.spec}</Text>
          </View>
        </View>

        {/* Date row — shows the currently-selected date */}
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.primary} />
          <Text style={styles.dateText}>
            {buildDateLabel(selectedDateOffset)}
          </Text>
        </View>

        {/* Day strip — 7-pill horizontal selector */}
        <Text style={styles.sectionLabel}>Select a Day</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayStripContent}
          style={styles.dayStrip}
        >
          {DAY_OFFSETS.map(function (offset) {
            var isSelected = selectedDateOffset === offset;
            // Unselected "Tomorrow" gets the chipTomorrow* token pair as a
            // subtle visual differentiator; all other unselected chips use
            // primaryLight + border. Selected wins on any offset.
            var isTomorrow = offset === 1;
            var chipStyle = [
              styles.dayChip,
              !isSelected && isTomorrow && styles.dayChipTomorrow,
              isSelected && styles.dayChipSelected,
            ];
            var textStyle = [
              styles.dayChipText,
              !isSelected && isTomorrow && styles.dayChipTextTomorrow,
              isSelected && styles.dayChipTextSelected,
            ];
            return (
              <Pressable
                key={offset}
                style={chipStyle}
                onPress={function () { setSelectedDateOffset(offset); }}
              >
                <Text style={textStyle}>{pillLabel(offset)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Slot section */}
        <Text style={styles.sectionLabel}>Available Times</Text>
        {loading ? (
          <View style={styles.slotStateWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : error ? (
          // Banner above is already showing the error; reserve the slot area
          // visually so the layout doesn't collapse mid-screen.
          <View style={styles.slotStateWrap} />
        ) : slots.length === 0 ? (
          <View style={styles.slotStateWrap}>
            <Text style={styles.emptyTitle}>No slots available for this day</Text>
            <Text style={styles.emptySubtitle}>Try another day in the strip above.</Text>
          </View>
        ) : (
          <View style={styles.slotGrid}>
            {slots.map(function (slot) {
              var isSelected = selectedSlot && selectedSlot.utc === slot.utc;
              return (
                <Pressable
                  key={slot.utc}
                  style={[styles.slotChip, isSelected && styles.slotChipSelected]}
                  onPress={function () { setSelectedSlot(slot); }}
                >
                  <Text style={[styles.slotText, isSelected && styles.slotTextSelected]}>
                    {formatLocalTime(slot.local)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Booking summary card */}
        <Text style={styles.sectionLabel}>Booking Summary</Text>
        <View style={styles.summaryCard}>
          <SummaryRow icon="person-outline" label="Therapist" value={therapist.name} />
          <SummaryRow
            icon="calendar-outline"
            label="Date"
            value={buildDateLabel(selectedDateOffset)}
          />
          <SummaryRow
            icon="time-outline"
            label="Time"
            value={selectedSlot ? formatLocalTime(selectedSlot.local) : '—'}
          />
          <SummaryRow icon="hourglass-outline" label="Duration" value="30 mins" />
          <SummaryRow icon="cash-outline" label="Fee" value="₹500" highlight />
        </View>

        {/* Confirm button */}
        <Pressable
          style={[styles.confirmBtn, !selectedSlot && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!selectedSlot}
        >
          <Text style={styles.confirmBtnText}>Confirm Booking</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * A single row in the booking summary card.
 * @param {{ icon: string, label: string, value: string, highlight?: boolean }} props
 */
function SummaryRow({ icon, label, value, highlight }) {
  return (
    <View style={summaryStyles.row}>
      <Ionicons name={icon} size={16} color={colors.textMedium} />
      <Text style={summaryStyles.label}>{label}</Text>
      <Text style={[summaryStyles.value, highlight && summaryStyles.valueHighlight]}>
        {value}
      </Text>
    </View>
  );
}

var summaryStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: { flex: 1, fontSize: fonts.sm, color: colors.textMedium },
  value: { fontSize: fonts.sm, fontWeight: fonts.medium, color: colors.textDark },
  valueHighlight: { color: colors.primary, fontWeight: fonts.bold },
});

var styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontFamily: fonts.heading.regular,
    fontSize: fonts.lg, lineHeight: fonts.lg * 1.35,
    color: colors.textDark,
  },
  headerSpacer: { width: 36 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  therapistRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primaryLight,
    borderWidth: 2, borderColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitials: { fontSize: fonts.md, fontWeight: fonts.bold, color: colors.primary },
  therapistName: { fontSize: fonts.md, fontWeight: fonts.bold, color: colors.textDark },
  therapistSpec: { fontSize: fonts.sm, color: colors.textMedium },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  dateText: { fontSize: fonts.sm, color: colors.textMedium },

  sectionLabel: {
    fontSize: fonts.sm, fontWeight: fonts.semibold, color: colors.textMedium,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },

  // Day strip
  dayStrip: { marginBottom: 24 },
  dayStripContent: { gap: 8, paddingRight: 4 },
  dayChip: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 99, // full pill per design system (CLAUDE.md design system)
    backgroundColor: colors.primaryLight,
    borderWidth: 1, borderColor: colors.border,
  },
  dayChipTomorrow: { backgroundColor: colors.chipTomorrowBg },
  dayChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipText: { fontSize: fonts.sm, color: colors.primaryDark, fontWeight: fonts.medium },
  dayChipTextTomorrow: { color: colors.chipTomorrowText },
  dayChipTextSelected: { color: colors.textOnPrimary, fontWeight: fonts.bold },

  // Slot grid + states
  slotStateWrap: {
    minHeight: 80,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 16,
    marginBottom: 24,
    gap: 6,
  },
  emptyTitle: { fontSize: fonts.sm, fontWeight: fonts.semibold, color: colors.textDark, textAlign: 'center' },
  emptySubtitle: { fontSize: fonts.xs, color: colors.textMedium, textAlign: 'center' },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  slotChip: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  slotChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotText: { fontSize: fonts.sm, color: colors.textMedium, fontWeight: fonts.medium },
  slotTextSelected: { color: colors.textOnPrimary, fontWeight: fonts.bold },

  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16, paddingHorizontal: 16, paddingTop: 4,
    marginBottom: 24,
    borderWidth: 1, borderColor: colors.border,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14, height: 52,
    justifyContent: 'center', alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: {
    fontSize: fonts.md, fontWeight: fonts.bold,
    color: colors.textOnPrimary, letterSpacing: 0.4,
  },
});
