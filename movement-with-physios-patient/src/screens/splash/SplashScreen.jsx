import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { PATIENT_ROUTES } from '../../constants/routes';

/**
 * App splash screen — auto-navigates to Login after 2500ms.
 *
 * @param {{ navigation: object }} props
 */
export default function SplashScreen({ navigation }) {
  useEffect(function () {
    var timer = setTimeout(function () {
      navigation.replace(PATIENT_ROUTES.LOGIN);
    }, 2500);

    return function () {
      clearTimeout(timer);
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.tagline}>movement with</Text>
      <View style={styles.logoRow}>
        <Text style={styles.logoText}>PHYSI</Text>
        <Ionicons name="leaf" size={18} color={colors.primary} style={styles.leafIcon} />
        <Text style={styles.logoText}>OS</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagline: {
    fontSize: fonts.sm,
    color: colors.placeholder,
    letterSpacing: 2,
    marginBottom: 6,
    textTransform: 'lowercase',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: fonts.xxxl,
    fontWeight: fonts.bold,
    color: colors.primary,
  },
  leafIcon: {
    marginHorizontal: 2,
    marginTop: 2,
  },
});
