// src/components/BottomTabBar.jsx
// Shared bottom tab bar used by Dashboard and inner screens.

import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

export const TABS = [
  { id: 'home',     icon: 'home',            label: 'Home'      },
  { id: 'clients',  icon: 'people',          label: 'Clients'   },
  { id: 'messages', icon: 'chatbubble',      label: 'Messages'  },
  { id: 'calendar', icon: 'calendar',        label: 'Calendar'  },
  { id: 'exercise', icon: 'barbell-outline', label: 'Exercises' },
];

const BottomTabBar = ({ activeTab, onTabPress }) => (
  <View style={styles.tabBar}>
    {TABS.map((tab) => {
      const isActive = activeTab === tab.id;
      const iconName = isActive
        ? tab.icon
        : tab.icon.endsWith('-outline')
          ? tab.icon
          : tab.icon + '-outline';
      return (
        <TouchableOpacity
          key={tab.id}
          style={styles.tabItem}
          onPress={() => onTabPress(tab.id)}
          activeOpacity={0.7}
        >
          <Ionicons name={iconName} size={22} color={isActive ? colors.primary : colors.textLight} />
          {isActive && <View style={styles.tabActiveDot} />}
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  tabItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 4, gap: 4,
  },
  tabActiveDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 2,
  },
});

export default BottomTabBar;
