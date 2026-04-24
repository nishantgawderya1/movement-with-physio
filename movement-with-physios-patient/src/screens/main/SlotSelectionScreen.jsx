import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { PATIENT_ROUTES } from '../../constants/routes';

var TIME_SLOTS = [
  '10:00 AM', '11:00 AM', '12:00 PM',
  '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
];

var BOOKING_DATE = 'Mon, 14 Apr 2026';
var CONSULTATION_FEE = '₹500';
var DURATION = '30 mins';

/**
 * Time slot selection screen.
 * Receives `therapist` object from navigation params.
 * @param {{ navigation: object, route: object }} props
 */
export default function SlotSelectionScreen({ navigation, route }) {
  var therapist = route.params.therapist;
  var [selectedSlot, setSelectedSlot] = useState(null);

  function handleConfirm() {
    navigation.navigate(PATIENT_ROUTES.BOOKING_CONFIRMED, {
      therapist: therapist,
      slot: selectedSlot,
      date: BOOKING_DATE,
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
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

        {/* Date row */}
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.primary} />
          <Text style={styles.dateText}>{BOOKING_DATE}</Text>
        </View>

        {/* Slot grid */}
        <Text style={styles.sectionLabel}>Available Times</Text>
        <View style={styles.slotGrid}>
          {TIME_SLOTS.map(function (slot) {
            var isSelected = selectedSlot === slot;
            return (
              <Pressable
                key={slot}
                style={[styles.slotChip, isSelected && styles.slotChipSelected]}
                onPress={function () { setSelectedSlot(slot); }}
              >
                <Text style={[styles.slotText, isSelected && styles.slotTextSelected]}>
                  {slot}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Booking summary card */}
        <Text style={styles.sectionLabel}>Booking Summary</Text>
        <View style={styles.summaryCard}>
          <SummaryRow icon="person-outline" label="Therapist" value={therapist.name} />
          <SummaryRow icon="calendar-outline" label="Date" value={BOOKING_DATE} />
          <SummaryRow icon="time-outline" label="Time" value={selectedSlot || '—'} />
          <SummaryRow icon="hourglass-outline" label="Duration" value={DURATION} />
          <SummaryRow icon="cash-outline" label="Fee" value={CONSULTATION_FEE} highlight />
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
  label: {
    flex: 1,
    fontSize: fonts.sm,
    color: colors.textMedium,
  },
  value: {
    fontSize: fonts.sm,
    fontWeight: fonts.medium,
    color: colors.textDark,
  },
  valueHighlight: {
    color: colors.primary,
    fontWeight: fonts.bold,
  },
});

var styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.heading.regular,
    fontSize: fonts.lg,
    lineHeight: fonts.lg * 1.35,
    color: colors.textDark,
  },
  headerSpacer: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  therapistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: fonts.md,
    fontWeight: fonts.bold,
    color: colors.primary,
  },
  therapistName: {
    fontSize: fonts.md,
    fontWeight: fonts.bold,
    color: colors.textDark,
  },
  therapistSpec: {
    fontSize: fonts.sm,
    color: colors.textMedium,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dateText: {
    fontSize: fonts.sm,
    color: colors.textMedium,
  },
  sectionLabel: {
    fontSize: fonts.sm,
    fontWeight: fonts.semibold,
    color: colors.textMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  slotChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  slotText: {
    fontSize: fonts.sm,
    color: colors.textMedium,
    fontWeight: fonts.medium,
  },
  slotTextSelected: {
    color: colors.textOnPrimary,
    fontWeight: fonts.bold,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.4,
  },
  confirmBtnText: {
    fontSize: fonts.md,
    fontWeight: fonts.bold,
    color: colors.textOnPrimary,
    letterSpacing: 0.4,
  },
});
