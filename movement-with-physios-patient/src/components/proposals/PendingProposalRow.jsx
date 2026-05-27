// src/components/proposals/PendingProposalRow.jsx
// Renders a single pending proposal row on AppointmentsRootScreen.
// Therapist avatar (initials) + name + slot time + meeting-type icon +
// optional notes preview + Accept (PrimaryButton) / Decline (OutlineButton)
// row. Pure presentational — parent owns state.

import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import PrimaryButton from '../ui/PrimaryButton';
import OutlineButton from '../ui/OutlineButton';

function getInitials(name) {
  if (!name || !String(name).trim()) return '?';
  var parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function formatSlot(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  var date = d.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });
  var h = d.getHours();
  var m = d.getMinutes();
  var ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if (h === 0) h = 12;
  return date + ' · ' + h + ':' + (m < 10 ? '0' + m : m) + ' ' + ampm;
}

/**
 * @param {{
 *   proposal: {
 *     _id: string,
 *     slotStart: string,
 *     meetingType: 'video' | 'in_person',
 *     notes?: string,
 *     therapistId?: { _id?: string, name?: string }
 *   },
 *   onAccept: () => void,
 *   onDecline: () => void,
 *   accepting?: boolean,
 *   animatedStyle?: object
 * }} props
 */
export default function PendingProposalRow(props) {
  var p = props.proposal || {};
  var therapist = p.therapistId && typeof p.therapistId === 'object' ? p.therapistId : null;
  var name = (therapist && therapist.name) || 'Therapist';
  var isVideo = p.meetingType === 'video';
  var notes = p.notes && p.notes.trim() ? p.notes.trim() : null;

  return (
    <Animated.View style={[styles.card, props.animatedStyle]}>
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(name)}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>Dr. {name}</Text>
          <View style={styles.metaRow}>
            <Ionicons
              name={isVideo ? 'videocam-outline' : 'person-outline'}
              size={13}
              color={colors.textMedium}
            />
            <Text style={styles.slot}>{formatSlot(p.slotStart)}</Text>
          </View>
        </View>
      </View>

      {notes ? (
        <Text style={styles.notes} numberOfLines={1}>{notes}</Text>
      ) : null}

      <View style={styles.btnRow}>
        <View style={styles.btnSlot}>
          <OutlineButton
            label="Decline"
            onPress={props.onDecline}
            disabled={!!props.accepting}
          />
        </View>
        <View style={styles.btnSlot}>
          <PrimaryButton
            label={props.accepting ? 'Accepting...' : 'Accept'}
            onPress={props.onAccept}
            disabled={!!props.accepting}
          />
        </View>
      </View>
    </Animated.View>
  );
}

var styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.body.semibold,
    fontSize: fonts.sm,
    color: colors.primary,
  },
  info: { flex: 1 },
  name: {
    fontFamily: fonts.heading.regular,
    fontSize: fonts.md,
    color: colors.textDark,
    lineHeight: fonts.md * 1.35,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  slot: {
    fontFamily: fonts.body.regular,
    fontSize: fonts.xs,
    color: colors.textMedium,
  },
  notes: {
    fontFamily: fonts.body.regular,
    fontSize: fonts.sm,
    color: colors.textMedium,
    marginBottom: 12,
    lineHeight: 18,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnSlot: { flex: 1 },
});
