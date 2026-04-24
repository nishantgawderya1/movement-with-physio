// src/screens/auth/ProfilePhotoScreen.jsx
// ─────────────────────────────────────────────────────────────────────────────
// FIGMA REFERENCE: Profile Photo Screen
// Part of therapist onboarding — comes after GovernmentIDVerificationScreen.
//
// Behaviour:
//   - Photo is OPTIONAL — "Skip for now" and "Continue" both work without upload
//   - Tapping the photo box OR "Upload Photo" button opens image picker
//   - Any image format accepted (JPG/PNG) — ≤ 8 MB
//   - Once picked, photo previews inside the box; button changes to "Change Photo"
//   - Continue → navigate to next screen
//   - Skip for now → navigate to same next screen, no photo saved
//
// Backend developer: replace handleContinue body only.
//   Upload photo.uri to storage, save returned URL via TherapistService.saveProfilePhoto()
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../constants/colors';
import { fonts, fontFamilies } from '../../constants/fonts';

const MAX_FILE_SIZE_MB    = 8;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const NEXT_SCREEN         = 'ScheduleVerificationCall'; // ← update when next screen is ready

const ProfilePhotoScreen = ({ navigation }) => {

  const [photo,     setPhoto]     = useState(null);  // { uri, fileName }
  const [uploading, setUploading] = useState(false);

  // ── Animations ─────────────────────────────────────────────────────────────
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Image picker ───────────────────────────────────────────────────────────
  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission required',
        'Please allow access to your photo library in Settings.',
        [{ text: 'OK' }]
      );
      return;
    }

    setUploading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],       // square crop — good for profile photos
        quality: 0.85,
      });

      if (result.canceled) return;

      const asset = result.assets[0];

      // Validate size
      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE_BYTES) {
        Alert.alert(
          'File too large',
          `Maximum allowed size is ${MAX_FILE_SIZE_MB} MB. Please choose a smaller image.`,
          [{ text: 'OK' }]
        );
        return;
      }

      setPhoto({ uri: asset.uri, fileName: asset.fileName || 'profile_photo.jpg' });
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleContinue = () => {
    if (photo) {
      console.log('[MOCK] Profile photo saved:', photo.uri);
      // TODO: await TherapistService.saveProfilePhoto({ uri: photo.uri });
    }
    navigation.navigate(NEXT_SCREEN);
  };

  const handleSkip = () => {
    console.log('[MOCK] Profile photo skipped.');
    navigation.navigate(NEXT_SCREEN);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Top Bar ───────────────────────────────────────────────── */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textDark} />
          </TouchableOpacity>
          <View style={styles.brandIcon}>
            <Ionicons name="pulse" size={16} color={colors.white} />
          </View>
        </View>

        {/* ── Animated content ──────────────────────────────────────── */}
        <Animated.View style={[
          styles.contentWrapper,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}>

          {/* Upload icon badge */}
          <View style={styles.badgeIconBox}>
            <Ionicons name="cloud-upload-outline" size={28} color={colors.primary} />
          </View>

          <Text style={styles.heading}>Profile Photo</Text>
          <Text style={styles.subtitle}>A professional photo helps build trust with clients</Text>

          {/* ── Photo Card ────────────────────────────────────────── */}
          <View style={styles.card}>

            {/* Photo box — tappable */}
            <TouchableOpacity
              style={styles.photoBox}
              onPress={pickPhoto}
              activeOpacity={0.8}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : photo ? (
                <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="arrow-up-circle-outline" size={40} color={colors.textLight} />
                  <Text style={styles.noPhotoText}>No photo</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Upload / Change button */}
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={pickPhoto}
              disabled={uploading}
              activeOpacity={0.75}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.uploadBtnText}>
                  {photo ? 'Change Photo' : 'Upload Photo'}
                </Text>
              )}
            </TouchableOpacity>

          </View>

          {/* ── Continue Button ──────────────────────────────────── */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleContinue}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Continue</Text>
          </TouchableOpacity>

          {/* ── Skip link ────────────────────────────────────────── */}
          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} activeOpacity={0.6}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Top bar
  topBar:    { flexDirection: 'row', alignItems: 'center', marginBottom: 36 },
  backBtn:   { padding: 4, marginRight: 12 },
  brandIcon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },

  contentWrapper: { flex: 1 },

  // Badge
  badgeIconBox: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 24,
  },

  // Headings
  heading: {
    fontFamily: fontFamilies.instrumentSerif,
    fontSize: fonts.xxl,
    fontWeight: fonts.bold,
    color: colors.textDark,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: fonts.sm,
    color: colors.textMedium,
    marginBottom: 28,
    lineHeight: 20,
  },

  // Card
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },

  // Photo box
  photoBox: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  photoPlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  noPhotoText: {
    fontSize: fonts.sm,
    color: colors.textLight,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  // Upload button (light teal pill inside card)
  uploadBtn: {
    width: '100%',
    height: 48,
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBtnText: {
    fontSize: fonts.md,
    fontWeight: fonts.semibold,
    color: colors.primary,
  },

  // Continue button
  primaryBtn: {
    width: '100%', height: 52,
    backgroundColor: colors.primary,
    borderRadius: 30,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: fonts.md,
    fontWeight: fonts.bold,
    letterSpacing: 0.3,
  },

  // Skip link
  skipBtn: { alignItems: 'center', paddingVertical: 4 },
  skipText: {
    fontSize: fonts.sm,
    color: colors.textLight,
  },
});

export default ProfilePhotoScreen;
