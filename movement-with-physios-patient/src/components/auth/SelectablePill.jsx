import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';

/**
 * A pill-shaped selectable chip used for single or multi-select choices.
 *
 * @param {{ label: string, isSelected: boolean, onPress: () => void }} props
 */
export default function SelectablePill({ label, isSelected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pill, isSelected ? styles.pillSelected : styles.pillDefault]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isSelected }}
    >
      <Text style={[styles.label, isSelected ? styles.labelSelected : styles.labelDefault]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillDefault: {
    backgroundColor: colors.white,
    borderColor: colors.cardBorder,
  },
  pillSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  label: {
    fontSize: fonts.sm,
    fontWeight: fonts.medium,
  },
  labelDefault: {
    color: colors.textMedium,
  },
  labelSelected: {
    color: colors.primary,
    fontWeight: fonts.semibold,
  },
});
