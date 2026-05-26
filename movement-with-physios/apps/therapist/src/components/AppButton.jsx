import React from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator, StyleSheet,
} from 'react-native';
import { colors } from '../constants/colors';
import { fonts, fontFamilies } from '../constants/fonts';

/**
 * AppButton — reusable CTA button
 * Props:
 *   title, onPress, loading (bool), variant ('primary' | 'outline' | 'pill')
 */
const AppButton = ({
  title,
  onPress,
  loading = false,
  variant = 'primary',
}) => {
  const variantStyle =
    variant === 'outline'
      ? styles.outline
      : variant === 'pill'
      ? styles.pill
      : styles.primary;

  return (
    <TouchableOpacity
      style={[styles.base, variantStyle, loading && styles.disabled]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} size="small" />
      ) : (
        <Text
          style={[
            styles.label,
            variant === 'outline' && styles.outlineLabel,
            variant === 'pill' && styles.pillLabel,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 6,
  },
  primary: { backgroundColor: colors.primary },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  disabled: { opacity: 0.65 },
  label: {
    color: colors.white,
    fontSize: fonts.md,
    fontWeight: fonts.bold,
    letterSpacing: 0.4,
  },
  outlineLabel: { color: colors.primary },
  pill: {
    height: 54,
    borderRadius: 30,
    backgroundColor: colors.primary,
  },
  pillLabel: {
    fontFamily: fontFamilies.dmSans.bold,
    fontSize: 16,
    letterSpacing: 0.3,
    color: colors.white,
  },
});

export default AppButton;
