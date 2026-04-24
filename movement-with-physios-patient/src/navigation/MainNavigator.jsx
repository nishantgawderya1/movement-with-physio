import React, { useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { PATIENT_ROUTES } from '../constants/routes';

import HomeStack from './stacks/HomeStack';
import BookStack from './stacks/BookStack';
import MessagesStack from './stacks/MessagesStack';
import ProgressScreen from '../screens/main/ProgressScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import AnimatedTabBar from '../components/navigation/AnimatedTabBar';

const Tab = createBottomTabNavigator();

/**
 * Main app bottom tab navigator — 5 tabs.
 *
 * Tab order: Home (0) | Book (1) | Chat (2) | Progress (3) | Profile (4)
 *
 * The Chat tab (index 2, center) uses a custom elevated circle button
 * rendered by AnimatedTabBar via CenterTabButton.
 *
 * Uses AnimatedTabBar for:
 *  - Spring-animated teal pill indicator above the active icon
 *  - Light haptic feedback on every tab press
 *  - Safe-area-aware height (home indicator clearance)
 *  - Elevated center Chat button with unread badge
 *
 * lazy: false preloads all tabs for instant switching.
 * HOME tab uses HomeStack so SessionScreen can be pushed inside it.
 * MESSAGES tab uses MessagesStack so ChatRoomScreen slides inside it.
 */
/**
 * Returns true when the focused screen inside a tab's nested stack
 * is ChatRoomScreen — used to hide the tab bar so it does not
 * overlap the chat composer.
 *
 * @param {object} route  — route object passed from Tab.Screen screenOptions
 * @returns {boolean}
 */
function isTabBarHidden(route) {
  var focusedRoute = getFocusedRouteNameFromRoute(route);
  return focusedRoute === PATIENT_ROUTES.CHAT_ROOM;
}

export default function MainNavigator() {
  var fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(function () {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 300,
      delay: 50,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{ flex: 1, opacity: fadeIn }}>
      <Tab.Navigator
        tabBar={function (props) {
          // Detect if the focused route inside the Messages stack is ChatRoom.
          // When true, suppress the entire tab bar (including CenterTabButton)
          // so it cannot overlap the chat composer.
          var messagesRoute = props.state.routes.find(
            function (r) { return r.name === PATIENT_ROUTES.MESSAGES; }
          );
          if (messagesRoute && isTabBarHidden(messagesRoute)) {
            return null;
          }
          return <AnimatedTabBar {...props} />;
        }}
        screenOptions={{ headerShown: false, lazy: false }}
      >
        {/* Tab 0 — Home */}
        <Tab.Screen name={PATIENT_ROUTES.HOME} component={HomeStack} />

        {/* Tab 1 — Book */}
        <Tab.Screen name={PATIENT_ROUTES.BOOK_APPOINTMENT} component={BookStack} />

        {/* Tab 2 — Chat (center elevated button) */}
        <Tab.Screen name={PATIENT_ROUTES.MESSAGES} component={MessagesStack} />

        {/* Tab 3 — Progress */}
        <Tab.Screen name={PATIENT_ROUTES.PROGRESS} component={ProgressScreen} />

        {/* Tab 4 — Profile */}
        <Tab.Screen name={PATIENT_ROUTES.PROFILE} component={ProfileScreen} />
      </Tab.Navigator>
    </Animated.View>
  );
}
