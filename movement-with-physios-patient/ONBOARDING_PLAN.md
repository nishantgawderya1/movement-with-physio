# MWP Patient — Onboarding Flow Implementation Plan

## 1. Confirmed Screen List & Route Names

The onboarding flow lives within the `AuthNavigator` (headerless stack). Route names exactly match the `PATIENT_ROUTES` enum:

| Step | Screen Component | Route Name | Purpose |
|------|------------------|------------|---------|
| - | `SplashScreen` | `SPLASH` | 2.5s auto-navigation, two-line logo |
| - | `LoginScreen` | `LOGIN` | Welcome graphic, USP features, Start/Login CTAs |
| 1 | `PersonalInfoScreen` | `PERSONAL_INFO` | Collect Name, Age |
| 2 | `PainLocationScreen` | `PAIN_LOCATION` | Collect pain locations (8 body part cards, multi-select) |
| 3 | `PainSeverityScreen` | `ONBOARDING_STEP_3` | Collect pain severity (1-10 scale) |
| 4 | `PainDurationScreen` | `ONBOARDING_STEP_4` | Collect pain duration (<1wk, 1-4wks, 1-3mo, >3mo) |
| 5 | `TreatmentHistoryScreen` | `ONBOARDING_STEP_5` | Collect history (Yes/No toggle + optional detail) |
| 6 | `RecoveryGoalsScreen` | `ONBOARDING_STEP_6` | Collect goals (Pain relief, mobility, etc. multi-select) |
| 7 | `AvailabilityScreen` | `ONBOARDING_STEP_7` | Collect availability (Morning/Afternoon/Evening) |
| - | `OnboardingCompleteScreen`| `ONBOARDING_COMPLETE`| Success confirmation, triggers Main app switch |

---

## 2. File Structure

```text
src/
  screens/
    auth/
      SplashScreen.jsx
      LoginScreen.jsx
      PersonalInfoScreen.jsx         (Step 1)
      PainLocationScreen.jsx         (Step 2)
      PainSeverityScreen.jsx         (Step 3)
      PainDurationScreen.jsx         (Step 4)
      TreatmentHistoryScreen.jsx     (Step 5)
      RecoveryGoalsScreen.jsx        (Step 6)
      AvailabilityScreen.jsx         (Step 7)
      OnboardingCompleteScreen.jsx
  components/
    auth/
      OnboardingShell.jsx            (Shared wrapper)
      FeatureRow.jsx                 (For LoginScreen)
      SelectableCard.jsx             (For grids)
      SelectablePill.jsx             (For toggles/multi-select)
    ui/
      PrimaryButton.jsx
      OutlineButton.jsx
      TextInput.jsx
```

---

## 3. Shared Onboarding Shell Component Plan

**Component:** `OnboardingShell.jsx`

To ensure DRY principles and pixel-perfect consistency across all 7 steps, we will create a layout wrapper component.

**Props:**
- `step` (number): e.g., 1 (renders "Step 1 of 7")
- `heading` (string): e.g., "What's your name?"
- `subtitle` (string): e.g., "We'd love to know how to address you"
- `onBack` (function): Handler for the top-left back chevron
- `onContinue` (function): Handler for the bottom main button
- `isContinueDisabled` (boolean): Controls disabled state of the continue button
- `continueButtonLabel` (string): Default "Continue"
- `children` (ReactNode): The specific inputs/cards for that step

**Layout Implementation:**
```jsx
<SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
  <KeyboardAvoidingView behavior={os === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
    
    {/* HEADER: Back Button & Step Counter */}
    <View style={headerStyles}>
      <TouchableOpacity onPress={onBack}>
        <Ionicons name="chevron-back" size={24} color={colors.textDark} />
      </TouchableOpacity>
      <Text style={stepStyles}>Step {step} of 7</Text>
    </View>

    {/* SCROLLABLE CONTENT: Typography & Children */}
    <ScrollView contentContainerStyle={scrollPadding}>
      <Text style={headingStyles}>{heading}</Text>
      <Text style={subtitleStyles}>{subtitle}</Text>
      <View style={childrenWrapperStyles}>
        {children}
      </View>
    </ScrollView>

    {/* FIXED FOOTER: CTA Button */}
    <View style={footerStyles}>
      <PrimaryButton 
        title={continueButtonLabel} 
        onPress={onContinue} 
        disabled={isContinueDisabled} 
      />
    </View>

  </KeyboardAvoidingView>
</SafeAreaView>
```

---

## 4. State Management Plan

**Strategy:** React Context API (`OnboardingProvider`)

Instead of passing massive param objects via `navigation.navigate('NEXT', { ...oldParams, newParam })` which becomes brittle if a user goes back and forth, we will use a dedicated local context at the root of the `AuthNavigator`.

**Data Structure:**
```javascript
const initialOnboardingState = {
  // Step 1
  name: '',
  age: '',
  // Step 2
  painLocations: [], // e.g. ['Back', 'Neck']
  // Step 3
  painSeverity: null, // 1-10
  // Step 4
  painDuration: '', // '< 1 week'
  // Step 5
  hadPreviousTreatment: null, // boolean
  previousTreatmentDetails: '',
  // Step 6
  recoveryGoals: [], // ['Pain relief', 'Mobility']
  // Step 7
  availability: [], // ['Weekday Mornings']
};
```

**Flow:**
1. Each screen accesses state via `const { onboardingData, updateOnboardingData } = useOnboardingContext();`
2. Screen localizes the specific field into its own `useState` for instant UI feedback.
3. On "Continue" press:
   - Call `updateOnboardingData({ specificField: localState })`
   - Call `navigation.navigate('NEXT_SCREEN')`
4. User can safely press "Back" without losing data (pre-fill local `useState` from Context).
5. On Step 7 Continue: Submit entire `onboardingData` payload to the mock service.

---

## 5. Mock Service Contract

**File:** `src/services/mockOnboardingApi.js`

```javascript
/**
 * Submits the aggregated onboarding payload.
 * 
 * @param {Object} payload - The complete onboardingData object from Context
 * @returns {Promise<Object>} Response indicating success and mock userId
 */
export const submitOnboardingData = async (payload) => {
  console.log("Submitting Onboarding Data:", JSON.stringify(payload, null, 2));

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Basic validation check
      if (!payload.name || payload.painLocations.length === 0) {
        return reject(new Error("Missing required fields for submission"));
      }

      resolve({
        status: 200,
        success: true,
        message: "Patient profile created successfully",
        data: {
          patientId: "pat_ab12cd34",
          nextAction: "REQUIRE_KYC" // or auto-route to HOME
        }
      });
    }, 1500); // 1.5s simulated network delay
  });
};
```

---

## 6. Build Order

1. **Foundations (UI Primitives):**
   - `PrimaryButton`, `OutlineButton`, `TextInput`
2. **Specialized Components:**
   - `OnboardingShell` (Critical: defines layout for 7 screens)
   - `FeatureRow` (For Login)
   - `SelectableCard` (For grids)
3. **Context Setup:**
   - `OnboardingContext.jsx` & verify it wraps AuthNavigator
4. **Pre-Onboarding Screens:**
   - `SplashScreen`
   - `LoginScreen`
5. **Onboarding Pipeline (Sequential):**
   - Step 1: `PersonalInfoScreen`
   - Step 2: `PainLocationScreen`
   - Steps 3-7: `PainSeverityScreen` through `AvailabilityScreen`
   - Final: `OnboardingCompleteScreen`
6. **Integration & Wiring:**
   - Hook up Step 7's continue button to `submitOnboardingData`
   - Transition to `MainNavigator` upon success.

---

## 7. Risk & Dependency Notes

- **Keyboard Avoidance on Android:** `KeyboardAvoidingView` behaves differently on iOS vs Android. The `PersonalInfoScreen` (Step 1) requires thorough visual testing on an Android emulator to ensure the "Continue" footer doesn't overlap the age input. *Mitigation: Use `react-native-keyboard-aware-scroll-view` if standard behavior fails, or pad the ScrollView bottom.*
- **Constants Dependency:** All screens strictly require `src/constants/colors.js` and `src/constants/fonts.js`. Do not hardcode hex values.
- **Instrument Serif Rendering:** Since it's a serif font, it may clip vertically on Android if used inside a tightly constrained View. *Mitigation: Add `lineHeight` slightly larger than fontSize in the heading style.*
- **Context Stale Data:** Ensure context wrapper is destroyed/reset when user logs out. Since it's wrapping `AuthNavigator`, switching to `MainNavigator` and back will automatically unmount and reset it (which is the desired behavior).
