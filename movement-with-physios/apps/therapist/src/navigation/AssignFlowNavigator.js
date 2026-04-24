// src/navigation/AssignFlowNavigator.js
// Stack navigator for the 3-step Assign Exercises flow.
// Nested inside AuthNavigator as "AssignFlow".

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SelectClientScreen   from '../screens/AssignFlow/SelectClientScreen';
import SetScheduleScreen    from '../screens/AssignFlow/SetScheduleScreen';
import ReviewAssignmentScreen from '../screens/AssignFlow/ReviewAssignmentScreen';
import { ROUTES } from '../constants/routes';

const Stack = createNativeStackNavigator();

const AssignFlowNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', freezeOnBlur: true }}>
    <Stack.Screen name={ROUTES.SELECT_CLIENT}    component={SelectClientScreen}    />
    <Stack.Screen name={ROUTES.SET_SCHEDULE}     component={SetScheduleScreen}     />
    <Stack.Screen name={ROUTES.REVIEW_ASSIGNMENT} component={ReviewAssignmentScreen} />
  </Stack.Navigator>
);

export default AssignFlowNavigator;
