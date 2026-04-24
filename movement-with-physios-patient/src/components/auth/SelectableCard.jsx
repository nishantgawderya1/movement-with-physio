import React from 'react';
import { View, Text, Pressable, Dimensions, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';

const COLUMNS = 3;
const HORIZONTAL_PADDING = 24;
const COLUMN_GAP = 10;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH =
  (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - COLUMN_GAP * (COLUMNS - 1)) / COLUMNS;

/**
 * A 3-column grid card used for multi-select choices (e.g. pain location).
 *
 * @param {{ label: string, isSelected: boolean, onPress: () => void, iconName: string }} props
 */
export default function SelectableCard({ label, isSelected, onPress, iconName }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, isSelected ? styles.cardSelected : styles.cardDefault]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isSelected }}
    >
      <Ionicons
        name={iconName}
        size={28}
        color={isSelected ? colors.primary : colors.textMedium}
        style={styles.icon}
      />
      <Text style={[styles.label, isSelected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    minHeight: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: COLUMN_GAP,
  },
  cardDefault: {
    backgroundColor: colors.white,
    borderColor: colors.cardBorder,
  },
  cardSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  icon: {
    marginBottom: 8,
  },
  label: {
    fontSize: fonts.sm,
    color: colors.textDark,
    textAlign: 'center',
  },
  labelSelected: {
    color: colors.primary,
    fontWeight: fonts.semibold,
  },
});
