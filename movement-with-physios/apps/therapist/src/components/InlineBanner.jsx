// src/components/InlineBanner.jsx
// Reusable success/error banner for the therapist app. Slides from the top
// via Animated.spring (useNativeDriver:true). Success auto-hides after
// autoHideMs (default 3000); error requires manual dismiss. Tap to dismiss
// either variant. Behavior ported 1:1 from the patient app's InlineBanner,
// themed for therapist.

import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { fontFamilies } from '../constants/fonts';

// Soft red banner pair — not present in colors.js, defined here per design spec.
const ERROR_BG = '#FED7D7';
const ERROR_TEXT = '#C53030';

/**
 * @param {{ visible: boolean, message: string, variant?: 'success'|'error', autoHideMs?: number, onDismiss?: () => void }} props
 */
export default function InlineBanner(props) {
  var visible = !!props.visible;
  var message = props.message || '';
  var variant = props.variant || 'success';
  var autoHideMs = props.autoHideMs != null ? props.autoHideMs : 3000;
  var onDismiss = props.onDismiss || function () {};

  var translateY = useRef(new Animated.Value(-80)).current;
  var opacity = useRef(new Animated.Value(0)).current;

  useEffect(function () {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 6,
          speed: 14,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide only for success variant
      if (variant === 'success' && autoHideMs > 0) {
        var t = setTimeout(function () { onDismiss(); }, autoHideMs);
        return function () { clearTimeout(t); };
      }
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -80,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, variant, autoHideMs]);

  if (!visible && opacity._value === 0) return null;

  var isError = variant === 'error';
  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.wrap,
        isError ? styles.wrapError : styles.wrapSuccess,
        { opacity: opacity, transform: [{ translateY: translateY }] },
      ]}
    >
      <Pressable style={styles.pressable} onPress={onDismiss}>
        <Ionicons
          name={isError ? 'alert-circle-outline' : 'checkmark-circle-outline'}
          size={18}
          color={isError ? ERROR_TEXT : colors.primary}
        />
        <Text style={[styles.text, isError ? styles.textError : styles.textSuccess]}>
          {message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

var styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingTop: 60, // clear iOS notch area; parent can override via style prop if needed
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 1000,
    elevation: 10,
  },
  wrapSuccess: { backgroundColor: colors.primaryLight },
  wrapError:   { backgroundColor: ERROR_BG },
  pressable: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  text: {
    flex: 1,
    fontFamily: fontFamilies.dmSans.semibold,
    fontSize: 14,
    lineHeight: 20,
  },
  textSuccess: { color: colors.primary },
  textError:   { color: ERROR_TEXT },
});
