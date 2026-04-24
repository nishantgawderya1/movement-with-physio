// src/screens/auth/GovernmentIDVerificationScreen.jsx
// ─────────────────────────────────────────────────────────────────────────────
// FIGMA REFERENCE: Government ID Verification Screen
// Part of therapist onboarding flow — comes after ProfessionalCredentialsScreen.
//
// Behaviour:
//   1. Screen loads → only ID Type selector visible
//   2. User picks an ID type → Front + Back upload rows slide in
//   3. Both images must be JPG and ≤ 5 MB each
//   4. Continue enabled only when idType + both images are ready
//
// Backend developer: replace handleContinue body only.
//   Upload frontImage.uri and backImage.uri to your storage bucket,
//   then save the returned URLs via TherapistService.saveGovID(payload).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  FlatList,
  Animated,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../constants/colors';
import { fonts, fontFamilies } from '../../constants/fonts';

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_FILE_SIZE_MB  = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const INDIA_ID_TYPES = [
  { label: 'Aadhaar Card',    value: 'aadhaar'   },
  { label: 'PAN Card',        value: 'pan'        },
  { label: 'Passport',        value: 'passport'   },
  { label: 'Driving License', value: 'dl'         },
  { label: 'Voter ID (EPIC)', value: 'voter_id'   },
];

// ── Component ─────────────────────────────────────────────────────────────────
const GovernmentIDVerificationScreen = ({ navigation }) => {

  // ── State ──────────────────────────────────────────────────────────────────
  const [idType,        setIdType]        = useState(null);   // { label, value }
  const [frontImage,    setFrontImage]    = useState(null);   // { uri, fileName }
  const [backImage,     setBackImage]     = useState(null);
  const [dropdownOpen,  setDropdownOpen]  = useState(false);
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack,  setUploadingBack]  = useState(false);
  const [errors,        setErrors]        = useState({});

  // ── Animations ─────────────────────────────────────────────────────────────
  const fadeAnim      = useRef(new Animated.Value(0)).current;
  const slideAnim     = useRef(new Animated.Value(24)).current;
  const uploadReveal  = useRef(new Animated.Value(0)).current;   // 0→1 when idType selected

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  // Reveal upload rows when idType is chosen
  useEffect(() => {
    if (idType) {
      Animated.timing(uploadReveal, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }).start();
    } else {
      uploadReveal.setValue(0);
    }
  }, [idType]);

  // ── Image Picker ───────────────────────────────────────────────────────────
  const pickImage = async (side) => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission required',
        'Please allow access to your photo library in Settings to upload your ID.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (side === 'front') setUploadingFront(true);
    else setUploadingBack(true);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
        // Expo does not enforce type on iOS — we validate below
      });

      if (result.canceled) return;

      const asset = result.assets[0];

      // ── Validate extension (JPG only) ────────────────────────────────────
      const uri = asset.uri;
      const ext = uri.split('.').pop()?.toLowerCase();
      if (ext !== 'jpg' && ext !== 'jpeg') {
        Alert.alert(
          'Invalid file type',
          'Please upload a JPG / JPEG image only.',
          [{ text: 'OK' }]
        );
        return;
      }

      // ── Validate file size (≤ 5 MB) ──────────────────────────────────────
      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE_BYTES) {
        Alert.alert(
          'File too large',
          `Maximum allowed size is ${MAX_FILE_SIZE_MB} MB. Please compress your image and try again.`,
          [{ text: 'OK' }]
        );
        return;
      }

      const imageData = { uri: asset.uri, fileName: asset.fileName || `${side}_id.jpg` };

      if (side === 'front') {
        setFrontImage(imageData);
        setErrors(e => ({ ...e, front: '' }));
      } else {
        setBackImage(imageData);
        setErrors(e => ({ ...e, back: '' }));
      }
    } catch (err) {
      Alert.alert('Error', 'Something went wrong while selecting the image. Please try again.');
    } finally {
      if (side === 'front') setUploadingFront(false);
      else setUploadingBack(false);
    }
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const newErrors = {};
    if (!idType)      newErrors.idType = 'Please select an ID type.';
    if (!frontImage)  newErrors.front  = 'Please upload the front side of your ID.';
    if (!backImage)   newErrors.back   = 'Please upload the back side of your ID.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // MOCK HANDLER — backend dev: replace body only
  // ─────────────────────────────────────────────────────────────────────────
  const handleContinue = () => {
    if (!validate()) return;
    const payload = {
      idType:     idType.value,
      idLabel:    idType.label,
      frontUri:   frontImage.uri,
      backUri:    backImage.uri,
    };
    console.log('[MOCK] Government ID saved:', payload);
    // TODO: await TherapistService.saveGovID(payload);
    navigation.navigate('ProfilePhoto'); // update when next screen is ready
  };

  const isFormFilled = idType && frontImage && backImage;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const uploadRevealStyle = {
    opacity: uploadReveal,
    transform: [{
      translateY: uploadReveal.interpolate({
        inputRange: [0, 1], outputRange: [16, 0],
      }),
    }],
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Top Bar ─────────────────────────────────────────────── */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={colors.textDark} />
            </TouchableOpacity>
            <View style={styles.brandIcon}>
              <Ionicons name="pulse" size={16} color={colors.white} />
            </View>
          </View>

          {/* ── Animated content ─────────────────────────────────────── */}
          <Animated.View style={[
            styles.contentWrapper,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}>

            {/* Shield icon */}
            <View style={styles.shieldIconBox}>
              <Ionicons name="shield-checkmark-outline" size={30} color={colors.primary} />
            </View>

            <Text style={styles.heading}>Government ID{'\n'}Verification</Text>
            <Text style={styles.subtitle}>
              Upload a valid government-issued{'\n'}identification document
            </Text>

            {/* ── Card ─────────────────────────────────────────────── */}
            <View style={styles.card}>

              {/* ID Type selector */}
              <Text style={styles.label}>ID Type</Text>
              <TouchableOpacity
                style={[styles.selectRow, errors.idType && styles.inputError]}
                onPress={() => setDropdownOpen(true)}
                activeOpacity={0.75}
              >
                <Text style={idType ? styles.selectText : styles.selectPlaceholder}>
                  {idType ? idType.label : 'Select ID type'}
                </Text>
                <Ionicons
                  name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textLight}
                />
              </TouchableOpacity>
              {errors.idType ? <Text style={styles.errorText}>{errors.idType}</Text> : null}

              {/* ── Upload rows — revealed after ID type selected ──── */}
              {idType ? (
                <Animated.View style={uploadRevealStyle}>

                  {/* Front Side */}
                  <View style={[styles.uploadRow, errors.front && styles.uploadRowError]}>
                    <View style={styles.uploadIconCol}>
                      {frontImage ? (
                        <Image source={{ uri: frontImage.uri }} style={styles.thumbImage} />
                      ) : (
                        <Ionicons name="document-outline" size={28} color={colors.textLight} />
                      )}
                    </View>
                    <View style={styles.uploadTextCol}>
                      <Text style={styles.uploadTitle}>Front Side</Text>
                      <Text style={styles.uploadHint}>
                        {frontImage
                          ? `✓ ${frontImage.fileName}`
                          : 'Upload the front side of your ID'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.uploadBtn, frontImage && styles.uploadBtnDone]}
                      onPress={() => pickImage('front')}
                      disabled={uploadingFront}
                    >
                      {uploadingFront
                        ? <ActivityIndicator size="small" color={colors.primary} />
                        : <Text style={[styles.uploadBtnText, frontImage && styles.uploadBtnTextDone]}>
                            {frontImage ? 'Change' : 'Upload'}
                          </Text>
                      }
                    </TouchableOpacity>
                  </View>
                  {errors.front ? <Text style={styles.errorText}>{errors.front}</Text> : null}

                  {/* Back Side */}
                  <View style={[styles.uploadRow, styles.uploadRowMt, errors.back && styles.uploadRowError]}>
                    <View style={styles.uploadIconCol}>
                      {backImage ? (
                        <Image source={{ uri: backImage.uri }} style={styles.thumbImage} />
                      ) : (
                        <Ionicons name="document-outline" size={28} color={colors.textLight} />
                      )}
                    </View>
                    <View style={styles.uploadTextCol}>
                      <Text style={styles.uploadTitle}>Back Side</Text>
                      <Text style={styles.uploadHint}>
                        {backImage
                          ? `✓ ${backImage.fileName}`
                          : 'Upload the back side of your ID'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.uploadBtn, backImage && styles.uploadBtnDone]}
                      onPress={() => pickImage('back')}
                      disabled={uploadingBack}
                    >
                      {uploadingBack
                        ? <ActivityIndicator size="small" color={colors.primary} />
                        : <Text style={[styles.uploadBtnText, backImage && styles.uploadBtnTextDone]}>
                            {backImage ? 'Change' : 'Upload'}
                          </Text>
                      }
                    </TouchableOpacity>
                  </View>
                  {errors.back ? <Text style={styles.errorText}>{errors.back}</Text> : null}

                  {/* Size hint */}
                  <Text style={styles.sizeHint}>JPG only · Max {MAX_FILE_SIZE_MB} MB per image</Text>

                </Animated.View>
              ) : null}

            </View>

            {/* ── Continue Button ──────────────────────────────────── */}
            <TouchableOpacity
              style={[styles.primaryBtn, !isFormFilled && styles.primaryBtnDisabled]}
              onPress={handleContinue}
              disabled={!isFormFilled}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Continue</Text>
            </TouchableOpacity>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── ID Type Dropdown Modal ────────────────────────────────────── */}
      <Modal
        visible={dropdownOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDropdownOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDropdownOpen(false)}
        />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Select ID Type</Text>
          <FlatList
            data={INDIA_ID_TYPES}
            keyExtractor={item => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  idType?.value === item.value && styles.modalItemSelected,
                ]}
                onPress={() => {
                  setIdType(item);
                  setErrors(e => ({ ...e, idType: '' }));
                  // Reset images if user switches ID type
                  setFrontImage(null);
                  setBackImage(null);
                  setDropdownOpen(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.modalItemText,
                  idType?.value === item.value && styles.modalItemTextSelected,
                ]}>
                  {item.label}
                </Text>
                {idType?.value === item.value && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.modalDivider} />}
          />
        </View>
      </Modal>

    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  flex:   { flex: 1 },
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

  // Shield icon
  shieldIconBox: {
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
    lineHeight: 36,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },

  label: {
    fontSize: fonts.sm,
    fontWeight: fonts.semibold,
    color: colors.textDark,
    marginBottom: 8,
  },

  // ID Type selector row
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    height: 50,
  },
  selectText: {
    fontSize: fonts.md,
    color: colors.textDark,
  },
  selectPlaceholder: {
    fontSize: fonts.md,
    color: colors.placeholder,
  },
  inputError: { borderColor: '#FC8181' },
  errorText: {
    color: colors.error,
    fontSize: fonts.xs,
    marginTop: 5,
    marginLeft: 2,
  },

  // Upload rows
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    backgroundColor: colors.background,
  },
  uploadRowMt:    { marginTop: 10 },
  uploadRowError: { borderColor: '#FC8181' },
  uploadIconCol:  { marginRight: 12 },
  thumbImage: {
    width: 36, height: 36,
    borderRadius: 6,
    backgroundColor: colors.cardBorder,
  },
  uploadTextCol: { flex: 1 },
  uploadTitle: {
    fontSize: fonts.sm,
    fontWeight: fonts.semibold,
    color: colors.textDark,
    marginBottom: 2,
  },
  uploadHint: {
    fontSize: fonts.xs,
    color: colors.textLight,
    lineHeight: 16,
  },
  uploadBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    minWidth: 64,
    alignItems: 'center',
  },
  uploadBtnDone: {
    backgroundColor: '#E6F0ED',
  },
  uploadBtnText: {
    fontSize: fonts.xs,
    fontWeight: fonts.semibold,
    color: colors.primary,
  },
  uploadBtnTextDone: {
    color: '#4A7C6B',
  },
  sizeHint: {
    fontSize: fonts.xs,
    color: colors.textLight,
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Continue button
  primaryBtn: {
    width: '100%', height: 52,
    backgroundColor: colors.primary,
    borderRadius: 30,
    justifyContent: 'center', alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: {
    color: colors.white,
    fontSize: fonts.md,
    fontWeight: fonts.bold,
    letterSpacing: 0.3,
  },

  // Dropdown modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingHorizontal: 20,
    maxHeight: '55%',
  },
  modalHandle: {
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: colors.cardBorder,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: fontFamilies.instrumentSerif,
    fontSize: fonts.lg,
    fontWeight: fonts.bold,
    color: colors.textDark,
    marginBottom: 12,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  modalItemSelected: {
    // subtle teal tint on selected row
  },
  modalItemText: {
    fontSize: fonts.md,
    color: colors.textDark,
  },
  modalItemTextSelected: {
    color: colors.primary,
    fontWeight: fonts.semibold,
  },
  modalDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
  },
});

export default GovernmentIDVerificationScreen;
