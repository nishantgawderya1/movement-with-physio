import React, { useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { useIsFocused, useNavigationState } from '@react-navigation/native';

/**
 * Direction-aware fade + slide animation for tab screens.
 *
 * Compares tabIndex against the previously active tab index to determine
 * which direction to slide in from:
 *   - Moving right (higher index) → slide in from right (+16px)
 *   - Moving left  (lower index)  → slide in from left  (-16px)
 *
 * @param {{ children: React.ReactNode, tabIndex: number }} props
 */
export default function TabScreenWrapper({ children, tabIndex }) {
  var isFocused = useIsFocused();
  var currentIndex = useNavigationState(function (state) { return state.index; });
  var prevIndex = useRef(currentIndex);

  var opacity = useRef(new Animated.Value(0)).current;
  var translateX = useRef(new Animated.Value(0)).current;

  useEffect(function () {
    if (isFocused) {
      // positive = came from left tab (slide in from right)
      // negative = came from right tab (slide in from left)
      var direction = tabIndex > prevIndex.current ? -1 : 1;
      prevIndex.current = tabIndex;

      translateX.setValue(16 * direction);
      opacity.setValue(0);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 210,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: 210,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isFocused]);

  return (
    <Animated.View style={{
      flex: 1,
      opacity: opacity,
      transform: [{ translateX: translateX }],
    }}>
      {children}
    </Animated.View>
  );
}
