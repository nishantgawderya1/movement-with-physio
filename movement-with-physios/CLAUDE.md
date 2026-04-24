# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Movement with Physios** is a React Native (Expo) mobile app for therapist-facing clinic management. The app is for physiotherapy practices and targets therapists as primary users.

- **Framework:** Expo SDK 54 / React Native 0.81.5 / React 19
- **Language:** JavaScript (no TypeScript)
- **Navigation:** React Navigation v7 (stack-based)
- **State:** Component-local `useState` only (no global state yet)
- **Styling:** React Native `StyleSheet.create()`

## Commands

All commands run from `apps/therapist/`:

```bash
cd apps/therapist

npx expo start        # Expo dev server
npx expo run:ios        # iOS simulator
npx expo run:android    # Android emulator
npx expo run:web        # Browser (Expo web)
```

No linter, formatter, or test runner is configured yet.

## Architecture

### Monorepo layout

```
movement-with-physios/
├── apps/therapist/          ← Main app
│   ├── App.jsx              ← Entry: loads fonts, renders AppNavigator
│   ├── app.json             ← Expo config (SDK 54, slug: mwp-therapist)
│   ├── package.json         ← All dependencies
│   ├── src/
│   │   ├── screens/
│   │   │   ├── SplashScreen.jsx           (legacy, unused by navigator)
│   │   │   ├── splash/SplashScreen.jsx    (active — animated logo → Login)
│   │   │   ├── auth/LoginScreen.jsx       (welcome page + 2 CTAs)
│   │   │   ├── auth/ClerkAuthScreen.jsx   (OTP placeholder → PersonalInfo)
│   │   │   ├── auth/PersonalInfoScreen.jsx (name input → OnboardingNext)
│   │   │   ├── auth/TherapistPortalScreen.jsx (email/password login form)
│   │   │   ├── auth/ForgotPasswordScreen.jsx  (stub)
│   │   │   ├── auth/RegisterScreen.jsx        (stub)
│   │   │   ├── auth/RegistrationNextStep.jsx  (post-OTP confirmation)
│   │   │   ├── auth/OnboardingNext.jsx        (coming soon placeholder)
│   │   │   ├── dashboard/DashboardScreen.jsx  (EMPTY FILE)
│   │   │   ├── dashboard/BookingConfirmed.jsx (booking success → PendingVerificationDashboard)
│   │   │   ├── dashboard/ProfessionalCredentials.jsx (degree/license/specialization/years)
│   │   │   ├── dashboard/GovernmentIDVerification.jsx (ID type/number, front/back photo)
│   │   │   ├── dashboard/ProfilePhoto.jsx (selfie upload)
│   │   │   └── dashboard/ScheduleVerificationCall.jsx (date/time picker → BookingConfirmed)
│   │   ├── components/
│   │   │   ├── AppButton.jsx    (primary/outline button — NOT USED by any screen)
│   │   │   ├── InputField.jsx   (labeled input — NOT USED by any screen)
│   │   │   ├── common/          (empty)
│   │   │   └── layout/          (empty)
│   │   ├── navigation/
│   │   │   ├── AppNavigator.jsx    (ACTIVE — NavigationContainer + AuthNavigator)
│   │   │   ├── AuthNavigator.jsx   (Stack with 9 screens, headerShown: false)
│   │   │   └── RootNavigator.jsx   (NOT USED — has auth conditional, hardcoded false)
│   │   ├── services/
│   │   │   ├── AuthService.js          (Clerk abstraction — all stubs)
│   │   │   └── auth/
│   │   │       ├── AuthService.js      (REST mock: login/register/forgotPassword)
│   │   │       ├── OtpService.js       (OTP send/verify mock)
│   │   │       ├── mockAuthService.js  (Dev mock: phone 9876543210 + OTP 123456)
│   │   │       └── tokenStorage.js     (In-memory JWT storage — TODO: expo-secure-store)
│   │   ├── hooks/
│   │   │   └── useLoginForm.js   (form state + validation — NOT USED by any screen)
│   │   ├── utils/
│   │   │   └── validators.js     (validateEmail, validatePassword)
│   │   ├── constants/
│   │   │   ├── colors.js   (COLORS legacy + colors extended — primary: #1A5C4A)
│   │   │   ├── fonts.js    (sizes xs–xxxl, weights, Instrument Serif families)
│   │   │   ├── routes.js   (ROUTES enum: SPLASH, LOGIN, DASHBOARD, etc.)
│   │   │   └── strings.js  (login screen text)
│   │   └── assets/images/  (empty)
│   ├── assets/              (logo.png, icons, splash images)
│   ├── backend/             (Express stubs — ALL TODO)
│   │   ├── controllers/     (authController, therapistController)
│   │   ├── middleware/      (authMiddleware, rateLimiter)
│   │   ├── models/          (TherapistModel, UserModel — schema comments only)
│   │   ├── routes/          (authRoutes, therapistRoutes)
│   │   └── services/        (otpService, therapistService)
│   └── docs/                (dev-log, features, architecture)
└── packages/shared/constants/  ← Planned shared constants (empty)
```

### Navigation Flow

`App.jsx` → `AppNavigator` → `AuthNavigator` (all screens in one flat stack, `headerShown: false`)

```
Splash (2.8s) → Login → ClerkAuth (OTP) → PersonalInfo
                      → TherapistPortal (existing login)
                           → ProfessionalCredentials → GovernmentIDVerification
                           → ProfilePhoto → ScheduleVerificationCall
                           → BookingConfirmed / RegistrationNextStep
                           → PendingVerificationDashboard
Dashboard (empty)
ForgotPassword / Register (stubs)
```

`RootNavigator.jsx` exists but is **not used** — reserved for when real auth state is added.

## graphify — File Discovery

A knowledge graph of this codebase lives in `graphify-out/graph.json` and is rebuilt automatically after every `git commit` via a post-commit hook.

**Rule: Before using Glob, Grep, or any file search tool, query the graph first.**

```bash
/graphify query "<what you are looking for>"
```

Examples:
- Looking for where OTP is handled → `/graphify query "OTP send verify"`
- Looking for navigation setup → `/graphify query "navigator stack screens"`
- Looking for color/theme constants → `/graphify query "colors theme palette"`

Only fall back to Glob/Grep if the graph returns no useful matches or `graphify-out/graph.json` does not exist. If the graph is stale (files changed since last commit), run `/graphify apps/therapist/src apps/therapist/backend --update` to refresh it.

### Rules

1. Always use the existing constants from `src/constants/` (colors, fonts, routes, strings).
2. Do not create new constants unless explicitly allowed.
3. Do not modify existing constants unless explicitly allowed.
4. Do not create new screens unless explicitly allowed.
5. Do not modify existing screens unless explicitly allowed.
6. Do not create new components unless explicitly allowed.
7. Do not modify existing components unless explicitly allowed.
8. Do not create new services unless explicitly allowed.
9. Do not modify existing services unless explicitly allowed.
10. Do not create new hooks unless explicitly allowed.
11. Do not modify existing hooks unless explicitly allowed.
12. Do not create new utils unless explicitly allowed.
13. Do not modify existing utils unless explicitly allowed.
14. Do not create new assets unless explicitly allowed.
15. Do not modify existing assets unless explicitly allowed.
16. Do not create new backend files unless explicitly allowed.
17. Do not modify existing backend files unless explicitly allowed.
18. Do not create new docs files unless explicitly allowed.
19. Do not modify existing docs files unless explicitly allowed.
20. Do not create new packages files unless explicitly allowed.
21. Do not modify existing packages files unless explicitly allowed.
22. Do not create new shared files unless explicitly allowed.
23. Do not modify existing shared files unless explicitly allowed.
24. Do not create new shared files unless explicitly allowed.
25. Do not modify existing shared files unless explicitly allowed.


### Mock Service Pattern

All service calls follow this contract:
```javascript
// Success: { success: true, data: { ... } }
// Error:   { success: false, error: "Human readable message" }
```

Screens mark mock code clearly for backend replacement:
```javascript
// ── MOCK — Backend developer: replace this block only ────────────────────
// TODO: import AuthService and call AuthService.login(email, password)
// ─────────────────────────────────────────────────────────────────────────
```

Dev credentials: phone `9876543210`, OTP `123456`, email `test@mwp.com`, password `password123`.

### Constants & Theming

| File | Purpose |
|------|---------|
| `src/constants/colors.js` | Brand palette — primary `#1A5C4A` (teal). Import `colors` (lowercase). |
| `src/constants/fonts.js` | Font scale (`xs`→`xxxl`) and Instrument Serif families. Import `fonts` and `fontFamilies`. |
| `src/constants/routes.js` | `ROUTES` enum — always use this instead of string literals. |

### Code Conventions

- **File naming:** PascalCase for screens/components, camelCase for services/hooks/utils
- **Navigation:** `navigation.navigate('Name')` to push, `navigation.replace('Name')` to replace without back stack
- **Styles:** `StyleSheet.create()` at the bottom of each file
- Token storage is in-memory only (`src/services/auth/tokenStorage.js`) — needs `expo-secure-store` when going to production

## Current Status

**Done:** All 13 auth/onboarding screens, navigation structure, mock services, constants/theme.

**Not yet implemented:** Real backend (all `backend/` controllers are empty stubs), Dashboard screen, global auth state, secure token storage, Clerk integration, and any testing.
