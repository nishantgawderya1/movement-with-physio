// src/screens/AssignFlow/SetScheduleScreen.js
// Step 2 of the Assign Exercises flow — configure exercise schedule.

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts, fontFamilies } from '../../constants/fonts';
import StepProgressBar from '../../components/assign/StepProgressBar';
import { ROUTES } from '../../constants/routes';

// ── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();

const getFirstDayOfWeek = (month, year) => new Date(year, month, 1).getDay();

const formatDate = (date) => {
  if (!date) return '';
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

// ── Segmented Pill Selector ───────────────────────────────────────────────────
const PillSelector = ({ options, selected, onSelect }) => (
  <View style={pillStyles.container}>
    {options.map((opt) => {
      const isActive = selected === opt;
      return (
        <TouchableOpacity
          key={opt}
          style={[pillStyles.pill, isActive && pillStyles.pillActive]}
          onPress={() => onSelect(opt)}
          activeOpacity={0.75}
        >
          <Text style={[pillStyles.pillText, isActive && pillStyles.pillTextActive]}>
            {opt}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const pillStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    backgroundColor: colors.white,
  },
  pillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  pillText: {
    fontSize: fonts.sm,
    fontWeight: fonts.medium,
    color: colors.textMedium,
  },
  pillTextActive: {
    color: colors.primary,
    fontWeight: fonts.semibold,
  },
});

// ── Mini Calendar Picker ──────────────────────────────────────────────────────
const CalendarPicker = ({ visible, selectedDate, onSelect, onClose }) => {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(selectedDate?.getMonth() ?? today.getMonth());
  const [viewYear,  setViewYear]  = useState(selectedDate?.getFullYear() ?? today.getFullYear());

  const daysInMonth = getDaysInMonth(viewMonth, viewYear);
  const firstDay    = getFirstDayOfWeek(viewMonth, viewYear);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const isSelectedDay = (day) =>
    selectedDate &&
    selectedDate.getDate() === day &&
    selectedDate.getMonth() === viewMonth &&
    selectedDate.getFullYear() === viewYear;

  const isToday = (day) =>
    today.getDate() === day &&
    today.getMonth() === viewMonth &&
    today.getFullYear() === viewYear;

  const isPastDay = (day) => {
    const d = new Date(viewYear, viewMonth, day);
    d.setHours(0,0,0,0);
    const t = new Date(); t.setHours(0,0,0,0);
    return d < t;
  };

  // Build grid: empty cells + day cells
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={calStyles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={calStyles.picker}>

          {/* Month navigation */}
          <View style={calStyles.navRow}>
            <TouchableOpacity onPress={prevMonth} style={calStyles.navBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={20} color={colors.textDark} />
            </TouchableOpacity>
            <Text style={calStyles.monthLabel}>
              {MONTHS[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={calStyles.navBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-forward" size={20} color={colors.textDark} />
            </TouchableOpacity>
          </View>

          {/* Weekday headers */}
          <View style={calStyles.weekRow}>
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
              <Text key={d} style={calStyles.weekDay}>{d}</Text>
            ))}
          </View>

          {/* Day grid */}
          <View style={calStyles.grid}>
            {cells.map((day, idx) => {
              if (!day) return <View key={`empty-${idx}`} style={calStyles.dayCell} />;
              const past = isPastDay(day);
              const sel  = isSelectedDay(day);
              const tod  = isToday(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    calStyles.dayCell,
                    tod && !sel && calStyles.todayCell,
                    sel && calStyles.selectedCell,
                    past && calStyles.pastCell,
                  ]}
                  onPress={() => {
                    if (past) return;
                    onSelect(new Date(viewYear, viewMonth, day));
                    onClose();
                  }}
                  activeOpacity={past ? 1 : 0.75}
                >
                  <Text style={[
                    calStyles.dayText,
                    tod && !sel && calStyles.todayText,
                    sel && calStyles.selectedDayText,
                    past && calStyles.pastText,
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={calStyles.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={calStyles.closeBtnText}>Done</Text>
          </TouchableOpacity>

        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const calStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 24,
  },
  picker: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.background,
    justifyContent: 'center', alignItems: 'center',
  },
  monthLabel: {
    fontSize: fonts.md,
    fontWeight: fonts.bold,
    color: colors.textDark,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDay: {
    flex: 1, textAlign: 'center',
    fontSize: fonts.xs,
    fontWeight: fonts.semibold,
    color: colors.textLight,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    marginVertical: 1,
  },
  todayCell: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  selectedCell: {
    backgroundColor: colors.primary,
  },
  pastCell: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: fonts.sm,
    color: colors.textDark,
  },
  todayText: { color: colors.primary, fontWeight: fonts.semibold },
  selectedDayText: { color: colors.white, fontWeight: fonts.bold },
  pastText: { color: colors.textLight },
  closeBtn: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: colors.white,
    fontSize: fonts.md,
    fontWeight: fonts.semibold,
  },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
const SetScheduleScreen = ({ navigation, route }) => {
  const { selectedExercises = [], selectedClient } = route.params ?? {};

  const [startDate,   setStartDate]   = useState(null);
  const [showCal,     setShowCal]     = useState(false);
  const [duration,    setDuration]    = useState('2 weeks');
  const [frequency,   setFrequency]   = useState(null);
  const [timeOfDay,   setTimeOfDay]   = useState(null);

  const isComplete = startDate && frequency && timeOfDay;

  const handleNext = () => {
    if (!isComplete) return;
    navigation.navigate(ROUTES.REVIEW_ASSIGNMENT, {
      selectedExercises,
      selectedClient,
      scheduleConfig: {
        startDate: startDate.toISOString(),
        duration,
        frequency,
        timeOfDay,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Assign Exercises</Text>
          <Text style={styles.subtitle}>
            {selectedExercises.length} exercise{selectedExercises.length !== 1 ? 's' : ''} selected
          </Text>
        </View>
      </View>

      {/* ── Step Progress ────────────────────────────────────────────── */}
      <StepProgressBar currentStep={2} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Section Header ───────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Set Schedule</Text>
          <Text style={styles.sectionDesc}>When should the client perform these exercises?</Text>
        </View>

        {/* ── Start Date ───────────────────────────────────────────── */}
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Start Date</Text>
          <TouchableOpacity
            style={[styles.dateField, startDate && styles.dateFieldFilled]}
            onPress={() => setShowCal(true)}
            activeOpacity={0.8}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={startDate ? colors.primary : colors.placeholder}
              style={{ marginRight: 10 }}
            />
            <Text style={[styles.dateFieldText, !startDate && styles.dateFieldPlaceholder]}>
              {startDate ? formatDate(startDate) : 'Select start date'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* ── Duration ─────────────────────────────────────────────── */}
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Program Duration</Text>
          <PillSelector
            options={['1 week', '2 weeks', '3 weeks', '4 weeks']}
            selected={duration}
            onSelect={setDuration}
          />
        </View>

        {/* ── Frequency ────────────────────────────────────────────── */}
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Frequency</Text>
          <PillSelector
            options={['Daily', 'Every other day', 'Weekly']}
            selected={frequency}
            onSelect={setFrequency}
          />
        </View>

        {/* ── Time of Day ──────────────────────────────────────────── */}
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Time</Text>
          <PillSelector
            options={['Morning', 'Afternoon', 'Evening']}
            selected={timeOfDay}
            onSelect={setTimeOfDay}
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Calendar Modal ──────────────────────────────────────────── */}
      <CalendarPicker
        visible={showCal}
        selectedDate={startDate}
        onSelect={setStartDate}
        onClose={() => setShowCal(false)}
      />

      {/* ── Bottom Actions ──────────────────────────────────────────── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, !isComplete && styles.nextButtonDisabled]}
          onPress={handleNext}
          activeOpacity={isComplete ? 0.85 : 1}
        >
          <Text style={styles.nextButtonText}>Next</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.white} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
  },
  headerText: { flex: 1 },
  title: {
    fontFamily: fontFamilies.instrumentSerif,
    fontSize: fonts.xl,
    color: colors.textDark,
    lineHeight: 26,
  },
  subtitle: { fontSize: fonts.xs, color: colors.textMedium, marginTop: 1 },

  scroll: {
    paddingHorizontal: 18,
    paddingTop: 20,
  },

  sectionHeader: { marginBottom: 22 },
  sectionTitle: {
    fontSize: fonts.lg, fontWeight: fonts.bold, color: colors.textDark, marginBottom: 4,
  },
  sectionDesc: {
    fontSize: fonts.sm, color: colors.textLight, lineHeight: 18,
  },

  fieldBlock: { marginBottom: 24 },
  fieldLabel: {
    fontSize: fonts.sm, fontWeight: fonts.semibold,
    color: colors.textDark, marginBottom: 6,
  },

  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    paddingHorizontal: 14,
    height: 50,
  },
  dateFieldFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  dateFieldText: {
    flex: 1, fontSize: fonts.md, color: colors.textDark,
  },
  dateFieldPlaceholder: { color: colors.placeholder },

  bottomBar: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 18, paddingTop: 12, paddingBottom: 24,
    backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.cardBorder,
  },
  backButton: {
    flex: 1, height: 50, borderRadius: 25,
    borderWidth: 1.5, borderColor: colors.cardBorder,
    justifyContent: 'center', alignItems: 'center',
  },
  backButtonText: {
    fontSize: fonts.md, fontWeight: fonts.semibold, color: colors.textMedium,
  },
  nextButton: {
    flex: 2, height: 50, borderRadius: 25,
    backgroundColor: colors.primary,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
  },
  nextButtonDisabled: { backgroundColor: '#A0AEC0' },
  nextButtonText: {
    fontSize: fonts.md, fontWeight: fonts.semibold, color: colors.white,
  },
});

export default SetScheduleScreen;
