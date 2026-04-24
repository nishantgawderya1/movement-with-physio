import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';

/**
 * Placeholder for the Book Appointment tab screen.
 */
export default function BookScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.label}>Book</Text>
      </View>
    </SafeAreaView>
  );
}

var styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.darkBg,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontFamily: fonts.heading.regular,
    fontSize: fonts.xxl,
    lineHeight: fonts.xxl * 1.35,
    color: colors.textWhite,
  },
});
