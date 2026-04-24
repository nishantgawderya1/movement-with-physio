// src/screens/auth/ScheduleVerificationCallScreen.jsx
// ─────────────────────────────────────────────────────────────────────────────
// FIGMA REFERENCE: Schedule Verification Call Screen
// Part of therapist onboarding — comes after ProfilePhotoScreen.
//
// Behaviour:
//   - Dynamically generates the next 5 weekdays (Mon–Fri) from today
//   - User taps a date tile to select it
//   - "Confirm Booking" enabled only after a date is selected
//   - Selected date tile gets teal highlight + white text
//
// Backend developer: replace handleConfirm body only.
//   Call TherapistService.scheduleVerificationCall({ date: selectedDate })
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts, fontFamilies } from '../../constants/fonts';



// ── Helpers ───────────────────────────────────────────────────────────────────
const DAY_NAMES  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/**
 * Returns the next `count` weekdays (Mon–Fri) starting from tomorrow.
 * Each item: { label: 'Mon', date: 9, fullDate: Date, key: 'YYYY-MM-DD' }
 */
const getNextWeekdays = (count = 5) => {
  const days = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() + 1); // start from tomorrow

  while (days.length < count) {
    const dow = cursor.getDay(); // 0 Sun … 6 Sat
    if (dow !== 0 && dow !== 6) {
      const yyyy = cursor.getFullYear();
      const mm   = String(cursor.getMonth() + 1).padStart(2, '0');
      const dd   = String(cursor.getDate()).padStart(2, '0');
      days.push({
        label:    DAY_NAMES[dow],
        date:     cursor.getDate(),
        month:    MONTH_NAMES[cursor.getMonth()],
        fullDate: new Date(cursor),
        key:      `${yyyy}-${mm}-${dd}`,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
};

// ── Component ─────────────────────────────────────────────────────────────────
const ScheduleVerificationCallScreen = ({ navigation }) => {

  const [selectedKey, setSelectedKey] = useState(null);
  const weekdays = useMemo(() => getNextWeekdays(5), []);

  // ── Animations ──────────────────────────────────────────────────────────────
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // MOCK HANDLER — backend dev: replace body only
  // ─────────────────────────────────────────────────────────────────────────
  const handleConfirm = () => {
    if (!selectedKey) return;
    const selected = weekdays.find(d => d.key === selectedKey);
    console.log('[MOCK] Verification call scheduled for:', selected.key);
    // TODO: await TherapistService.scheduleVerificationCall({ date: selected.key });
    navigation.navigate('BookingConfirmed', {
      selectedDate: `${selected.label}, ${selected.date} ${selected.month}`,
    });
  };

  // Selected date display string e.g. "Mon, 9 Mar"
  const selectedDay = weekdays.find(d => d.key === selectedKey);
  const selectedLabel = selectedDay
    ? `${selectedDay.label}, ${selectedDay.date} ${selectedDay.month}`
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Top Bar ─────────────────────────────────────────────── */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textDark} />
          </TouchableOpacity>
          <View style={styles.brandIcon}>
            <Ionicons name="pulse" size={16} color={colors.white} />
          </View>
        </View>

        {/* ── Animated content ─────────────────────────────────────── */}
        <Animated.View style={[
          styles.contentWrapper,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}>

          {/* Calendar badge */}
          <View style={styles.badgeIconBox}>
            <Ionicons name="calendar-outline" size={28} color={colors.primary} />
          </View>

          <Text style={styles.heading}>Schedule Verification Call</Text>
          <Text style={styles.subtitle}>
            Our team will verify your credentials{'\n'}and onboard you to the platform
          </Text>

          {/* ── Date Picker Card ─────────────────────────────────── */}
          <View style={styles.card}>

            <Text style={styles.sectionLabel}>Select Date</Text>

            {/* Grid — 3 columns, wrapping */}
            <View style={styles.grid}>
              {weekdays.map((day) => {
                const isSelected = day.key === selectedKey;
                return (
                  <TouchableOpacity
                    key={day.key}
                    style={[styles.tile, isSelected && styles.tileSelected]}
                    onPress={() => setSelectedKey(day.key)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.tileDayName, isSelected && styles.tileTextSelected]}>
                      {day.label}
                    </Text>
                    <Text style={[styles.tileDateNum, isSelected && styles.tileTextSelected]}>
                      {day.date}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Selected date confirmation hint */}
            {selectedLabel ? (
              <View style={styles.selectedHint}>
                <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
                <Text style={styles.selectedHintText}>
                  Selected: {selectedLabel}
                </Text>
              </View>
            ) : (
              <Text style={styles.selectPrompt}>Tap a date to select</Text>
            )}

          </View>

          {/* ── Confirm Booking Button ───────────────────────────── */}
          <TouchableOpacity
            style={[styles.primaryBtn, !selectedKey && styles.primaryBtnDisabled]}
            onPress={handleConfirm}
            disabled={!selectedKey}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Confirm Booking</Text>
          </TouchableOpacity>

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Top bar
  topBar:    { flexDirection: 'row', alignItems: 'center', marginBottom: 36 },
  backBtn:   { padding: 4, marginRight: 12 },
  brandIcon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },

  contentWrapper: { flex: 1 },

  // Badge
  badgeIconBox: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 24,
  },

  // Headings
  heading: {
    fontFamily: fontFamilies.instrumentSerif,
    fontSize: fonts.xxl,
    fontWeight: fonts.bold,
    color: colors.textDark,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: fonts.sm,
    color: colors.textMedium,
    lineHeight: 20,
    marginBottom: 28,
  },

  // Card
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionLabel: {
    fontSize: fonts.sm,
    fontWeight: fonts.semibold,
    color: colors.textDark,
    marginBottom: 16,
  },

  // Date grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  tile: {
    width: '30%',             // 3 per row with gap
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tileDayName: {
    fontSize: fonts.xs,
    color: colors.textMedium,
    marginBottom: 4,
    fontWeight: fonts.semibold,
  },
  tileDateNum: {
    fontSize: fonts.lg,
    fontWeight: fonts.bold,
    color: colors.textDark,
  },
  tileTextSelected: {
    color: colors.white,
  },

  // Hint row
  selectedHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  selectedHintText: {
    fontSize: fonts.xs,
    color: colors.primary,
    fontWeight: fonts.semibold,
  },
  selectPrompt: {
    fontSize: fonts.xs,
    color: colors.textLight,
    fontStyle: 'italic',
    marginTop: 4,
  },

  // Button
  primaryBtn: {
    width: '100%', height: 52,
    backgroundColor: colors.primary,
    borderRadius: 30,
    justifyContent: 'center', alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: {
    color: colors.white,
    fontSize: fonts.md,
    fontWeight: fonts.bold,
    letterSpacing: 0.3,
  },
});

export default ScheduleVerificationCallScreen;