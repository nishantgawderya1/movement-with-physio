import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';

/**
 * Primary CTA button — teal fill, white label.
 *
 * @param {{ label: string, onPress: () => void, disabled?: boolean, style?: object }} props
 */
export default function PrimaryButton({ label, onPress, disabled = false, style }) {
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
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  btnDisabled: {
    backgroundColor: colors.primaryLight,
    opacity: 0.7,
  },
  label: {
    fontFamily: fonts.body.semibold,
    color: colors.textOnPrimary,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
