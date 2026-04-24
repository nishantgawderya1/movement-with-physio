import React, { useRef, useEffect } from 'react';
import {
  Animated,
  Pressable,
  View,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../../constants/colors';

/**
 * Elevated center tab button for the Chat tab.
 *
 * Renders a 58px teal circle elevated above the tab bar baseline via
 * negative marginTop. Applies a scale animation on press.
 *
 * @param {{ onPress: Function, isActive: boolean, unreadCount: number }} props
 */
export default function CenterTabButton({ onPress, isActive, unreadCount }) {
  var scale = useRef(new Animated.Value(1)).current;
  var bgColor = useRef(new Animated.Value(0)).current;

  useEffect(function () {
    Animated.timing(bgColor, {
      toValue: isActive ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isActive]);

  var animatedBg = bgColor.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.primary, colors.primaryDark],
  });

  function handlePressIn() {
    Animated.spring(scale, {
      toValue: 0.92,
      useNativeDriver: true,
      stiffness: 400,
      damping: 20,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(scale, {
      toValue: isActive ? 1.05 : 1,
      useNativeDriver: true,
      stiffness: 400,
      damping: 20,
    }).start();
  }

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, {
        toValue: isActive ? 1.05 : 1,
        useNativeDriver: true,
        stiffness: 300,
        damping: 15,
      }),
    ]).start();
    onPress();
  }

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel="Chat tab"
        style={styles.pressable}
      >
        {/*
          Two nested Animated.Views — each owns exactly one driver type:
            Outer: backgroundColor via JS driver (useNativeDriver: false)
            Inner: transform:scale via native driver (useNativeDriver: true)
          Mixing both props on a single Animated.View node triggers the
          "moved to native" crash; splitting them avoids it entirely.
        */}
        <Animated.View
          style={[styles.circle, { backgroundColor: animatedBg }]}
        >
          <Animated.View
            style={[styles.circleInner, { transform: [{ scale: scale }] }]}
          >
            <Ionicons name="chatbubble-ellipses" size={24} color="#FFFFFF" />
          </Animated.View>
        </Animated.View>
      </Pressable>
      {unreadCount > 0 && (
        <View style={styles.badge}>
          {/* badge dot — shows on the elevated button wrapper */}
        </View>
      )}
    </View>
  );
}

var styles = StyleSheet.create({
  wrapper: {
    // Elevate the circle above the tab bar baseline
    marginTop: -26,
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: 58,
    height: 58 + 26,
  },
  pressable: {
    width: 58,
    height: 58,
  },
  circle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    // Platform elevation
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  // Inner layer — owns the scale transform (native driver)
  // Must exactly fill the outer circle so scaling looks centered
  circleInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
});
