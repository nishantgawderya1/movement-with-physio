import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';

/**
 * Clerk authentication screen placeholder.
 */
export default function ClerkAuthScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Clerk Auth</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  label: {
    fontSize: fonts.xl,
    color: colors.textDark,
  },
});
