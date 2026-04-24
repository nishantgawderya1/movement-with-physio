import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
} from 'react-native';
import { colors } from '../../constants/colors';

/**
 * Three-dot animated typing indicator bubble.
 * Dots animate in a staggered wave pattern using pure RN Animated.
 *
 * @param {{ visible: boolean }} props
 */
export default function TypingIndicator({ visible }) {
  var dot1 = useRef(new Animated.Value(0)).current;
  var dot2 = useRef(new Animated.Value(0)).current;
  var dot3 = useRef(new Animated.Value(0)).current;
  var containerOpacity = useRef(new Animated.Value(0)).current;
  var animationRef = useRef(null);

  useEffect(function () {
    if (visible) {
      // Fade in container
      Animated.timing(containerOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();

      // Bounce each dot in a staggered wave
      function wave() {
        animationRef.current = Animated.loop(
          Animated.stagger(160, [
            Animated.sequence([
              Animated.timing(dot1, { toValue: -6, duration: 280, useNativeDriver: false }),
              Animated.timing(dot1, { toValue: 0, duration: 280, useNativeDriver: false }),
            ]),
            Animated.sequence([
              Animated.timing(dot2, { toValue: -6, duration: 280, useNativeDriver: false }),
              Animated.timing(dot2, { toValue: 0, duration: 280, useNativeDriver: false }),
            ]),
            Animated.sequence([
              Animated.timing(dot3, { toValue: -6, duration: 280, useNativeDriver: false }),
              Animated.timing(dot3, { toValue: 0, duration: 280, useNativeDriver: false }),
            ]),
          ])
        );
        animationRef.current.start();
      }

      wave();
    } else {
      // Fade out
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }).start();
      if (animationRef.current) {
        animationRef.current.stop();
      }
      // Safe to call setValue() because we are using JS driver (useNativeDriver: false)
      dot1.setValue(0);
      dot2.setValue(0);
      dot3.setValue(0);
    }

    return function () {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      <View style={styles.bubble}>
        {[dot1, dot2, dot3].map(function (dotAnim, i) {
          return (
            <Animated.View
              key={i}
              style={[styles.dot, { transform: [{ translateY: dotAnim }] }]}
            />
          );
        })}
      </View>
    </Animated.View>
  );
}

var styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.textLight,
  },
});
