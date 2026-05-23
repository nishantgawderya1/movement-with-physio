// src/components/common/CalendarPicker.jsx
// Reusable mini-calendar Modal. Extracted from SetScheduleScreen.js:87-196
// during P3.4 so the propose-session form can share it. Behavior is byte-
// identical from a user perspective — same props, same styles, same
// past-day blocking, same "Done" close button.

import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfWeek = (month, year) => new Date(year, month, 1).getDay();

/**
 * Mini calendar Modal. Tap a future day → onSelect(Date) + onClose().
 *
 * @param {{ visible: boolean, selectedDate: Date | null, onSelect: (Date) => void, onClose: () => void }} props
 */
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
    d.setHours(0, 0, 0, 0);
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return d < t;
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.picker}>

          <View style={styles.navRow}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={20} color={colors.textDark} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{MONTHS[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-forward" size={20} color={colors.textDark} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
              <Text key={d} style={styles.weekDay}>{d}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((day, idx) => {
              if (!day) return <View key={`empty-${idx}`} style={styles.dayCell} />;
              const past = isPastDay(day);
              const sel  = isSelectedDay(day);
              const tod  = isToday(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayCell,
                    tod && !sel && styles.todayCell,
                    sel && styles.selectedCell,
                    past && styles.pastCell,
                  ]}
                  onPress={() => {
                    if (past) return;
                    onSelect(new Date(viewYear, viewMonth, day));
                    onClose();
                  }}
                  activeOpacity={past ? 1 : 0.75}
                >
                  <Text style={[
                    styles.dayText,
                    tod && !sel && styles.todayText,
                    sel && styles.selectedDayText,
                    past && styles.pastText,
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.closeBtnText}>Done</Text>
          </TouchableOpacity>

        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.background,
    justifyContent: 'center', alignItems: 'center',
  },
  monthLabel: {
    fontSize: fonts.md, fontWeight: fonts.bold, color: colors.textDark,
  },
  weekRow: { flexDirection: 'row', marginBottom: 8 },
  weekDay: {
    flex: 1, textAlign: 'center',
    fontSize: fonts.xs, fontWeight: fonts.semibold, color: colors.textLight,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center', alignItems: 'center',
    borderRadius: 20, marginVertical: 1,
  },
  todayCell: { borderWidth: 1.5, borderColor: colors.primary },
  selectedCell: { backgroundColor: colors.primary },
  pastCell: { opacity: 0.3 },
  dayText: { fontSize: fonts.sm, color: colors.textDark },
  todayText: { color: colors.primary, fontWeight: fonts.semibold },
  selectedDayText: { color: colors.white, fontWeight: fonts.bold },
  pastText: { color: colors.textLight },
  closeBtn: {
    backgroundColor: colors.primary, borderRadius: 24, height: 44,
    justifyContent: 'center', alignItems: 'center',
  },
  closeBtnText: { color: colors.white, fontSize: fonts.md, fontWeight: fonts.semibold },
});

export default CalendarPicker;
