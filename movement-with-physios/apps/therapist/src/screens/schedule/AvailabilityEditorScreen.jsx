// src/screens/schedule/AvailabilityEditorScreen.jsx
// Tier 4 Flow 1 — Step 5: therapist recurring weekly availability editor.
//
// Display order: Monday-first for clinical readability. Storage: Sun=0..Sat=6
// (matches Date.getDay() and the backend Joi schema). The Mon-first visual
// reorder is presentation-only — each row carries its TRUE dayOfWeek integer
// via DAY_ROWS below, and that value is what flows into the payload. The
// visual reorder MUST NOT leak into the wire format.

import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, Modal, TouchableOpacity, ActivityIndicator, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/ScreenContainer';
import AppButton from '../../components/AppButton';
import InlineBanner from '../../components/InlineBanner';
import TimePillPicker from '../../components/common/TimePillPicker';
import { colors } from '../../constants/colors';
import { fonts, fontFamilies } from '../../constants/fonts';
import { getAvailability, updateAvailability } from '../../services/scheduleService';

// SINGLE SOURCE OF TRUTH for display→storage mapping.
// Visual order is Mon..Sun; dayOfWeek is the wire value (Sun=0..Sat=6).
// Adding/reordering rows here is the ONLY place the two are tied together.
const DAY_ROWS = [
  { dayOfWeek: 1, label: 'Monday' },
  { dayOfWeek: 2, label: 'Tuesday' },
  { dayOfWeek: 3, label: 'Wednesday' },
  { dayOfWeek: 4, label: 'Thursday' },
  { dayOfWeek: 5, label: 'Friday' },
  { dayOfWeek: 6, label: 'Saturday' },
  { dayOfWeek: 0, label: 'Sunday' },
];

const MAX_WINDOWS = 20;
const TIMEZONE = 'Asia/Kolkata';

function labelForDay(dayOfWeek) {
  const row = DAY_ROWS.find((r) => r.dayOfWeek === dayOfWeek);
  return row ? row.label : 'Day ' + dayOfWeek;
}

function formatMinutes(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  let hh = h % 12; if (hh === 0) hh = 12;
  return hh + ':' + (m < 10 ? '0' + m : m) + ' ' + ampm;
}

/**
 * Mirror of the backend overlap algorithm in
 * backend/src/modules/therapist/therapist.validation.js:36-52.
 * Same grouping (by dayOfWeek), same sort (by startMinute asc),
 * same strict-less-than comparison (touching windows are valid).
 * Plus the schema-level gates: endMinute > startMinute, count ≤ MAX_WINDOWS.
 *
 * @param {Array<{dayOfWeek:number,startMinute:number,endMinute:number}>} windows
 * @returns {{ valid: boolean, error: string|null }}
 */
function validateWindows(windows) {
  if (windows.length > MAX_WINDOWS) {
    return { valid: false, error: 'You can have at most ' + MAX_WINDOWS + ' windows total.' };
  }
  for (const w of windows) {
    if (!(w.endMinute > w.startMinute)) {
      return { valid: false, error: 'End time must be after start time on ' + labelForDay(w.dayOfWeek) + '.' };
    }
  }
  const byDay = {};
  for (const w of windows) {
    if (!byDay[w.dayOfWeek]) byDay[w.dayOfWeek] = [];
    byDay[w.dayOfWeek].push(w);
  }
  for (const day of Object.keys(byDay)) {
    const sorted = byDay[day].slice().sort((a, b) => a.startMinute - b.startMinute);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].startMinute < sorted[i - 1].endMinute) {
        return { valid: false, error: 'Overlapping windows on ' + labelForDay(Number(day)) + '.' };
      }
    }
  }
  return { valid: true, error: null };
}

// TimePillPicker emits a Date; we store minutes-from-midnight per the wire
// contract. These helpers bridge the two and the date portion is throwaway.
function dateToMinutes(d) { return d.getHours() * 60 + d.getMinutes(); }
function minutesToDate(min) {
  const d = new Date();
  d.setHours(Math.floor(min / 60), min % 60, 0, 0);
  return d;
}

export default function AvailabilityEditorScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [windows, setWindows] = useState([]);
  const [banner, setBanner] = useState({ visible: false, variant: 'success', message: '' });
  // editor: null | { mode: 'add'|'edit', dayOfWeek, indexInDay?, startMinute, endMinute }
  const [editor, setEditor] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const resp = await getAvailability();
      if (cancelled) return;
      if (resp.success) {
        setWindows(Array.isArray(resp.data && resp.data.windows) ? resp.data.windows : []);
      } else {
        setBanner({ visible: true, variant: 'error', message: resp.error || 'Failed to load availability.' });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Per-day, sorted-by-startMinute view. Each entry carries _index = original
  // index in `windows` so commit/remove edits the right slot regardless of sort.
  const windowsByDay = useMemo(() => {
    const map = {};
    for (let i = 0; i < windows.length; i++) {
      const w = windows[i];
      if (!map[w.dayOfWeek]) map[w.dayOfWeek] = [];
      map[w.dayOfWeek].push({ ...w, _index: i });
    }
    for (const day of Object.keys(map)) {
      map[day].sort((a, b) => a.startMinute - b.startMinute);
    }
    return map;
  }, [windows]);

  function openAdd(dayOfWeek) {
    setEditor({ mode: 'add', dayOfWeek, startMinute: 9 * 60, endMinute: 10 * 60 });
  }
  function openEdit(dayOfWeek, indexInDay, w) {
    setEditor({ mode: 'edit', dayOfWeek, indexInDay, startMinute: w.startMinute, endMinute: w.endMinute });
  }
  function closeEditor() { setEditor(null); }

  function commitEditor() {
    if (!editor) return;
    const next = windows.slice();
    const proposed = {
      dayOfWeek: editor.dayOfWeek,
      startMinute: editor.startMinute,
      endMinute: editor.endMinute,
    };
    if (editor.mode === 'edit') {
      const original = (windowsByDay[editor.dayOfWeek] || [])[editor.indexInDay];
      if (original && typeof original._index === 'number') next[original._index] = proposed;
      else next.push(proposed);
    } else {
      next.push(proposed);
    }
    const result = validateWindows(next);
    if (!result.valid) {
      setBanner({ visible: true, variant: 'error', message: result.error });
      return;
    }
    setWindows(next);
    setEditor(null);
    setBanner({ visible: false, variant: 'success', message: '' });
  }

  function removeWindow(dayOfWeek, indexInDay) {
    const original = (windowsByDay[dayOfWeek] || [])[indexInDay];
    if (!original || typeof original._index !== 'number') return;
    const next = windows.slice();
    next.splice(original._index, 1);
    setWindows(next);
  }

  async function handleSave() {
    if (saving) return;
    const result = validateWindows(windows);
    if (!result.valid) {
      setBanner({ visible: true, variant: 'error', message: result.error });
      return;
    }
    setSaving(true);
    const resp = await updateAvailability({ windows, timezone: TIMEZONE });
    setSaving(false);
    if (!resp.success) {
      setBanner({ visible: true, variant: 'error', message: resp.error || 'Failed to save availability.' });
      return;
    }
    setBanner({ visible: true, variant: 'success', message: 'Availability saved.' });
  }

  if (loading) {
    return (
      <ScreenContainer scroll={false} keyboardAvoiding={false}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll keyboardAvoiding={false}>
      <InlineBanner
        visible={banner.visible}
        variant={banner.variant}
        message={banner.message}
        onDismiss={() => setBanner((b) => ({ ...b, visible: false }))}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Scheduled availability</Text>
          <Text style={styles.subtitle}>Set the hours you're bookable each week</Text>
        </View>
      </View>

      {DAY_ROWS.map((row) => {
        const dayWindows = windowsByDay[row.dayOfWeek] || [];
        return (
          <View key={row.dayOfWeek} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>{row.label}</Text>
              <TouchableOpacity onPress={() => openAdd(row.dayOfWeek)} style={styles.addBtn} activeOpacity={0.75}>
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
            {dayWindows.length === 0 ? (
              <Text style={styles.emptyDay}>No hours set</Text>
            ) : (
              dayWindows.map((w, idx) => (
                <View key={idx} style={styles.windowRow}>
                  <TouchableOpacity
                    onPress={() => openEdit(row.dayOfWeek, idx, w)}
                    style={styles.windowPill}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.windowText}>
                      {formatMinutes(w.startMinute)} – {formatMinutes(w.endMinute)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => removeWindow(row.dayOfWeek, idx)}
                    style={styles.removeBtn}
                    activeOpacity={0.7}
                    accessibilityLabel="Remove window"
                  >
                    <Ionicons name="close" size={16} color={colors.textMedium} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        );
      })}

      <View style={{ height: 8 }} />
      <AppButton
        title={saving ? 'Saving…' : 'Save'}
        onPress={handleSave}
        loading={saving}
        variant="pill"
      />
      <View style={{ height: 32 }} />

      {/* ── Per-window editor modal ────────────────────────────── */}
      <Modal visible={!!editor} transparent animationType="fade" onRequestClose={closeEditor}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editor ? labelForDay(editor.dayOfWeek) : ''}
            </Text>

            <Text style={styles.modalSectionLabel}>Start time</Text>
            <TimePillPicker
              baseDate={new Date()}
              value={editor ? minutesToDate(editor.startMinute) : null}
              onChange={(d) => setEditor((e) => e ? { ...e, startMinute: dateToMinutes(d) } : e)}
            />

            <View style={{ height: 16 }} />

            <Text style={styles.modalSectionLabel}>End time</Text>
            <TimePillPicker
              baseDate={new Date()}
              value={editor ? minutesToDate(editor.endMinute) : null}
              onChange={(d) => setEditor((e) => e ? { ...e, endMinute: dateToMinutes(d) } : e)}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={closeEditor} style={styles.cancelBtn} activeOpacity={0.75}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={commitEditor} style={styles.saveBtn} activeOpacity={0.85}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 6, paddingBottom: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  headerTextWrap: { flex: 1 },
  title: { fontFamily: fontFamilies.instrumentSerif, fontSize: fonts.xl, color: colors.textDark, lineHeight: 26 },
  subtitle: { fontSize: fonts.xs, color: colors.textMedium, marginTop: 1 },
  dayCard: {
    backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  dayLabel: { fontSize: fonts.md, fontWeight: fonts.semibold, color: colors.textDark },
  addBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6 },
  addBtnText: { color: colors.primary, fontSize: fonts.sm, fontWeight: fonts.semibold, marginLeft: 4 },
  emptyDay: { fontSize: fonts.sm, color: colors.textLight, paddingVertical: 6 },
  windowRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  windowPill: {
    flex: 1,
    borderWidth: 1, borderColor: colors.primaryLight,
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  windowText: { fontSize: fonts.sm, color: colors.primary, fontWeight: fonts.semibold },
  removeBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', marginLeft: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 18 },
  modalCard: { backgroundColor: colors.white, borderRadius: 16, padding: 18 },
  modalTitle: { fontSize: fonts.lg, fontWeight: fonts.bold, color: colors.textDark, marginBottom: 14 },
  modalSectionLabel: { fontSize: fonts.sm, fontWeight: fonts.semibold, color: colors.textMedium, marginBottom: 8 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 18, gap: 10 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  cancelBtnText: { color: colors.textMedium, fontSize: fonts.sm, fontWeight: fonts.semibold },
  saveBtn: { backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  saveBtnText: { color: colors.white, fontSize: fonts.sm, fontWeight: fonts.bold },
});
