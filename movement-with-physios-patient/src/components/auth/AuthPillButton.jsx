import React from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';

/**
 * AuthPillButton — full-pill (radius 99) CTA used by the auth flow.
 * When loading, an ActivityIndicator replaces the label and the button
 * keeps its width. Inactive (loading or disabled) → opacity 0.6, no press.
 *
 * @param {{ label: string, onPress: () => void, loading?: boolean, disabled?: boolean, style?: object }} props
 */
export default function AuthPillButton(props) {
  var loading = !!props.loading;
  var disabled = !!props.disabled;
  var inactive = loading || disabled;

  return (
    <Pressable
      onPress={inactive ? undefined : props.onPress}
      disabled={inactive}
      style={[styles.btn, inactive && styles.inactive, props.style]}
      accessibilityRole="button"
      accessibilityLabel={props.label}
    >
      {loading ? (
        <ActivityIndicator color={colors.textOnPrimary} />
      ) : (
        <Text style={styles.label}>{props.label}</Text>
      )}
    </Pressable>
  );
}

var styles = StyleSheet.create({
  btn: {
    height: 54,
    borderRadius: 99,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  inactive: { opacity: 0.6 },
  label: {
    fontFamily: fonts.body.semibold,
    fontSize: 16,
    letterSpacing: 0.3,
    color: colors.textOnPrimary,
  },
});
