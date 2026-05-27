// src/components/common/TimePillPicker.jsx
// Hand-built hour + minute pill picker (locked decision: no new
// dependency, no datetimepicker). Two horizontal scrollable rows: hour
// (6 AM - 9 PM) and minute (00/15/30/45). Combines the calendar-selected
// `baseDate` with the picked hour/minute into a JS Date passed to onChange.

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';

// Clinical hours: 6 AM through 9 PM (start hours; sessions end up to 1h later).
// Inclusive both ends — start times only.
const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
const MINUTES = [0, 15, 30, 45];

function formatHour(h) {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  if (h < 12) return h + ' AM';
  return (h - 12) + ' PM';
}

function pad(n) { return n < 10 ? '0' + n : String(n); }

/**
 * Hour + minute pill picker. Combines baseDate (calendar day) with the
 * picked H:M into a Date passed to onChange. Reads back the H:M from
 * `value` when present so the active pill highlights correctly.
 *
 * @param {{ value: Date | null, onChange: (Date) => void, baseDate: Date | null }} props
 */
export default function TimePillPicker({ value, onChange, baseDate }) {
  const selectedH = value ? value.getHours() : null;
  const selectedM = value ? value.getMinutes() : null;

  function pickHour(h) {
    if (!baseDate) return; // calendar must select a day first
    const m = selectedM !== null ? selectedM : 0;
    const d = new Date(baseDate);
    d.setHours(h, m, 0, 0);
    onChange(d);
  }
  function pickMinute(m) {
    if (!baseDate) return;
    const h = selectedH !== null ? selectedH : HOURS[0];
    const d = new Date(baseDate);
    d.setHours(h, m, 0, 0);
    onChange(d);
  }

  return (
    <View>
      <Text style={styles.rowLabel}>Hour</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {HOURS.map((h) => {
          const active = h === selectedH;
          return (
            <TouchableOpacity
              key={h}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => pickHour(h)}
              activeOpacity={0.75}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {formatHour(h)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={[styles.rowLabel, { marginTop: 12 }]}>Minute</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {MINUTES.map((m) => {
          const active = m === selectedM;
          return (
            <TouchableOpacity
              key={m}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => pickMinute(m)}
              activeOpacity={0.75}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {pad(m)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  rowLabel: {
    fontSize: fonts.xs,
    fontWeight: fonts.semibold,
    color: colors.textMedium,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  pill: {
    minWidth: 64,
    height: 44,
    borderRadius: 25,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: fonts.sm,
    color: colors.textDark,
    fontWeight: fonts.medium,
  },
  pillTextActive: {
    color: colors.white,
    fontWeight: fonts.semibold,
  },
});
