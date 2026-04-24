import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';

/**
 * Outline-style secondary button — soft teal tint fill, teal border + label.
 *
 * @param {{ label: string, onPress: () => void, disabled?: boolean, style?: object }} props
 */
export default function OutlineButton({ label, onPress, disabled = false, style }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={[styles.btn, disabled && styles.btnDisabled, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

var styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: fonts.body.semibold,
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
