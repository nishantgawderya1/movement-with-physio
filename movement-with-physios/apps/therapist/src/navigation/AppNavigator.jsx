import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthNavigator from './AuthNavigator';

// TODO: Backend developer — after auth is ready, import MainNavigator
// and swap AuthNavigator for MainNavigator based on auth state.
const AppNavigator = () => (
  <NavigationContainer>
    <AuthNavigator />
  </NavigationContainer>
);

export default AppNavigator;
