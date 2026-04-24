# Personal_Info_Screen_Implementation.md
## Movement With Physios — Expo SDK 54
## Mobile Verified Update + Personal Info Screen

> **For GitHub Copilot:** Read this entire file before writing any code.
> Follow every phase in order. Do not skip. Do not modify anything not listed here.

---

## ABSOLUTE RULES

- Do NOT change Expo SDK version. Must stay SDK 54.
- Do NOT touch any screen not listed in this document.
- Do NOT change colors.js, fonts.js, navigation structure, or any constants.
- Do NOT install any new packages.
- Do NOT refactor existing working code.
- ONLY make the changes explicitly listed below.

---

## PHASE 1 — MODIFY MOBILE VERIFIED SCREEN

### File to edit: `src/screens/auth/RegistrationNextStep.jsx`
### Change type: REMOVE one component only — nothing else changes

Find and DELETE this entire block:
```jsx
{/* Placeholder notice */}
<View style={styles.noticeBanner}>
  <Ionicons name="construct-outline" size={16} color={colors.primary} />
  <Text style={styles.noticeText}>
    Next Step — Therapist Registration{'\n'}
    This screen is under development.
  </Text>
</View>
```

Also DELETE the associated styles from StyleSheet:
```js
noticeBanner: { ... },
noticeText:   { ... },
```

Then find the Continue button's onPress:
```js
onPress={() => console.log('[MOCK] Continue to registration form')}
```

Replace with:
```js
onPress={() => navigation.navigate('PersonalInfo')}
```

Remove the TODO comment above it.

**That is the only change to this file. Layout, icon, heading, subheading, button style — all untouched.**

---

## PHASE 2 — CREATE PERSONAL INFO SCREEN

### File to create: `src/screens/auth/PersonalInfoScreen.jsx`

```jsx
// src/screens/auth/PersonalInfoScreen.jsx
// ─────────────────────────────────────────────────────────────────────────────
// FIGMA REFERENCE: Personal Info Screen — "What's Your Name?"
// Part of therapist onboarding flow after mobile OTP verification.
// Backend developer: wire up handleContinue to save name via TherapistService
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts, fontFamilies } from '../../constants/fonts';

const PersonalInfoScreen = ({ navigation }) => {

  // ── Form state ────────────────────────────────────────────────────────────
  const [fullName, setFullName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // ── Fade-in animation on screen load ─────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // MOCK HANDLER
  // Backend developer: replace this function body only.
  // Import TherapistService and save the name to the user profile.
  // ─────────────────────────────────────────────────────────────────────────
  const handleContinue = () => {
    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (fullName.trim().length < 3) {
      setErrorMessage('Please enter a valid full name.');
      return;
    }
    setErrorMessage('');
    console.log('[MOCK] Full name saved:', fullName.trim());
    // TODO: await TherapistService.savePersonalInfo({ fullName: fullName.trim() });
    navigation.navigate('OnboardingNext'); // placeholder — update when next screen is ready
  };

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
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={22} color={colors.textDark} />
            </TouchableOpacity>
            <View style={styles.brandRow}>
              <View style={styles.brandIcon}>
                <Ionicons name="pulse" size={16} color={colors.white} />
              </View>
              <Text style={styles.brandText}>Join us !</Text>
            </View>
          </View>

          {/* ── Animated content wrapper ─────────────────────────────── */}
          <Animated.View style={[
            styles.contentWrapper,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}>

            {/* ── User Icon ────────────────────────────────────────── */}
            {/* Circular teal icon with person silhouette inside       */}
            <View style={styles.userIconBox}>
              <Ionicons name="person" size={30} color={colors.white} />
            </View>

            {/* ── Main Heading ─────────────────────────────────────── */}
            {/* Figma: large, Instrument Serif, dark                   */}
            <Text style={styles.heading}>What's Your Name?</Text>

            {/* ── Clarification text ───────────────────────────────── */}
            <Text style={styles.clarification}>
              Used for your therapist profile and{'\n'}visible to patients.
            </Text>

            {/* ── Secondary text ───────────────────────────────────── */}
            <Text style={styles.secondary}>
              This will be displayed to your clients.
            </Text>

            {/* ── Input Card ───────────────────────────────────────── */}
            <View style={styles.card}>

              <Text style={styles.label}>Full Name</Text>

              <View style={[
                styles.inputWrapper,
                errorMessage ? styles.inputError : null,
              ]}>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={val => {
                    setFullName(val);
                    setErrorMessage('');
                  }}
                  placeholder="Dr. Anjali Sharma"
                  placeholderTextColor={colors.textLight}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleContinue}
                />
              </View>

              {/* Inline error banner */}
              {errorMessage ? (
                <View style={styles.errorBanner}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={15}
                    color="#C53030"
                  />
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
              ) : null}

            </View>

            {/* ── Continue Button ──────────────────────────────────── */}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                !fullName.trim() && styles.primaryBtnDisabled,
              ]}
              onPress={handleContinue}
              disabled={!fullName.trim()}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Continue</Text>
            </TouchableOpacity>

          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background },
  flex:    { flex: 1 },
  scroll:  {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // ── Top Bar ───────────────────────────────────────────────────────────────
  topBar:    { flexDirection: 'row', alignItems: 'center', marginBottom: 36 },
  backBtn:   { padding: 4, marginRight: 12 },
  brandRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandIcon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  brandText: {
    fontFamily: fontFamilies.instrumentSerif,
    fontSize: fonts.lg,
    color: colors.textDark,
  },

  // ── Content wrapper ───────────────────────────────────────────────────────
  contentWrapper: { flex: 1 },

  // ── User icon ─────────────────────────────────────────────────────────────
  userIconBox: {
    width: 68, height: 68,
    borderRadius: 34,               // circular — not rounded square
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },

  // ── Headings ──────────────────────────────────────────────────────────────
  heading: {
    fontFamily: fontFamilies.instrumentSerif,
    fontSize: fonts.xxl,
    fontWeight: fonts.bold,
    color: colors.textDark,
    marginBottom: 8,
  },
  clarification: {
    fontSize: fonts.sm,
    color: colors.textLight,
    lineHeight: 20,
    marginBottom: 4,
  },
  secondary: {
    fontSize: fonts.xs,
    color: colors.textLight,
    marginBottom: 28,
    fontStyle: 'italic',
  },

  // ── Card ──────────────────────────────────────────────────────────────────
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
  inputWrapper: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    height: 50,
    justifyContent: 'center',
  },
  inputError: {
    borderColor: '#FC8181',
  },
  input: {
    fontSize: fonts.md,
    color: colors.textDark,
    flex: 1,
  },

  // ── Error banner ──────────────────────────────────────────────────────────
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FED7D7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    gap: 8,
  },
  errorBannerText: {
    fontSize: fonts.xs,
    color: '#C53030',
    flex: 1,
    lineHeight: 18,
  },

  // ── Button ────────────────────────────────────────────────────────────────
  primaryBtn: {
    width: '100%', height: 52,
    backgroundColor: colors.primary,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: {
    color: colors.white,
    fontSize: fonts.md,
    fontWeight: fonts.bold,
    letterSpacing: 0.3,
  },
});

export default PersonalInfoScreen;
```

---

## PHASE 3 — ADD TO NAVIGATOR

### File to edit: `src/navigation/AuthNavigator.jsx`
### Change: ADD 1 import + 1 Stack.Screen only

Add import:
```jsx
import PersonalInfoScreen from '../screens/auth/PersonalInfoScreen';
```

Add screen inside `<Stack.Navigator>`:
```jsx
<Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
```

**Nothing else in AuthNavigator.jsx changes.**

---

## PHASE 4 — BACKEND SCAFFOLD

Create these files. Documentation and placeholders only.
No server. No real logic. No packages.

---

### `backend/models/TherapistModel.js`

```js
// backend/models/TherapistModel.js
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE: Defines the therapist user data schema.
//
// FIELDS:
//   id                  string    UUID primary key
//   phoneNumber         string    Unique — verified via OTP
//   phoneVerified       boolean   True after OTP success
//   fullName            string    Set on PersonalInfoScreen
//   email               string    Collected later in onboarding
//   role                enum      'therapist' | 'patient' | 'admin'
//   onboardingStep      number    Tracks registration progress (1–5)
//   verificationStatus  enum      'pending' | 'approved' | 'rejected'
//   iapNumber           string    IAP registration number (onboarding step 2)
//   aadhaarVerified     boolean   True after Aadhaar doc review
//   profilePhotoUrl     string    Uploaded profile photo URL
//   createdAt           datetime
//   updatedAt           datetime
//
// TODO: Implement using MongoDB (Mongoose), PostgreSQL (Prisma),
//       or Firebase Firestore depending on chosen backend stack.
// ─────────────────────────────────────────────────────────────────────────────
```

---

### `backend/controllers/therapistController.js`

```js
// backend/controllers/therapistController.js
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE: Handles therapist onboarding and profile API requests.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/therapist/personal-info
 * ───────────────────────────────────
 * Saves therapist's full name during onboarding step 1.
 *
 * Request headers: { Authorization: "Bearer <jwt_token>" }
 * Request body:    { fullName: "Dr. Anjali Sharma" }
 * Response:        { success: true, data: { onboardingStep: 2 } }
 *
 * Steps to implement:
 * 1. Verify JWT token from header
 * 2. Validate fullName (min 3 chars, string only)
 * 3. Update therapist record: fullName + onboardingStep = 2
 * 4. Return updated onboarding progress
 */
export const savePersonalInfo = async (req, res) => {
  // TODO: implement
};

/**
 * GET /api/therapist/profile
 * ───────────────────────────
 * Returns the current therapist's profile and onboarding progress.
 *
 * Request headers: { Authorization: "Bearer <jwt_token>" }
 * Response:        { success: true, data: { therapist: { ...fields } } }
 */
export const getProfile = async (req, res) => {
  // TODO: implement
};
```

---

### `backend/routes/therapistRoutes.js`

```js
// backend/routes/therapistRoutes.js
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE: Defines all therapist onboarding and profile API routes.
// ─────────────────────────────────────────────────────────────────────────────

import express from 'express';
import { savePersonalInfo, getProfile } from '../controllers/therapistController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/therapist/personal-info — requires valid JWT
router.post('/personal-info', authMiddleware, savePersonalInfo);

// GET /api/therapist/profile — requires valid JWT
router.get('/profile', authMiddleware, getProfile);

export default router;
```

---

### `backend/middleware/authMiddleware.js`

```js
// backend/middleware/authMiddleware.js
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE: Validates JWT token on protected routes.
//
// HOW IT WORKS:
// 1. Read Authorization header: "Bearer <token>"
// 2. Verify token using JWT_SECRET from environment variables
// 3. Attach decoded user data to req.user
// 4. Call next() if valid, return 401 if invalid or expired
//
// TODO: implement using jsonwebtoken package
// ─────────────────────────────────────────────────────────────────────────────

export const authMiddleware = (req, res, next) => {
  // TODO: implement
  next(); // remove this line when implemented
};
```

---

### `backend/services/therapistService.js`

```js
// backend/services/therapistService.js
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE: Business logic for therapist profile operations.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * updatePersonalInfo
 * Updates therapist's name and advances onboarding step.
 * @param {string} userId
 * @param {string} fullName
 * @returns {Promise<{ onboardingStep: number }>}
 * TODO: implement using chosen DB
 */
export const updatePersonalInfo = async (userId, fullName) => {
  // TODO: implement
};

/**
 * getTherapistById
 * Fetches full therapist record by ID.
 * @param {string} userId
 * @returns {Promise<TherapistModel>}
 * TODO: implement using chosen DB
 */
export const getTherapistById = async (userId) => {
  // TODO: implement
};
```

---

## PHASE 5 — NAVIGATION FLOW AFTER CHANGES

```
OTP Verification Screen
        ↓  correct OTP (9876543210 + 123456)
RegistrationNextStep  ("Mobile Verified!")
        ↓  Continue button
PersonalInfo Screen  ("What's Your Name?")
        ↓  Continue button
OnboardingNext  (placeholder — next screen to be built)
```

---

## PHASE 6 — FILE SUMMARY

### ✅ CREATE
```
src/screens/auth/PersonalInfoScreen.jsx
backend/models/TherapistModel.js
backend/controllers/therapistController.js
backend/routes/therapistRoutes.js
backend/middleware/authMiddleware.js
backend/services/therapistService.js
```

### ✏️ MODIFY (minimal targeted changes only)
```
src/screens/auth/RegistrationNextStep.jsx
  → REMOVE noticeBanner View + its styles
  → UPDATE Continue onPress to navigate('PersonalInfo')

src/navigation/AuthNavigator.jsx
  → ADD 1 import + 1 Stack.Screen
```

### 🚫 DO NOT TOUCH
```
App.js
src/navigation/AppNavigator.jsx
src/screens/auth/LoginScreen.jsx
src/screens/auth/TherapistPortalScreen.jsx
src/screens/auth/MobileVerificationScreen.jsx
src/screens/splash/SplashScreen.jsx
src/services/auth/mockAuthService.js
src/hooks/useLoginForm.js
src/constants/colors.js
src/constants/fonts.js
src/components/
```

---

## PHASE 7 — PRE + POST CHECKLISTS

### Pre-Implementation
- [ ] Expo SDK shows `~54.0.0` in package.json
- [ ] `RegistrationNextStep.jsx` exists
- [ ] `AuthNavigator.jsx` exists
- [ ] `colors.js` has: primary, background, white, textDark, textLight, cardBorder
- [ ] `fonts.js` exports fontFamilies.instrumentSerif

### Post-Implementation
- [ ] RegistrationNextStep no longer shows the teal notice card
- [ ] Continue on RegistrationNextStep navigates to PersonalInfo
- [ ] PersonalInfo screen fades + slides in on load
- [ ] Back arrow navigates back to RegistrationNextStep
- [ ] "Join us !" brand header shows at top
- [ ] Circular teal user icon shows below header
- [ ] "What's Your Name?" heading in Instrument Serif
- [ ] Clarification + secondary text both visible below heading
- [ ] Input card shows "Full Name" label + placeholder "Dr. Anjali Sharma"
- [ ] Continue button disabled when input is empty
- [ ] Entering < 3 characters shows inline error banner
- [ ] Valid name tapped Continue logs name + navigates forward
- [ ] No console errors
- [ ] Expo SDK still 54

---

## PHASE 8 — TROUBLESHOOTING

**noticeBanner styles removal causes error:**
```
Check: both the View JSX AND the StyleSheet entries are deleted
Note:  removing JSX without removing styles is fine (unused styles don't error)
       but clean up both for tidiness
```

**PersonalInfo screen not found:**
```
Check: screen name in Stack.Screen is exactly 'PersonalInfo'
Check: RegistrationNextStep navigate target is exactly 'PersonalInfo'
Note:  screen names are case-sensitive
```

**Fade animation not working:**
```
Check: useNativeDriver: true on both Animated.timing calls
Check: fadeAnim starts at 0, slideAnim starts at 24
```

**fontFamilies undefined:**
```
Check: fontFamilies is exported from src/constants/fonts.js
Fix:   export const fontFamilies = { instrumentSerif: 'InstrumentSerif_400Regular' }
```
