# Architecture Reference — Movement With Physios

> **Quick-reference for AI assistants and developers.** Read this before modifying any code.

## Stack

- **Expo SDK 54** · React Native 0.81.5 · React 19.1.0 · JavaScript (no TypeScript)
- **Navigation:** React Navigation v7 (`@react-navigation/stack`)
- **State:** Component-local `useState` only — no Redux/Zustand/Context
- **Auth:** Clerk planned but **not installed** — all stubs
- **Backend:** Express-style stubs in `backend/` — all TODO

---

## Monorepo Layout

```
movement-with-physios/
├── apps/therapist/           ← Main app
│   ├── App.jsx               ← Entry: loads fonts → renders AppNavigator
│   ├── index.js              ← registerRootComponent
│   ├── app.json              ← Expo config (SDK 54, slug: mwp-therapist)
│   ├── package.json          ← All dependencies
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
│   │   │   └── dashboard/DashboardScreen.jsx  (EMPTY FILE)
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
└── packages/shared/constants/ (empty — planned shared constants)
```

---

## Navigation Map

```
App.jsx → AppNavigator → AuthNavigator (all screens below):

"Splash"              → splash/SplashScreen      (2.8s auto → replace 'Login')
"Login"               → auth/LoginScreen          (Welcome: "Activate" → ClerkAuth, "Login" → TherapistPortal)
"ClerkAuth"           → auth/ClerkAuthScreen       (stub → replace 'PersonalInfo')
"PersonalInfo"        → auth/PersonalInfoScreen    (name → navigate 'OnboardingNext')
"TherapistPortal"     → auth/TherapistPortalScreen (email/pw form, mock login)
"ForgotPassword"      → auth/ForgotPasswordScreen  (stub, goBack)
"Register"            → auth/RegisterScreen        (stub, goBack)
"RegistrationNextStep"→ auth/RegistrationNextStep   (OTP success → navigate 'PersonalInfo')
"OnboardingNext"      → auth/OnboardingNext         (placeholder, goBack)
```

---

## Service Return Contract

All services follow this shape:
```javascript
// Success: { success: true, data: { ... } }
// Failure: { success: false, error: "Human readable message" }
```

---

## Key Conventions

| Convention | Detail |
|---|---|
| File naming | PascalCase for components/screens, camelCase for services/hooks/utils |
| Colors | Import from `src/constants/colors.js` — use `colors` (not `COLORS`) |
| Fonts | Import `fonts` for sizes/weights, `fontFamilies` for font names |
| Styling | `StyleSheet.create()` at bottom of file |
| Navigation | `navigation.navigate('Name')` to push, `navigation.replace('Name')` for no-back |
| Mock markers | `// TODO:` and `[MOCK]` console.log indicate stub code to replace |

---

## Current State (as of 2026-03-08)

- **Frontend UI:** Complete onboarding flow (Splash → Welcome → Auth → PersonalInfo)
- **Backend:** Zero implementation — all controller/service functions are empty
- **Auth:** No Clerk, no real login — all simulated
- **Dashboard:** Empty file — not built
- **Unused code:** `AppButton`, `InputField`, `useLoginForm`, `RootNavigator`, `screens/SplashScreen.jsx` (legacy)
- **Missing deps:** `@clerk/expo`, `expo-secure-store`, `expo-web-browser`, `expo-auth-session`
- **No devDeps:** No ESLint, Prettier, Jest, or TypeScript
