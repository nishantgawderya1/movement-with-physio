import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { PATIENT_ROUTES } from '../../constants/routes';
import { chatService } from '../../services/chatService';
import CenterTabButton from '../chat/CenterTabButton';

var SCREEN_WIDTH = Dimensions.get('window').width;

/**
 * Index of the center Chat tab (index 2 in 5-tab layout).
 */
var CHAT_TAB_INDEX = 2;

/**
 * Icon name map for each tab route.
 */
var ICON_MAP = {
  [PATIENT_ROUTES.HOME]: { focused: 'home', unfocused: 'home-outline' },
  [PATIENT_ROUTES.BOOK_APPOINTMENT]: { focused: 'calendar', unfocused: 'calendar-outline' },
  [PATIENT_ROUTES.MESSAGES]: { focused: 'chatbubble-ellipses', unfocused: 'chatbubble-ellipses-outline' },
  [PATIENT_ROUTES.PROGRESS]: { focused: 'bar-chart', unfocused: 'bar-chart-outline' },
  [PATIENT_ROUTES.PROFILE]: { focused: 'person', unfocused: 'person-outline' },
};

/**
 * Label map for each tab route.
 */
var LABEL_MAP = {
  [PATIENT_ROUTES.HOME]: 'Home',
  [PATIENT_ROUTES.BOOK_APPOINTMENT]: 'Book',
  [PATIENT_ROUTES.MESSAGES]: 'Chat',
  [PATIENT_ROUTES.PROGRESS]: 'Progress',
  [PATIENT_ROUTES.PROFILE]: 'Profile',
};

/**
 * Custom animated tab bar supporting 5 tabs with an elevated center Chat button.
 *
 * Layout: Home | Book | [Chat bubble ↑] | Progress | Profile
 *
 * Features:
 *  - Teal pill indicator (32×3) spring-animates to the active tab
 *    (hidden when Chat tab is active — the button itself shows active state)
 *  - Elevated 58px center button via CenterTabButton
 *  - Unread badge count from chatService.getConversations()
 *  - Light haptic on every tab press
 *
 * @param {{ state, descriptors, navigation }} props  — provided by React Navigation
 */
export default function AnimatedTabBar({ state, descriptors, navigation }) {
  var insets = useSafeAreaInsets();
  var tabCount = state.routes.length;
  var tabWidth = SCREEN_WIDTH / tabCount;
  var [totalUnread, setTotalUnread] = useState(0);

  // Animated X position of the pill — starts at the active tab
  var pillX = useRef(new Animated.Value(state.index * tabWidth)).current;
  var pillOpacity = useRef(new Animated.Value(state.index === CHAT_TAB_INDEX ? 0 : 1)).current;

  // Animate pill on tab index change
  useEffect(function () {
    var isChatActive = state.index === CHAT_TAB_INDEX;
    Animated.parallel([
      Animated.spring(pillX, {
        toValue: state.index * tabWidth,
        stiffness: 300,
        damping: 30,
        useNativeDriver: true,
      }),
      Animated.timing(pillOpacity, {
        toValue: isChatActive ? 0 : 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [state.index, tabWidth]);

  // Poll total unread count for badge on center button
  useEffect(function () {
    function fetchUnread() {
      chatService.getConversations().then(function (result) {
        if (result.success) {
          var total = result.data.reduce(function (sum, c) { return sum + c.unreadCount; }, 0);
          setTotalUnread(total);
        }
      });
    }
    fetchUnread();
    var interval = setInterval(fetchUnread, 15000);
    return function () { clearInterval(interval); };
  }, []);

  var TAB_BAR_HEIGHT = 60 + insets.bottom;

  return (
    <View
      style={[
        styles.container,
        {
          height: TAB_BAR_HEIGHT,
          paddingBottom: insets.bottom + 4,
        },
      ]}
    >
      {/* Animated pill indicator — sits at the very top of the bar */}
      <Animated.View
        style={[
          styles.pill,
          {
            transform: [{ translateX: pillX }],
            marginLeft: (tabWidth - 32) / 2,
            opacity: pillOpacity,
          },
        ]}
      />

      {/* Tab items */}
      {state.routes.map(function (route, index) {
        var descriptor = descriptors[route.key];
        var isFocused = state.index === index;
        var isChatTab = index === CHAT_TAB_INDEX;
        var iconSet = ICON_MAP[route.name] || { focused: 'help', unfocused: 'help-outline' };
        var label = LABEL_MAP[route.name] || route.name;
        var tintColor = isFocused ? colors.primary : colors.textLight;

        function handlePress() {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          var event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate({ name: route.name, merge: true });
          }
        }

        function handleLongPress() {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        }

        // Center (Chat) tab — render elevated button instead of standard tab item
        if (isChatTab) {
          return (
            <View
              key={route.key}
              style={styles.centerTabSlot}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={descriptor.options.tabBarAccessibilityLabel || 'Chat'}
            >
              <CenterTabButton
                onPress={handlePress}
                isActive={isFocused}
                unreadCount={totalUnread}
              />
            </View>
          );
        }

        // Standard tab items
        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={descriptor.options.tabBarAccessibilityLabel}
            onPress={handlePress}
            onLongPress={handleLongPress}
            style={styles.tab}
          >
            <Ionicons
              name={isFocused ? iconSet.focused : iconSet.unfocused}
              size={22}
              color={tintColor}
            />
            <Text style={[styles.label, { color: tintColor }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

var styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 0,
    paddingTop: 8,
    alignItems: 'flex-end',
  },
  pill: {
    position: 'absolute',
    top: 0,
    width: 32,
    height: 3,
    borderRadius: 99,
    backgroundColor: colors.primary,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingBottom: 2,
  },
  centerTabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  label: {
    fontFamily: fonts.body.medium,
    fontSize: 11,
    marginBottom: 2,
  },
});
