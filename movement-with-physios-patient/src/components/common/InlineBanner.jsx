// src/components/common/InlineBanner.jsx
// Reusable success/error banner. Slides from the top via Animated.spring
// (useNativeDriver:true). Success variant auto-hides after autoHideMs
// (default 3000); error variant requires manual dismiss. Tap to dismiss
// either variant.

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';

/**
 * @param {{ visible: boolean, message: string, variant?: 'success'|'error', autoHideMs?: number, onDismiss?: () => void }} props
 */
export default function InlineBanner(props) {
  var visible = !!props.visible;
  var message = props.message || '';
  var variant = props.variant || 'success';
  var autoHideMs = props.autoHideMs != null ? props.autoHideMs : 3000;
  var onDismiss = props.onDismiss || function () {};

  // Keeps the component mounted through its fade-out so the exit animation
  // is visible; flipped false only when the hide animation actually finishes.
  var [shouldRender, setShouldRender] = useState(visible);

  var translateY = useRef(new Animated.Value(-80)).current;
  var opacity = useRef(new Animated.Value(0)).current;

  useEffect(function () {
    if (visible) {
      setShouldRender(true);
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
      ]).start(function (result) {
        if (result && result.finished) setShouldRender(false);
      });
    }
  }, [visible, variant, autoHideMs]);

  if (!shouldRender) return null;

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
          color={isError ? '#C53030' : colors.textOnPrimary}
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
  wrapSuccess: { backgroundColor: colors.primary },
  wrapError:   { backgroundColor: '#FEE2E2' },
  pressable: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  text: {
    flex: 1,
    fontFamily: fonts.body.medium,
    fontSize: fonts.sm,
    lineHeight: 20,
  },
  textSuccess: { color: colors.textOnPrimary },
  textError:   { color: '#C53030' },
});
