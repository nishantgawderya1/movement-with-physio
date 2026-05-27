// src/screens/bookings/ProposeSessionScreen.jsx
// Therapist propose-session form. Single screen, no wizard. Layout
// modeled on SetScheduleScreen.js:312-417 rhythm: header → scroll with
// field blocks → fixed bottom button bar.
//
// On submit:
//  - Disable button via `submitting` state (locked debounce; therapist
//    apiClient lacks idempotency-key per P3.3 commit — UI-layer is the
//    protection against rapid double-tap).
//  - Construct slotStart as ISO string from { date, time } pair.
//  - Call proposalService.createProposal({ ... }).
//  - On success: navigation.goBack() (returns to BookingsScreen — P3.5
//    will surface the just-created proposal in its pending section).
//  - On error: inline banner with typed-error mapping; submitting reset
//    so retry is possible.

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts, fontFamilies } from '../../constants/fonts';
import CalendarPicker from '../../components/common/CalendarPicker';
import TimePillPicker from '../../components/common/TimePillPicker';
import PatientPickerSheet from '../../components/proposals/PatientPickerSheet';
import { createProposal } from '../../services/proposalService';

const MEETING_TYPES = [
  { value: 'video',     label: 'Video' },
  { value: 'in_person', label: 'In-person' },
];

function formatDateLabel(d) {
  if (!d) return '';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimeLabel(d) {
  if (!d) return '';
  var h = d.getHours();
  var m = d.getMinutes();
  var ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if (h === 0) h = 12;
  return h + ':' + (m < 10 ? '0' + m : m) + ' ' + ampm;
}

// Map backend typed error codes to friendly UI copy. Falls back to the
// server's raw error message for unmapped codes.
function friendlyError(rawError) {
  if (!rawError) return 'Could not create proposal. Please try again.';
  var s = String(rawError).toUpperCase();
  if (s.indexOf('PROPOSAL_NO_PRIOR_RELATIONSHIP') >= 0)
    return 'You can only propose a session to patients you have had a previous booking with.';
  if (s.indexOf('PROPOSAL_SLOT_CONFLICT_THERAPIST') >= 0)
    return 'You already have a session at this time.';
  if (s.indexOf('PROPOSAL_SLOT_CONFLICT_PATIENT') >= 0)
    return 'The patient already has a session at this time.';
  if (s.indexOf('PROPOSAL_SLOT_IN_PAST') >= 0)
    return 'The selected time is in the past.';
  if (s.indexOf('PROPOSAL_DUPLICATE_PENDING') >= 0)
    return 'You already have a pending proposal for this patient at this time.';
  return rawError;
}

export default function ProposeSessionScreen({ navigation }) {
  var [patient, setPatient] = useState(null);
  var [date, setDate] = useState(null);
  var [time, setTime] = useState(null);
  var [meetingType, setMeetingType] = useState('video');
  var [notes, setNotes] = useState('');
  var [submitting, setSubmitting] = useState(false);
  var [errorMessage, setErrorMessage] = useState('');

  var [showPatientSheet, setShowPatientSheet] = useState(false);
  var [showCalendar, setShowCalendar] = useState(false);

  var canSubmit = useMemo(function () {
    return !!(patient && date && time && meetingType);
  }, [patient, date, time, meetingType]);

  function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setErrorMessage('');

    // `time` already has date + hour/minute set (TimePillPicker combines
    // baseDate + H:M into a single Date). toISOString gives UTC.
    var body = {
      patientId: patient.id,
      slotStart: time.toISOString(),
      durationMinutes: 60,
      timezone: 'Asia/Kolkata',
      meetingType: meetingType,
    };
    if (notes && notes.trim()) {
      body.notes = notes.trim();
    }

    createProposal(body).then(function (resp) {
      setSubmitting(false);
      if (resp.success) {
        navigation.goBack();
      } else {
        setErrorMessage(friendlyError(resp.error));
      }
    });
  }

  function handleClear() {
    setPatient(null);
  }

  return (
    <SafeAreaView style={styles.safe}>

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={function () { navigation.goBack(); }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.title}>Propose Session</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Patient ─────────────────────────────────────────────── */}
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Patient</Text>
          {patient ? (
            <View style={styles.patientPill}>
              <View style={[styles.patientAvatar, { backgroundColor: patient.avatarBg }]}>
                <Text style={styles.patientAvatarEmoji}>{patient.avatarEmoji}</Text>
              </View>
              <Text style={styles.patientName}>{patient.name}</Text>
              <TouchableOpacity onPress={handleClear} style={styles.changeBtn} activeOpacity={0.7}>
                <Text style={styles.changeBtnText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.pickerField}
              onPress={function () { setShowPatientSheet(true); }}
              activeOpacity={0.8}
            >
              <Ionicons name="person-outline" size={18} color={colors.placeholder} style={{ marginRight: 10 }} />
              <Text style={styles.pickerFieldPlaceholder}>Choose a patient</Text>
              <Ionicons name="chevron-down" size={16} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Date ────────────────────────────────────────────────── */}
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Date</Text>
          <TouchableOpacity
            style={[styles.pickerField, date && styles.pickerFieldFilled]}
            onPress={function () { setShowCalendar(true); }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={date ? colors.primary : colors.placeholder}
              style={{ marginRight: 10 }}
            />
            <Text style={[styles.pickerFieldText, !date && styles.pickerFieldPlaceholder]}>
              {date ? formatDateLabel(date) : 'Select date'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* ── Time ────────────────────────────────────────────────── */}
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Time</Text>
          {date ? (
            <TimePillPicker value={time} onChange={setTime} baseDate={date} />
          ) : (
            <Text style={styles.timeHint}>Select a date first</Text>
          )}
          {time ? (
            <Text style={styles.timeSummary}>Selected: {formatTimeLabel(time)}</Text>
          ) : null}
        </View>

        {/* ── Meeting type ────────────────────────────────────────── */}
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Meeting type</Text>
          <View style={styles.meetingRow}>
            {MEETING_TYPES.map(function (opt) {
              var active = meetingType === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.meetingPill, active && styles.meetingPillActive]}
                  onPress={function () { setMeetingType(opt.value); }}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={opt.value === 'video' ? 'videocam-outline' : 'person-outline'}
                    size={16}
                    color={active ? colors.white : colors.primary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.meetingPillText, active && styles.meetingPillTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Notes ───────────────────────────────────────────────── */}
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Notes <Text style={styles.fieldOptional}>(optional)</Text></Text>
          <TextInput
            style={styles.notes}
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional notes for the patient..."
            placeholderTextColor={colors.placeholder}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.notesCounter}>{notes.length}/500</Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={15} color="#C53030" />
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={{ height: 24 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={function () { navigation.goBack(); }}
          activeOpacity={0.75}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sendBtn, (!canSubmit || submitting) && styles.sendBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
          activeOpacity={canSubmit && !submitting ? 0.85 : 1}
        >
          <Text style={styles.sendBtnText}>
            {submitting ? 'Sending...' : 'Send proposal'}
          </Text>
        </TouchableOpacity>
      </View>

      <PatientPickerSheet
        isOpen={showPatientSheet}
        onClose={function () { setShowPatientSheet(false); }}
        onSelect={function (p) {
          setPatient(p);
          setShowPatientSheet(false);
        }}
      />

      <CalendarPicker
        visible={showCalendar}
        selectedDate={date}
        onSelect={function (d) {
          setDate(d);
          // Reset time when date changes — the H:M was anchored to the
          // previous baseDate, so the user must re-confirm for the new day.
          setTime(null);
        }}
        onClose={function () { setShowCalendar(false); }}
      />

    </SafeAreaView>
  );
}

var styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.cardBorder,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
  },
  title: {
    fontFamily: fontFamilies.instrumentSerif,
    fontSize: fonts.xl,
    color: colors.textDark,
  },

  scroll: {
    paddingHorizontal: 18, paddingTop: 20,
  },

  fieldBlock: { marginBottom: 24 },
  fieldLabel: {
    fontSize: fonts.sm, fontWeight: fonts.semibold,
    color: colors.textDark, marginBottom: 6,
  },
  fieldOptional: {
    fontWeight: fonts.regular, color: colors.textLight,
  },

  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.inputBorder,
    paddingHorizontal: 14, height: 50,
  },
  pickerFieldFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  pickerFieldText: {
    flex: 1, fontSize: fonts.md, color: colors.textDark,
  },
  pickerFieldPlaceholder: {
    flex: 1, fontSize: fonts.md, color: colors.placeholder,
  },

  patientPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 8,
    gap: 10,
  },
  patientAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  patientAvatarEmoji: { fontSize: 16 },
  patientName: {
    flex: 1,
    fontSize: fonts.md, color: colors.textDark, fontWeight: fonts.semibold,
  },
  changeBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999,
  },
  changeBtnText: {
    fontSize: fonts.xs, color: colors.primary, fontWeight: fonts.semibold,
  },

  timeHint: {
    fontSize: fonts.sm, color: colors.textLight,
    paddingVertical: 8,
  },
  timeSummary: {
    marginTop: 10,
    fontSize: fonts.sm, color: colors.textMedium, fontWeight: fonts.medium,
  },

  meetingRow: {
    flexDirection: 'row', gap: 10,
  },
  meetingPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, height: 44,
    borderRadius: 25,
    borderWidth: 1.5, borderColor: colors.cardBorder,
    backgroundColor: colors.white,
  },
  meetingPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  meetingPillText: {
    fontSize: fonts.sm, fontWeight: fonts.semibold, color: colors.primary,
  },
  meetingPillTextActive: {
    color: colors.white,
  },

  notes: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.inputBorder,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12,
    minHeight: 96,
    fontSize: fonts.md, color: colors.textDark,
  },
  notesCounter: {
    alignSelf: 'flex-end',
    marginTop: 4,
    fontSize: fonts.xs, color: colors.textLight,
  },

  errorBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 4,
  },
  errorBannerText: {
    flex: 1,
    fontSize: fonts.sm, color: '#C53030', lineHeight: 18,
  },

  bottomBar: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 18, paddingTop: 12, paddingBottom: 24,
    backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.cardBorder,
  },
  cancelBtn: {
    flex: 1, height: 50, borderRadius: 25,
    borderWidth: 1.5, borderColor: colors.cardBorder,
    justifyContent: 'center', alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: fonts.md, fontWeight: fonts.semibold, color: colors.textMedium,
  },
  sendBtn: {
    flex: 2, height: 50, borderRadius: 25,
    backgroundColor: colors.primary,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#A0AEC0' },
  sendBtnText: {
    fontSize: fonts.md, fontWeight: fonts.semibold, color: colors.white,
  },
});
