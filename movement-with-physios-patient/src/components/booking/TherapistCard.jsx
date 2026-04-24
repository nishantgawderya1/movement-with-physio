import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';

/**
 * Renders a single star icon based on position vs. rating.
 * @param {{ index: number, rating: number }} props
 */
function Star({ index, rating }) {
  var full = Math.floor(rating);
  var hasHalf = rating - full >= 0.5;
  var iconName;
  if (index < full) {
    iconName = 'star';
  } else if (index === full && hasHalf) {
    iconName = 'star-half';
  } else {
    iconName = 'star-outline';
  }
  var iconColor = index < full ? colors.warning : colors.textLight;
  return <Ionicons name={iconName} size={12} color={iconColor} />;
}

/**
 * Pressable therapist card for the booking list.
 * Navigates to SlotSelectionScreen on press.
 *
 * @param {{ therapist: object, onPress: Function }} props
 */
export default function TherapistCard({ therapist, onPress }) {
  var isToday = therapist.slot.startsWith('Today');
  var chipBg = isToday ? colors.primaryLight : colors.chipTomorrowBg;
  var chipText = isToday ? colors.primary : colors.chipTomorrowText;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.topRow}>
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarInitials}>
            {therapist.name.split(' ').slice(1).map(function (w) { return w[0]; }).join('')}
          </Text>
        </View>

        {/* Name + spec block */}
        <View style={styles.nameBlock}>
          <Text style={styles.name}>{therapist.name}</Text>
          <Text style={styles.spec}>{therapist.spec} · {therapist.exp}</Text>

          {/* Stars + review count */}
          <View style={styles.ratingRow}>
            {Array.from({ length: 5 }, function (_, i) {
              return <Star key={i} index={i} rating={therapist.rating} />;
            })}
            <Text style={styles.ratingText}>{therapist.rating}</Text>
            <Text style={styles.reviewCount}>({therapist.reviews})</Text>
          </View>
        </View>

        {/* Availability chip */}
        <View style={[styles.availChip, { backgroundColor: chipBg }]}>
          <Text style={[styles.availChipText, { color: chipText }]}>{therapist.slot}</Text>
        </View>
      </View>

      {/* Language pills */}
      <View style={styles.langRow}>
        {therapist.langs.map(function (lang) {
          return (
            <View key={lang} style={styles.langPill}>
              <Text style={styles.langPillText}>{lang}</Text>
            </View>
          );
        })}
      </View>
    </Pressable>
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: fonts.md,
    fontWeight: fonts.bold,
    color: colors.primary,
  },
  nameBlock: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: fonts.md,
    fontWeight: fonts.bold,
    color: colors.textDark,
  },
  spec: {
    fontSize: fonts.sm,
    color: colors.textMedium,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  ratingText: {
    fontSize: fonts.sm,
    fontWeight: fonts.semibold,
    color: colors.textDark,
    marginLeft: 2,
  },
  reviewCount: {
    fontSize: fonts.xs,
    color: colors.textMedium,
  },
  availChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    maxWidth: 120,
  },
  availChipText: {
    fontSize: fonts.xs,
    fontWeight: fonts.semibold,
    textAlign: 'center',
  },
  langRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  langPill: {
    backgroundColor: colors.divider,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  langPillText: {
    fontSize: fonts.xs,
    color: colors.textMedium,
  },
});
