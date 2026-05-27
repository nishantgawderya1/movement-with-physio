// src/components/proposals/ProposalDetailSheet.jsx
// Bottom-sheet detail view for an outgoing proposal. Mirrors the
// PatientPickerSheet (P3.4) Modal pattern.
//
// Pending status: shows "Cancel proposal" destructive button + Close.
// Declined status: read-only with sanitized declineReason + Close.
//
// Cancel happens inside the sheet (locked decision — defensive against
// accidental row taps deleting a pending proposal). The sheet IS the
// confirmation surface; no extra Alert prompt.

import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts, fontFamilies } from '../../constants/fonts';
import { cancelProposal } from '../../services/proposalService';

function patientName(p) {
  if (p && p.patientId && typeof p.patientId === 'object') {
    return p.patientId.name || 'Patient';
  }
  return 'Patient';
}

function formatFullSlot(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  var date = d.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
  var h = d.getHours();
  var m = d.getMinutes();
  var ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if (h === 0) h = 12;
  return date + ' at ' + h + ':' + (m < 10 ? '0' + m : m) + ' ' + ampm;
}

function friendlyCancelError(rawError) {
  if (!rawError) return 'Could not cancel. Please try again.';
  var s = String(rawError).toUpperCase();
  if (s.indexOf('PROPOSAL_ALREADY_RESPONDED') >= 0) {
    return 'The patient has already responded — this proposal can no longer be cancelled.';
  }
  if (s.indexOf('PROPOSAL_NOT_FOUND') >= 0) {
    return 'Proposal not found.';
  }
  return rawError;
}

/**
 * @param {{
 *   isOpen: boolean,
 *   proposal: object | null,
 *   onClose: () => void,
 *   onCancelled: () => void
 * }} props
 */
export default function ProposalDetailSheet(props) {
  var [submitting, setSubmitting] = useState(false);
  var [errorMessage, setErrorMessage] = useState('');

  // Reset error + submitting whenever the sheet closes — guards against
  // stale state appearing on next open.
  React.useEffect(function () {
    if (!props.isOpen) {
      setSubmitting(false);
      setErrorMessage('');
    }
  }, [props.isOpen]);

  if (!props.isOpen || !props.proposal) {
    return (
      <Modal
        visible={false}
        transparent
        animationType="slide"
        onRequestClose={props.onClose}
      ><View /></Modal>
    );
  }

  var p = props.proposal;
  var name = patientName(p);
  var isPending = p.status === 'pending';
  var isVideo = p.meetingType === 'video';

  function handleCancel() {
    if (submitting) return;
    setSubmitting(true);
    setErrorMessage('');
    cancelProposal(String(p._id)).then(function (resp) {
      setSubmitting(false);
      if (resp.success) {
        if (props.onCancelled) props.onCancelled();
      } else {
        setErrorMessage(friendlyCancelError(resp.error));
      }
    });
  }

  return (
    <Modal
      visible={!!props.isOpen}
      transparent
      animationType="slide"
      onRequestClose={props.onClose}
    >
      <Pressable style={styles.backdrop} onPress={props.onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>{name}</Text>

        <ScrollView
          style={styles.body}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          <View style={styles.fieldRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textMedium} />
            <Text style={styles.fieldText}>{formatFullSlot(p.slotStart)}</Text>
          </View>

          <View style={styles.fieldRow}>
            <Ionicons
              name={isVideo ? 'videocam-outline' : 'person-outline'}
              size={16}
              color={colors.textMedium}
            />
            <Text style={styles.fieldText}>{isVideo ? 'Video' : 'In-person'}</Text>
          </View>

          <View style={styles.fieldRow}>
            <Ionicons name="time-outline" size={16} color={colors.textMedium} />
            <Text style={styles.fieldText}>
              {(p.durationMinutes || 60) + ' minutes'}
            </Text>
          </View>

          {p.notes ? (
            <View style={styles.notesBlock}>
              <Text style={styles.notesLabel}>Notes</Text>
              {/* Text auto-escapes; no Linking auto-detect; selectable left
                  off — defense against rendering attacker-influenced URLs
                  or copy-paste attacks. */}
              <Text style={styles.notesText} selectable={false}>{p.notes}</Text>
            </View>
          ) : null}

          <View style={styles.statusBlock}>
            <Text style={styles.statusLabel}>Status</Text>
            <View style={[
              styles.statusPill,
              isPending ? styles.statusPillPending : styles.statusPillDeclined,
            ]}>
              <Text style={[
                styles.statusPillText,
                isPending ? styles.statusPillTextPending : styles.statusPillTextDeclined,
              ]}>
                {isPending ? 'Pending' : 'Declined'}
              </Text>
            </View>
          </View>

          {!isPending && p.declineReason ? (
            <View style={styles.notesBlock}>
              <Text style={styles.notesLabel}>Patient's reason</Text>
              <Text style={styles.notesText} selectable={false}>{p.declineReason}</Text>
            </View>
          ) : null}

          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={15} color="#C53030" />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          {isPending ? (
            <>
              <TouchableOpacity
                style={[styles.btn, styles.btnDanger, submitting && styles.btnDisabled]}
                onPress={handleCancel}
                disabled={submitting}
                activeOpacity={0.85}
              >
                <Text style={styles.btnDangerText}>
                  {submitting ? 'Cancelling...' : 'Cancel proposal'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnNeutral]}
                onPress={props.onClose}
                disabled={submitting}
                activeOpacity={0.85}
              >
                <Text style={styles.btnNeutralText}>Close</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.btn, styles.btnNeutral, { flex: 1 }]}
              onPress={props.onClose}
              activeOpacity={0.85}
            >
              <Text style={styles.btnNeutralText}>Close</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

var styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 8,
    paddingHorizontal: 18,
    paddingBottom: 24,
    maxHeight: '85%',
  },
  handle: {
    alignSelf: 'center', width: 40, height: 4,
    borderRadius: 2, backgroundColor: colors.cardBorder, marginBottom: 12,
  },
  title: {
    fontFamily: fontFamilies.instrumentSerif,
    fontSize: fonts.lg, color: colors.textDark, marginBottom: 14,
  },
  body: {
    maxHeight: 400,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  fieldText: {
    fontSize: fonts.md, color: colors.textDark,
  },

  notesBlock: {
    marginTop: 14,
  },
  notesLabel: {
    fontSize: fonts.xs, fontWeight: fonts.semibold,
    color: colors.textMedium, marginBottom: 4, textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  notesText: {
    fontSize: fonts.sm, color: colors.textDark, lineHeight: 20,
  },

  statusBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  statusLabel: {
    fontSize: fonts.xs, fontWeight: fonts.semibold,
    color: colors.textMedium, textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statusPill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  statusPillPending:  { backgroundColor: '#FEF3C7' },
  statusPillDeclined: { backgroundColor: '#FEE2E2' },
  statusPillText: { fontSize: fonts.xs, fontWeight: fonts.semibold },
  statusPillTextPending:  { color: '#92400E' },
  statusPillTextDeclined: { color: colors.error },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    marginTop: 14,
  },
  errorBannerText: {
    flex: 1, fontSize: fonts.sm, color: '#C53030', lineHeight: 18,
  },

  footer: {
    flexDirection: 'row', gap: 10,
    paddingTop: 14,
    borderTopWidth: 1, borderTopColor: colors.cardBorder,
  },
  btn: {
    flex: 1, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
  },
  btnDanger: { backgroundColor: '#FEE2E2' },
  btnDangerText: {
    color: colors.error, fontSize: fonts.md, fontWeight: fonts.semibold,
  },
  btnNeutral: {
    borderWidth: 1.5, borderColor: colors.cardBorder,
    backgroundColor: colors.white,
  },
  btnNeutralText: {
    color: colors.textMedium, fontSize: fonts.md, fontWeight: fonts.semibold,
  },
  btnDisabled: { opacity: 0.6 },
});
