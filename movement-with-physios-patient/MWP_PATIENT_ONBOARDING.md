# TASK: mwp-patient Onboarding Flow

## Skills (run before starting)
```
/react-native-architecture
/mobile-design
/building-native-ui
/javascript-pro
/verification-before-completion
```

---

## Stack
| | |
|---|---|
| Framework | Expo SDK 54 / RN 0.81.5 / React 19 |
| Language | JavaScript ONLY — no .ts/.tsx ever |
| Navigation | React Navigation v7 — createStackNavigator |
| Styling | StyleSheet.create() at bottom of every file |
| Icons | Ionicons from @expo/vector-icons ONLY |
| New packages | NONE — use existing package.json only |

---

## Design Tokens
Import path: `src/constants/colors.js` + `src/constants/fonts.js`
Never hardcode hex or numbers — always use tokens.

**Colors**
| Token | Value |
|---|---|
| colors.primary | #1A5C4A |
| colors.primaryLight | #E8F5F0 |
| colors.background | #F7FAFC |
| colors.white | #FFFFFF |
| colors.textDark | #1A202C |
| colors.textMedium | #4A5568 |
| colors.textLight | #718096 |
| colors.cardBorder | #E2E8F0 |
| colors.inputBorder | #CBD5E0 |
| colors.error | #E53E3E |
| colors.placeholder | #9CA3AF |

**Fonts**
| Token | Value |
|---|---|
| fonts.xxxl/xxl/xl/lg/md/sm/xs | 32/26/20/17/15/13/11 |
| fonts.bold/semibold/medium/regular | 700/600/500/400 |
| fontFamilies.instrumentSerif | InstrumentSerif_400Regular |

**Components**
- Pill button: borderRadius 30, full width
- Primary: bg colors.primary, white text
- Outline: border colors.primary, colors.primary text
- Heading: fontFamily instrumentSerif always
- Card selected: bg primaryLight, border primary
- Card default: bg white, border cardBorder

---

## Routes
File: `src/constants/routes.js` — export as `PATIENT_ROUTES`

```js
SPLASH, LOGIN, PERSONAL_INFO, PAIN_LOCATION,
PAIN_SEVERITY, PAIN_DURATION, TREATMENT_HISTORY,
RECOVERY_GOALS, AVAILABILITY, ONBOARDING_COMPLETE,
HOME, APPOINTMENTS, BOOK_APPOINTMENT, APPOINTMENT_DETAIL,
RESCHEDULE, EXERCISES, EXERCISE_DETAIL, EXERCISE_COMPLETE,
MESSAGES, CHAT, PROGRESS, LOG_PAIN,
INVOICES, INVOICE_DETAIL, VIDEO_CALL,
PROFILE, EDIT_PROFILE, SETTINGS
```

---

## Mock Service Contract
File: `src/services/auth/mockOnboardingService.js`

```js
// ALWAYS resolve, NEVER reject
// Success: resolve({ success: true, data: { ... } })
// Error:   resolve({ success: false, error: 'message' })

submitOnboarding(payload) // 1500ms delay
  valid (payload.name && painLocations.length > 0):
    → { success: true, data: { patientId: 'pat_mock_001', status: 'pending_match' } }
  invalid:
    → { success: false, error: 'Missing required profile information' }
```

---

## Onboarding State (Context)
File: `src/context/OnboardingContext.jsx`
Exports: `OnboardingProvider`, `useOnboarding`

```js
// Shape
{
  name: '', age: '',
  painLocations: [],        // string[]
  painSeverity: null,       // number 1-10
  painDuration: '',         // string
  hadPreviousTreatment: null, // boolean
  previousTreatmentDetails: '',
  recoveryGoals: [],        // string[]
  availability: [],         // string[]
}
// updateOnboardingData(partial) — merges like setState
```

---

## Build Order (tick off sequentially)

### Group A — Foundations
1. `src/constants/routes.js`
2. `src/context/OnboardingContext.jsx`
3. `src/components/auth/OnboardingShell.jsx`
4. `src/components/auth/SelectableCard.jsx`
5. `src/components/auth/SelectablePill.jsx`
6. `src/services/auth/mockOnboardingService.js`

### Group B — Screens
7. `src/screens/splash/SplashScreen.jsx`
8. `src/screens/auth/LoginScreen.jsx`
9. `src/screens/auth/PersonalInfoScreen.jsx`
10. `src/screens/auth/PainLocationScreen.jsx`
11. `src/screens/auth/PainSeverityScreen.jsx`
12. `src/screens/auth/PainDurationScreen.jsx`
13. `src/screens/auth/TreatmentHistoryScreen.jsx`
14. `src/screens/auth/RecoveryGoalsScreen.jsx`
15. `src/screens/auth/AvailabilityScreen.jsx`
16. `src/screens/auth/OnboardingCompleteScreen.jsx`

### Group C — Navigation
17. `src/navigation/AuthNavigator.jsx`
18. `src/navigation/AppNavigator.jsx`

---

## Component Specs

### OnboardingShell.jsx
Props: `step, heading, subtitle, onBack, onContinue, isContinueDisabled, continueLabel='Continue', children`

```
SafeAreaView (bg background, flex:1)
└── KeyboardAvoidingView (behavior: Platform.OS==='ios'?'padding':'height')
    ├── Header: [chevron-back icon] ←→ ["Step X of 7" right-aligned]
    ├── ScrollView flex:1
    │   ├── heading (xxl, instrumentSerif, textDark, mt:24, mb:8)
    │   ├── subtitle (md, textMedium, mb:32)
    │   └── {children}
    └── Footer (NOT in ScrollView)
        └── Primary pill button (disabled → opacity:0.5)
```
Import `Platform` from `react-native`

### SelectableCard.jsx
Props: `label, isSelected, onPress, iconName`
- 3-col grid item, border 1.5, borderRadius:16, padding:16
- Ionicons centered top, size 28, label below (sm, textDark, center)
- Selected: bg primaryLight, border primary

### SelectablePill.jsx
Props: `label, isSelected, onPress`
- borderRadius:20, paddingH:16, paddingV:10, border 1.5
- Selected: bg primaryLight, border primary, text primary
- Default: bg white, border cardBorder, text textMedium

---

## Screen Specs

### SplashScreen
- Full screen white, centered
- Line 1: "movement with" — sm, placeholder, letterSpacing:2
- Line 2: Row — "PHYSI" + Ionicons leaf (size 18, primary) + "OS" — xxxl, bold, primary
- useEffect: navigation.replace(PATIENT_ROUTES.LOGIN) after 2500ms

### LoginScreen
- ScrollView, bg white
- "Welcome !!" — xxxl, instrumentSerif, textDark, centered
- Subtitle — sm, textLight, centered, mb:40
- 3 feature rows (icon circle 44x44 bg primaryLight + title/subtitle text):
  - location-outline → "Made for India" / "Designed for Indian healthcare needs"
  - people-outline → "Therapist Supervised" / "Licensed professionals monitor your progress"
  - lock-closed-outline → "Secure & Encrypted" / "Only you can access your medical information"
- CTAs at bottom:
  - Primary "Start My Recovery" → navigate(PERSONAL_INFO)
  - Outline "Login" → navigate(CLERK_AUTH) [stub]

### PersonalInfoScreen — Step 1
Shell: heading="What's your name?" subtitle="We'd love to know how to address you"
- Pre-fill from useOnboarding context
- TextInput: name (autoCapitalize words)
- TextInput: age (keyboardType numeric)
- valid: name.trim() > 0 AND age 1-120
- onContinue: updateOnboardingData({name, age:parseInt(age)}) → navigate(PAIN_LOCATION)

### PainLocationScreen — Step 2
Shell: heading="Where do you feel pain?" subtitle="Select part of the body"
- FlatList numColumns=3 of SelectableCard (multi-select)
- Items + iconNames:
  ```
  Back→body-outline, Neck→fitness-outline, Arm→hand-left-outline,
  Leg→walk-outline, Shoulder→accessibility-outline, Spine→git-branch-outline,
  Pelvic Physio→female-outline, Fracture→bandage-outline
  ```
- disabled if selectedLocations.length === 0
- onContinue: updateOnboardingData({painLocations}) → navigate(PAIN_SEVERITY)

### PainSeverityScreen — Step 3
Shell: heading="How severe is your pain?" subtitle="On a scale of 1 to 10"
- Row of 10 circular buttons (1–10), size 44x44
- Single select: selected→bg primary white text, default→border circle textDark
- disabled if selectedSeverity === null
- onContinue: updateOnboardingData({painSeverity}) → navigate(PAIN_DURATION)

### PainDurationScreen — Step 4
Shell: heading="How long have you had this pain?" subtitle="Select the closest option"
- 4 SelectablePill (single select, vertical list):
  'Less than 1 week', '1–4 weeks', '1–3 months', 'More than 3 months'
- disabled if !selectedDuration
- onContinue: updateOnboardingData({painDuration}) → navigate(TREATMENT_HISTORY)

### TreatmentHistoryScreen — Step 5
Shell: heading="Have you been treated before?" subtitle="Previous physiotherapy or medical treatment"
- 2 SelectablePill side-by-side: "Yes" / "No" (single select)
- If "Yes": show TextInput "Brief details (optional)"
- disabled if hadPreviousTreatment === null
- onContinue: updateOnboardingData({hadPreviousTreatment, previousTreatmentDetails}) → navigate(RECOVERY_GOALS)

### RecoveryGoalsScreen — Step 6
Shell: heading="What's your goal?" subtitle="Select all that apply"
- 6 SelectablePill (multi-select, 2-col flex-wrap):
  'Reduce Pain', 'Improve Mobility', 'Post-Surgery Recovery',
  'Sports Performance', 'Posture Correction', 'General Wellness'
- disabled if selectedGoals.length === 0
- onContinue: updateOnboardingData({recoveryGoals}) → navigate(AVAILABILITY)

### AvailabilityScreen — Step 7
Shell: heading="When are you available?" subtitle="Select your preferred session times" continueLabel="Finish"
- 6 SelectablePill (multi-select, 2-col flex-wrap):
  'Weekday Mornings', 'Weekday Afternoons', 'Weekday Evenings',
  'Weekend Mornings', 'Weekend Afternoons', 'Weekend Evenings'
- disabled if selectedSlots.length === 0
- onContinue:
  1. updateOnboardingData({availability:selectedSlots})
  2. const res = await submitOnboarding(fullData)
  3. if res.success → navigation.replace(ONBOARDING_COMPLETE)
  4. if !res.success → show inline error (red text, sm, below button) — NO toast libs

### OnboardingCompleteScreen
- Full screen bg primary, white text, centered
- Ionicons checkmark-circle size 80 white
- "You're all set!" — xxl, instrumentSerif, white, mt:24
- "Your recovery journey begins now." — md, white opacity:0.85, mt:8
- Outline button white border/text "Go to Dashboard" → navigation.replace(HOME)

---

## AuthNavigator.jsx
```jsx
// Wrap Stack.Navigator in <OnboardingProvider>
// All screens headerShown:false
// Order: Splash→Login→PersonalInfo→PainLocation→PainSeverity→
//        PainDuration→TreatmentHistory→RecoveryGoals→Availability→OnboardingComplete
```

## AppNavigator.jsx
```jsx
// NavigationContainer → AuthNavigator
// TODO: swap to MainNavigator after auth state is wired (Phase 3)
```

---

## Hard Rules
- NO TypeScript / no .ts .tsx
- NO hardcoded colors or font sizes
- NO new npm packages
- NO toast libraries — inline error text only
- NO reject() in mock services
- StyleSheet.create() at BOTTOM of every file
- navigation.replace() → Splash→Login, final step→Complete
- navigation.navigate() → all forward steps
- navigation.goBack() → back chevron
- Every file COMPLETE — no truncation, no "// ...rest"
- Pre-fill every step from context on mount (back-nav UX)
