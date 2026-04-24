import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TransitionPresets } from '@react-navigation/stack';
import { PATIENT_ROUTES } from '../../constants/routes';

import MessagesScreen from '../../screens/messages/MessagesScreen';
import ChatRoomScreen from '../../screens/messages/ChatRoomScreen';

const Stack = createStackNavigator();

/**
 * iOS-style spring transition spec (same as BookStack / HomeStack).
 */
const SPRING_TRANSITION = {
  animation: 'spring',
  config: {
    stiffness: 1000,
    damping: 500,
    mass: 3,
    overshootClamping: true,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
};

/**
 * Stack navigator for the Messages (Chat) tab.
 * Flow: MessagesScreen → ChatRoomScreen
 * ChatRoomScreen has a custom header built inside the screen.
 */
export default function MessagesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        ...TransitionPresets.SlideFromRightIOS,
        transitionSpec: {
          open: SPRING_TRANSITION,
          close: SPRING_TRANSITION,
        },
      }}
    >
      <Stack.Screen
        name={PATIENT_ROUTES.MESSAGES_SCREEN}
        component={MessagesScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name={PATIENT_ROUTES.CHAT_ROOM}
        component={ChatRoomScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
