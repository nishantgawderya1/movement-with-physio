/**
 * BodyPartBadge — small rounded pill that shows the patient's primary body
 * part (e.g. "Knee", "Back"). Used in the bookings list, booking detail,
 * and the video-call top status bar.
 *
 * Source resolution order (caller decides which to pass):
 *   1. booking.assessmentId.bodyParts[0]   — preferred (snapshotted on the assessment)
 *   2. patient.painLocation                — fallback
 *   3. null                                — renders nothing (returns null)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';

/**
 * @param {object} props
 * @param {string|null} props.bodyPart - one of: leg|knee|back|neck|shoulder|ankle|general
 * @param {boolean} [props.compact=false] - smaller for list rows
 * @param {string} [props.iconColor]      - override icon color (defaults to colors.primary)
 */
export default function BodyPartBadge({ bodyPart, compact = false, iconColor }) {
  if (!bodyPart) return null;
  var label = bodyPart.charAt(0).toUpperCase() + bodyPart.slice(1);
  return (
    <View style={[styles.badge, compact && styles.badgeCompact]}>
      <Ionicons
        name="body-outline"
        size={compact ? 11 : 13}
        color={iconColor || colors.primary}
      />
      <Text style={[styles.text, compact && styles.textCompact]}>{label}</Text>
    </View>
  );
}

var styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.primaryLight,
    alignSelf: 'flex-start',
  },
  badgeCompact: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    fontSize: fonts.xs,
    color: colors.primary,
    fontWeight: fonts.semibold,
  },
  textCompact: { fontSize: 10 },
});
