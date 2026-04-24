// components/chat/TypingIndicator.jsx
// Animated 3-dot typing indicator bubble with avatar

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';

const DOT_SIZE = 7;
const DOT_COLOR = '#9CA3AF';
const ANIM_DURATION = 400;
const STAGGER = 150;

const Dot = ({ delay }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: -6,
          duration: ANIM_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: ANIM_DURATION,
          useNativeDriver: true,
        }),
        Animated.delay(STAGGER * 3),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[styles.dot, { transform: [{ translateY: anim }] }]}
    />
  );
};

const TypingIndicator = ({ avatarBg = '#FDE68A', avatarEmoji = '👩' }) => {
  return (
    <View style={styles.row}>
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
        <Animated.Text style={styles.avatarEmoji}>{avatarEmoji}</Animated.Text>
      </View>

      {/* Bubble */}
      <View style={styles.bubble}>
        <Dot delay={0} />
        <Dot delay={STAGGER} />
        <Dot delay={STAGGER * 2} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarEmoji: { fontSize: 16 },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: DOT_COLOR,
  },
});

export default TypingIndicator;
