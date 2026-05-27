// src/components/proposals/ProposalRow.jsx
// Renders ONE outgoing proposal (therapist's view of a proposal they sent).
// Mirrors BookingRow's visual rhythm (avatar + name + slot meta + right
// pill) but emits a tap-to-open-detail-sheet rather than navigation.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';

function getInitials(name) {
  if (!name || !String(name).trim()) return '?';
  var parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function formatSlot(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  var h = d.getHours();
  var m = d.getMinutes();
  var ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if (h === 0) h = 12;
  var date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return date + ' · ' + h + ':' + (m < 10 ? '0' + m : m) + ' ' + ampm;
}

// "5m ago" / "2h ago" / "3d ago" — short relative time.
function relativeAgo(iso) {
  if (!iso) return '';
  var diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return 'just now';
  var s = Math.floor(diff / 1000);
  if (s < 60) return s + 's ago';
  var m = Math.floor(s / 60);
  if (m < 60) return m + 'm ago';
  var h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  var d = Math.floor(h / 24);
  return d + 'd ago';
}

function patientName(p) {
  if (p && p.patientId && typeof p.patientId === 'object') {
    return p.patientId.name || 'Patient';
  }
  return 'Patient';
}

/**
 * @param {{ proposal: object, onPress: (proposal: object) => void }} props
 */
export default function ProposalRow(props) {
  var p = props.proposal || {};
  var name = patientName(p);
  var isPending = p.status === 'pending';
  var isVideo = p.meetingType === 'video';

  var pillBg = isPending ? '#FEF3C7' : '#FEE2E2';
  var pillFg = isPending ? '#92400E' : colors.error;
  var pillLabel = isPending ? 'Pending' : 'Declined';

  var subtitleIso = isPending ? p.createdAt : p.respondedAt;
  var subtitlePrefix = isPending ? 'Sent ' : 'Declined ';
  var subtitle = subtitleIso ? (subtitlePrefix + relativeAgo(subtitleIso)) : '';

  return (
    <Pressable
      style={styles.row}
      onPress={function () { if (props.onPress) props.onPress(p); }}
      accessibilityRole="button"
      accessibilityLabel={'Proposal to ' + name + ', ' + pillLabel}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(name)}</Text>
      </View>
      <View style={styles.mid}>
        <Text style={styles.name}>{name}</Text>
        <View style={styles.metaRow}>
          <Ionicons
            name={isVideo ? 'videocam-outline' : 'person-outline'}
            size={12}
            color={colors.textLight}
          />
          <Text style={styles.metaText}>{formatSlot(p.slotStart)}</Text>
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.right}>
        <View style={[styles.pill, { backgroundColor: pillBg }]}>
          <Text style={[styles.pillText, { color: pillFg }]}>{pillLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
}

var styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12, paddingHorizontal: 12,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: fonts.sm, color: colors.primary, fontWeight: fonts.bold },
  mid: { flex: 1, gap: 2 },
  name: { fontSize: fonts.md, color: colors.textDark, fontWeight: fonts.semibold },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: fonts.xs, color: colors.textMedium },
  subtitle: { fontSize: fonts.xs, color: colors.textLight, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  pill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  pillText: {
    fontSize: fonts.xs, fontWeight: fonts.semibold,
  },
});
