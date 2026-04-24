// src/screens/splash/SplashScreen.jsx
// ─────────────────────────────────────────────────────────────────────────────
// FIGMA REFERENCE: Screen 1 — Splash Screen
// Design: Pure white background, centered logo image, fade animation
// DO NOT add text — the logo image already contains all branding text
// DO NOT change navigation target — must stay navigation.replace('Login')
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Animated,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../constants/colors';
import { fontFamilies } from '../../constants/fonts';

const { width } = Dimensions.get('window');

// ─── DEV BYPASS ──────────────────────────────────────────────────────────────
// Set to true to skip auth and jump straight to Dashboard during development.
// Set back to false before committing / demoing to stakeholders.
const DEV_BYPASS = true;
// ─────────────────────────────────────────────────────────────────────────────

const SplashScreen = ({ navigation }) => {
  const logoOpacity    = useRef(new Animated.Value(0)).current;
  const logoScale      = useRef(new Animated.Value(0.92)).current;
  const spinnerOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // ── DEV BYPASS — skip auth, go straight to Dashboard ─────────────────────
    if (DEV_BYPASS) {
      navigation.replace('Dashboard');
      return;
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Step 1: Logo fades in with gentle scale
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Step 2: Spinner fades in subtly after logo appears
      Animated.timing(spinnerOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });

    // Step 3: After 2800ms, fade out entire screen then navigate
    const timer = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        navigation.replace('Login'); // DO NOT change this
      });
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>

      {/* ── Brand Logo Image ─────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        {/* Figma: "Doctor's App" — Instrument Serif italic, below logo */}
        <Text style={styles.doctorsAppText}>Doctor's App</Text>
      </Animated.View>

      {/* ── Loading Indicator ─────────────────────────────────────────── */}
      <Animated.View style={[styles.spinnerWrapper, { opacity: spinnerOpacity }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </Animated.View>

    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,        // Figma: pure white splash bg
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrapper: {
    width: width * 0.75,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '100%',
    height: undefined,
    aspectRatio: 1.6,
  },
  spinnerWrapper: {
    position: 'absolute',
    bottom: 72,
  },
  doctorsAppText: {
    fontFamily: fontFamilies.instrumentSerifItalic,
    fontSize: 16,
    color: '#4A5568',
    textAlign: 'center',
    marginTop: 10,
    letterSpacing: 0.3,
  },
});

export default SplashScreen;
