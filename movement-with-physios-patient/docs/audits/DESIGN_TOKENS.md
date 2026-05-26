# MWP Design Tokens — Patient & Therapist (Read-Only)

**Date:** 2026-05-26
**Output location:** patient repo root (`movement-with-physios-patient/DESIGN_TOKENS.md`)
**Apps:** Patient (`movement-with-physios-patient/`) · Therapist (`movement-with-physios/apps/therapist/`)

> **Headline findings**
> - Each app has a **colors** + **fonts** constants file, but **no radii or spacing tokens** — corner radii, padding, and shadows are **inline magic numbers** scattered across StyleSheets.
> - **Brand colors differ by app:** Patient teal **`#00B894`**, Therapist deep-teal **`#1A5C4A`**.
> - ⚠️ **The therapist `ClerkAuthScreen` does NOT use the brand palette** — it hardcodes local `PRIMARY='#1E3A5F'` (navy) + `ACCENT='#2563EB'` (blue). A new therapist auth screen should decide whether to follow brand teal or the existing ClerkAuth navy/blue.
> - **Fonts:** Patient = Lora (headings) + Nunito (body), both fully loaded via `useFonts`. Therapist = Instrument Serif (titles only, 25 usages) + **default system font for everything else**.
> - **Pill radius:** Therapist auth CTAs use **`borderRadius: 30`** (9 screens). Patient uses **`99`/`999`** for full pills (the lone `30` is one HomeScreen element).

---

## 1. Theme / constants files

| App | File | Exports |
|---|---|---|
| Patient | `src/constants/colors.js` | `COLORS` (legacy 6-key), `colors` (20 tokens) |
| Patient | `src/constants/fonts.js` | `fontSizes`, `fontWeights`, `fonts` (sizes+weights+`heading`/`body` families) |
| Therapist | `src/constants/colors.js` | `COLORS` (legacy 6-key), `colors` (extended auth palette) |
| Therapist | `src/constants/fonts.js` | `fonts` (sizes+weights), `fontFamilies` (Instrument Serif) |

No `src/theme/` or `src/styles/` directory exists in either app. All non-tokenized values live inline inside per-file `StyleSheet.create()`.

---

## 2. Extracted tokens

### 2a. Color tokens

#### PATIENT — `src/constants/colors.js`
| Token | Hex |
|---|---|
| `background` | `#FFFFFF` |
| `surface` | `#F4F6F9` |
| `surfaceElevated` | `#FFFFFF` |
| `primary` | `#00B894` (teal) |
| `primaryLight` | `#E0F7F2` |
| `primaryDark` | `#007A5E` |
| `textDark` | `#1A1A2E` |
| `textMedium` | `#4A5568` |
| `textLight` | `#A0AEC0` |
| `textOnPrimary` | `#FFFFFF` |
| `border` | `#E2E8F0` |
| `divider` | `#EDF2F7` |
| `success` | `#00B894` |
| `danger` | `#E53E3E` |
| `warning` | `#F6AD55` |
| `chipTomorrowBg` | `#EBF4FF` |
| `chipTomorrowText` | `#2B6CB0` |
| `planCardStart` | `#00B894` |
| `planCardEnd` | `#007A5E` |
| *(legacy `COLORS`)* | `PRIMARY #00B894`, `PRIMARY_LIGHT #E0F7F2`, `WHITE #FFFFFF`, `BLACK #1A1A2E`, `GREY #4A5568`, `GREY_LIGHT #F4F6F9` |

**Off-token hex found inline (patient):** `#C53030` + `#FEE2E2` — the **error-banner pair** in `components/common/InlineBanner.jsx` (not in `colors.js`; `colors.danger` is `#E53E3E`). Otherwise patient screens are clean (top inline hex are `#FFFFFF`, `#E0F7F2`).

#### THERAPIST — `src/constants/colors.js`
| Token | Hex |
|---|---|
| `primary` | `#1A5C4A` (deep teal) |
| `primaryLight` | `#E8F5F0` |
| `background` | `#F7FAFC` |
| `white` | `#FFFFFF` |
| `textDark` | `#1A202C` |
| `textMedium` | `#4A5568` |
| `textLight` | `#718096` |
| `textLogoGray` | `#9CA3AF` |
| `text` *(alias)* | `#1A202C` |
| `subtext` *(alias)* | `#718096` |
| `cardBorder` | `#E2E8F0` |
| `inputBorder` | `#CBD5E0` |
| `inputBg` | `#FFFFFF` |
| `error` | `#E53E3E` |
| `buttonPrimary` | `#1A5C4A` |
| `buttonPrimaryText` | `#FFFFFF` |
| `buttonOutlineBorder` | `#1A5C4A` |
| `buttonOutlineText` | `#1A5C4A` |
| `placeholder` | `#9CA3AF` |
| *(legacy `COLORS`)* | `PRIMARY #1A5C4A`, `PRIMARY_LIGHT #E8F5F0`, `WHITE #FFFFFF`, `BLACK #1A202C`, `GREY #718096`, `GREY_LIGHT #F7FAFC` |

**Off-token hex found inline (therapist) — NOT in `colors.js`:**
| Hex | Where | Note |
|---|---|---|
| `#1E3A5F` | `screens/auth/ClerkAuthScreen.jsx:239` (`const PRIMARY`) | ⚠️ navy — the live auth screen's brand color, **not** teal |
| `#2563EB` | `screens/auth/ClerkAuthScreen.jsx:240` (`const ACCENT`) | ⚠️ blue — auth CTA fill |
| `#F8FAFC` / `#64748B` / `#0F172A` / `#CBD5E1` / `#374151` / `#94A3B8` | ClerkAuthScreen StyleSheet | Slate scale, inline (not tokenized) |
| `#FC8181` / `#C53030` / `#FFF5F5` / `#FED7D7` | auth screens | error/validation reds (inline) |
| `#D97706` / `#FEF3C7` | `screens/dashboard/PendingVerificationDashboard.jsx:186-187` (`AMBER`/`AMBER_LIGHT`) | amber status |
| `#9CA3AF` | `components/chat/TypingIndicator.jsx:9` (`DOT_COLOR`) | matches `placeholder` |

### 2b. Font families + where loaded (confirmed via `expo-font` `useFonts`)

#### PATIENT
- **Heading → Lora**; **Body → Nunito**. Defined in `src/constants/fonts.js` → `fonts.heading.*` / `fonts.body.*`.
- Loaded in `App.jsx:71` `useFonts({ ... })` from `@expo-google-fonts/lora` (`App.jsx:11`) + `@expo-google-fonts/nunito` (`App.jsx:16`):

| Family key | Google-fonts import | Loaded? |
|---|---|---|
| `Lora_400Regular` (`fonts.heading.regular`) | `@expo-google-fonts/lora` | ✅ `App.jsx` |
| `Lora_400Regular_Italic` (`fonts.heading.italic`) | `@expo-google-fonts/lora` | ✅ |
| `Lora_600SemiBold` (`fonts.heading.semibold`) | `@expo-google-fonts/lora` | ✅ |
| `Nunito_400Regular` (`fonts.body.regular`) | `@expo-google-fonts/nunito` | ✅ |
| `Nunito_500Medium` (`fonts.body.medium`) | `@expo-google-fonts/nunito` | ✅ |
| `Nunito_600SemiBold` (`fonts.body.semibold`) | `@expo-google-fonts/nunito` | ✅ |

All 6 declared families are loaded — no orphan references. App renders `null` until `fontsLoaded || fontError` (`App.jsx:136`).

#### THERAPIST
- **Instrument Serif** only. Defined in `src/constants/fonts.js` → `fontFamilies.instrumentSerif` / `instrumentSerifItalic`.
- Loaded in `App.jsx:49` `useFonts({ ... })` from `@expo-google-fonts/instrument-serif` (`App.jsx:7`):

| Family key | Loaded? | Usage |
|---|---|---|
| `InstrumentSerif_400Regular` (`fontFamilies.instrumentSerif`) | ✅ `App.jsx` | **25 usages** app-wide (big titles only) |
| `InstrumentSerif_400Regular_Italic` (`fontFamilies.instrumentSerifItalic`) | ✅ | 1 usage |

⚠️ **The therapist app has no body font family** — all non-title text falls back to the **OS default system font** with numeric `fontWeight`. Only one weight (400) of the serif is loaded, so any `fontWeight` applied to a serif `Text` is faux-bolded by the OS.

### 2c. Font weight + size combinations appearing 3+ times

Frequencies measured across each app's `src/`.

#### PATIENT (most-used size: `fonts.sm`=13 ×68, `fonts.md`=15 ×41, `fonts.xs`=11 ×30)
| Combination | Approx. count | Role |
|---|---|---|
| `fontFamily: fonts.body.regular` (Nunito 400) | 39 | default body copy |
| `fontFamily: fonts.heading.regular` (Lora 400) + `fontSize: fonts.xxl(26)` + `lineHeight: ×1.35` | 29 (family) / 9 (xxl) | screen titles |
| `fontFamily: fonts.body.semibold` (Nunito 600) | 27 | buttons, emphasis, pills-selected |
| `fontSize: fonts.sm(13)` + `fontWeight: medium(500)`/`semibold(600)` | 68 (sm) | labels, pills, tab labels |
| `fontFamily: fonts.body.semibold` + `fontSize: 15` + `fontWeight:'600'` + `letterSpacing: 0.3` | 3+ | **button label** (PrimaryButton, OutlineButton, OnboardingShell CTA) |
| `fontFamily: fonts.body.medium` (Nunito 500) | 11 | medium-emphasis labels |

#### THERAPIST (most-used size: `fonts.sm`=13 ×107, `fonts.md`=15 ×65, `fonts.xs`=11 ×64)
| Combination | Approx. count | Role |
|---|---|---|
| `fontWeight: fonts.semibold('600')` (system font) | 101 | default emphasized text |
| `fontWeight: fonts.bold('700')` | 40 | strong emphasis / headings |
| `fontSize: fonts.sm(13)` + `fontWeight: semibold` | 107 (sm) | labels, captions |
| `fontSize: fonts.md(15)` + `fontWeight: bold` | 65 (md) | body / button text |
| `fontFamily: fontFamilies.instrumentSerif` + large `fontSize` (xxl/24+) | 25 | hero titles only |
| `fontWeight: fonts.medium('500')` | 15 | secondary labels |

### 2d. Spacing / radius constants

> **There are NO radii/spacing token files.** Values below are the de-facto conventions extracted from inline StyleSheets (frequency in parentheses).

#### Radii — PATIENT (frequency of `borderRadius: N`)
| Value | Count | Usage |
|---|---|---|
| `16` | 19 | cards (SelectableCard, sheets) |
| `12` | 15 | **buttons + inputs** (PrimaryButton, OutlineButton, OnboardingShell CTA) |
| `99` | 13 | **full pill** (preferred patient pill radius) |
| `10` | 7 | small chips/badges |
| `999` | 7 | full pill (alt) |
| `20` | 8 | SelectablePill, medium cards |
| `8` | 4 | tiny elements |
| `30` | **1** | one HomeScreen element (`HomeScreen.jsx:404`) — *not* the patient pill convention |

#### Radii — THERAPIST (frequency of `borderRadius: N`)
| Value | Count | Usage |
|---|---|---|
| `12` | 23 | inputs (InputField), small cards |
| `20` | 23 | cards / sheets |
| `16` | 22 | cards (ClerkAuth card) |
| `18` | 21 | cards |
| `10` | 20 | ClerkAuth input/button (`#2563EB` CTA) |
| `999` | 15 | full pill |
| `14` | 13 | **AppButton** |
| `25` | 11 | rounded chips |
| **`30`** | **9** | **auth-screen CTA pill** — LoginScreen `:195,209`, TherapistPortal `:208`, ProfessionalCredentials `:322`, ProfilePhoto `:308`, RegistrationNextStep `:94`, PersonalInfo `:334`, GovernmentID `:553`, ScheduleVerificationCall `:313` |

#### Spacing conventions (inline, both apps)
| Concept | Patient | Therapist |
|---|---|---|
| Screen horizontal padding | `24` (OnboardingShell, ClerkAuth) | `24` (ClerkAuth, auth screens) |
| Control height (button) | `52` | `52` (ClerkAuth) / `54` (AppButton) |
| Control height (input) | `52` | `52` (InputField) |
| Card padding | `16`–`28` | `24` (ClerkAuth card) |
| Input vertical gap | — | `18` (InputField `marginBottom`) |
| Footer padding | `16` vertical (OnboardingShell) | varies |
| Grid column gap | `10` (SelectableCard) | varies |

### 2e. Shadow / elevation patterns

#### PATIENT — card/elevated shadow (e.g. ClerkAuthScreen card)
```js
shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
shadowOpacity: 0.1, shadowRadius: 12, elevation: 6
```
Other observed: `shadowOpacity 0.25/0.35` + `shadowRadius 6/8` + `elevation 8/10` (deeper hero/plan cards). InlineBanner uses `elevation: 10` (top overlay).

#### THERAPIST — most common card shadow
```js
shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
shadowOpacity: 0.06–0.08, shadowRadius: 10–12, elevation: 3–5
```
Frequencies: `shadowRadius:10 ×11`, `shadowOpacity:0.06 ×6` / `0.05 ×6` / `0.07 ×5`, `elevation:3 ×8` / `2 ×8`. Lighter, more diffuse than patient.

---

## 3. Consolidated theme blocks (drop-in for a new auth screen)

> Radii/spacing below are **synthesized** from the de-facto conventions above (no such token file exists today). Colors/fonts mirror each app's constants verbatim. `error` pair surfaced from the patient `InlineBanner` and therapist auth screens.

```js
// ─────────────────────────────────────────────────────────────────────────
// PATIENT_THEME — Lora (heading) + Nunito (body), teal #00B894
// ─────────────────────────────────────────────────────────────────────────
const PATIENT_THEME = {
  colors: {
    background: '#FFFFFF',
    surface: '#F4F6F9',
    surfaceElevated: '#FFFFFF',
    primary: '#00B894',
    primaryLight: '#E0F7F2',
    primaryDark: '#007A5E',
    textDark: '#1A1A2E',
    textMedium: '#4A5568',
    textLight: '#A0AEC0',
    textOnPrimary: '#FFFFFF',
    border: '#E2E8F0',
    divider: '#EDF2F7',
    success: '#00B894',
    danger: '#E53E3E',
    warning: '#F6AD55',
    errorText: '#C53030',     // from InlineBanner
    errorBg: '#FEE2E2',       // from InlineBanner
    placeholder: '#A0AEC0',   // == textLight (auth inputs use textLight)
  },
  fonts: {
    heading: {                // Lora (serif)
      regular: 'Lora_400Regular',
      italic: 'Lora_400Regular_Italic',
      semibold: 'Lora_600SemiBold',
    },
    body: {                   // Nunito (sans)
      regular: 'Nunito_400Regular',
      medium: 'Nunito_500Medium',
      semibold: 'Nunito_600SemiBold',
    },
    size: { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 26, xxxl: 32 },
    weight: { regular: '400', medium: '500', semibold: '600', bold: '700', extrabold: '800' },
    // recurring presets:
    title:  { fontFamily: 'Lora_400Regular', fontSize: 26, lineHeight: 26 * 1.35 },
    body_:  { fontFamily: 'Nunito_400Regular', fontSize: 15, lineHeight: 15 * 1.5 },
    buttonLabel: { fontFamily: 'Nunito_600SemiBold', fontSize: 15, fontWeight: '600', letterSpacing: 0.3 },
  },
  radii: { sm: 8, input: 12, button: 12, card: 16, pillCompact: 20, pill: 99 },
  spacing: { screenX: 24, gap: 10, sectionGap: 16, fieldGap: 16 },
  control: { height: 52 },
  shadow: {  // card / elevated surface
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 6,
  },
};

// ─────────────────────────────────────────────────────────────────────────
// THERAPIST_THEME — Instrument Serif (titles) + system body, deep-teal #1A5C4A
// NOTE: the existing ClerkAuthScreen overrides brand teal with navy/blue
// (authPrimary/authAccent). Pick one direction for a new auth screen.
// ─────────────────────────────────────────────────────────────────────────
const THERAPIST_THEME = {
  colors: {
    primary: '#1A5C4A',
    primaryLight: '#E8F5F0',
    background: '#F7FAFC',
    white: '#FFFFFF',
    textDark: '#1A202C',
    textMedium: '#4A5568',
    textLight: '#718096',
    textLogoGray: '#9CA3AF',
    cardBorder: '#E2E8F0',
    inputBorder: '#CBD5E0',
    inputBg: '#FFFFFF',
    error: '#E53E3E',
    placeholder: '#9CA3AF',
    // existing ClerkAuthScreen palette (off-brand — inline today):
    authPrimary: '#1E3A5F',   // navy
    authAccent:  '#2563EB',   // blue (CTA fill)
    authSubtext: '#64748B',
    authBg:      '#F8FAFC',
    amber:       '#D97706',
    amberLight:  '#FEF3C7',
  },
  fonts: {
    family: {                 // Instrument Serif — titles only
      serif: 'InstrumentSerif_400Regular',
      serifItalic: 'InstrumentSerif_400Regular_Italic',
      body: undefined,        // ⚠️ none — uses OS default system font
    },
    size: { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 26, xxxl: 32 },
    weight: { regular: '400', medium: '500', semibold: '600', bold: '700', extrabold: '800' },
    // recurring presets:
    title:       { fontFamily: 'InstrumentSerif_400Regular', fontSize: 26 },
    label:       { fontSize: 13, fontWeight: '600' },   // system font
    buttonLabel: { fontSize: 15, fontWeight: '700', letterSpacing: 0.4 },
  },
  radii: { badge: 6, sm: 10, input: 12, button: 14, card: 16, cardLg: 20, pill: 30, full: 999 },
  spacing: { screenX: 24, cardPad: 24, fieldGap: 18 },
  control: { buttonHeight: 54, inputHeight: 52 },
  shadow: {  // card / elevated surface (lighter than patient)
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 4,
  },
};
```

---

## 4. Reusable primitives — candidates for new auth screens

> ⚠️ **Neither app's current `ClerkAuthScreen` uses these primitives** — both inline their own `TextInput` + `Pressable`. The components below are nonetheless the ready-made building blocks to compose a new auth screen consistently.

### PATIENT
| Component | File | Accepted props |
|---|---|---|
| **PrimaryButton** | `src/components/ui/PrimaryButton.jsx` | `{ label: string, onPress: () => void, disabled?: bool, style?: object }` — teal fill, white label, `radius 12`, `height 52` |
| **OutlineButton** | `src/components/ui/OutlineButton.jsx` | `{ label, onPress, disabled?, style? }` — soft-teal fill + teal border/label, `radius 12`, `height 52` |
| **InlineBanner** | `src/components/common/InlineBanner.jsx` | `{ visible: bool, message: string, variant?: 'success'\|'error', autoHideMs?: number (default 3000), onDismiss?: () => void }` — top slide-in; success auto-hides, error manual; tap to dismiss. *(This is the InlineErrorBanner candidate.)* |
| **OnboardingShell** | `src/components/auth/OnboardingShell.jsx` | `{ step: number, heading: string, subtitle: string, onBack?: () => void, onContinue: () => void, isContinueDisabled: bool, continueLabel?: string (default 'Continue'), children }` — SafeArea + KeyboardAvoidingView + back/step header + scroll body + fixed footer CTA. *(Closest ScreenContainer; onboarding-flavored — has a "Step N of 7" header.)* |
| **SelectableCard** | `src/components/auth/SelectableCard.jsx` | `{ label: string, isSelected: bool, onPress: () => void, iconName: string }` — 3-col grid card, Ionicon + label, `radius 16` |
| **SelectablePill** | `src/components/auth/SelectablePill.jsx` | `{ label: string, isSelected: bool, onPress: () => void }` — chip, `radius 20` |
| AchievementIcon | `src/components/ui/AchievementIcon.jsx` | `{ type: 'flame'\|'star'\|'trophy', size?: number }` — *(not auth-relevant)* |

**Patient gaps for auth:** no standalone **TextField** primitive (auth inputs are inlined `TextInput`); no generic **ScreenContainer** (OnboardingShell is the nearest but step-header-bound).

### THERAPIST
| Component | File | Accepted props |
|---|---|---|
| **AppButton** | `src/components/AppButton.jsx` | `{ title: string, onPress: () => void, loading?: bool, variant?: 'primary'\|'outline' }` — `height 54`, `radius 14`, shows `ActivityIndicator` when loading. *(PillButton candidate — but note radius 14, not the auth 30.)* |
| **InputField** | `src/components/InputField.jsx` | `{ label, value, onChangeText, placeholder, secureTextEntry?: bool, rightIcon?: node, onRightIconPress?: () => void, errorMessage?: string, keyboardType?: string }` — labeled input + right-icon slot + inline error text, `radius 12`, `height 52`. *(TextField + inline-error candidate.)* |
| CalendarPicker | `src/components/common/CalendarPicker.jsx` | controlled date picker — *(not auth-relevant)* |
| TimePillPicker | `src/components/common/TimePillPicker.jsx` | controlled hour/minute pills — *(not auth-relevant)* |

**Therapist gaps for auth:** no **InlineBanner** equivalent (auth screens show errors via `Alert.alert` or inline `errorText`); no **ScreenContainer** (each screen inlines `SafeAreaView` + `KeyboardAvoidingView` + `ScrollView`). `AppButton`/`InputField` exist and are clean, but the live `ClerkAuthScreen` does **not** import them — it inlines its own navy/blue-styled controls.

---

*End of report. No files were modified.*
