import React from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator, StyleSheet,
} from 'react-native';
import { colors } from '../constants/colors';
import { fonts } from '../constants/fonts';

/**
 * AppButton — reusable CTA button
 * Props:
 *   title, onPress, loading (bool), variant ('primary' | 'outline')
 */
const AppButton = ({
  title,
  onPress,
  loading = false,
  variant = 'primary',
}) => (
  <TouchableOpacity
    style={[
      styles.base,
      variant === 'outline' ? styles.outline : styles.primary,
      loading && styles.disabled,
    ]}
    onPress={onPress}
    disabled={loading}
    activeOpacity={0.8}
  >
    {loading ? (
      <ActivityIndicator color={colors.white} size="small" />
    ) : (
      <Text style={[styles.label, variant === 'outline' && styles.outlineLabel]}>
        {title}
      </Text>
    )}
  </TouchableOpacity>
);

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
});

export default AppButton;
