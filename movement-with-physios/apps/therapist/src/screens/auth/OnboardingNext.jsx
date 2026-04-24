import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts, fontFamilies } from '../../constants/fonts';

const OnboardingNext = ({ navigation }) => (
  <SafeAreaView style={styles.safe}>
    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
      <Ionicons name="arrow-back" size={22} color={colors.textDark} />
    </TouchableOpacity>
    <View style={styles.center}>
      <View style={styles.iconBox}>
        <Ionicons name="layers-outline" size={32} color={colors.white} />
      </View>
      <Text style={styles.title}>Next Step — Therapist Registration</Text>
      <Text style={styles.subtitle}>This step is coming soon.</Text>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  backBtn: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  iconBox: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: fontFamilies.instrumentSerif,
    fontSize: fonts.xxl,
    color: colors.textDark,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: fonts.sm,
    color: colors.textLight,
    textAlign: 'center',
  },
});

export default OnboardingNext;
