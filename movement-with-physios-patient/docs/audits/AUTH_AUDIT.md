# MWP Auth Audit — Clerk integration (Read-Only)

**Date:** 2026-05-26
**Output location:** patient repo root (`movement-with-physios-patient/AUTH_AUDIT.md`)
**Apps audited:**
- **Patient** — `movement-with-physios-patient/`
- **Therapist** — `movement-with-physios/apps/therapist/`

> TL;DR: Both apps use **`@clerk/clerk-expo` (Core 2) `2.19.31`**, a **fully custom email-OTP flow** built on `useSignIn`/`useSignUp` (no pre-built Clerk UI, no `appearance`, no OAuth). Setup is structurally identical across the two apps; the only behavioral difference is the patient app **defers session activation** until the end of onboarding, while the therapist app activates immediately.

---

## 1. Clerk package + version

| App | Package | package.json range | Installed (node_modules) | Core |
|---|---|---|---|---|
| Patient | **`@clerk/clerk-expo`** | `^2.19.31` (`package.json:12`) | **`2.19.31`** | **Core 2** |
| Therapist | **`@clerk/clerk-expo`** | `^2.19.31` (`package.json:12`) | **`2.19.31`** | **Core 2** |

**Not** `@clerk/expo` (Core 3). Both apps are on the **Core 2** package (`@clerk/clerk-expo`). `@clerk/expo` is not installed in either app.

---

## 2. ClerkProvider — file path + every prop

Identical prop set in both apps — **exactly two props**: `publishableKey` and `tokenCache`. No `appearance`, no `afterSignOutUrl`, no `__experimental_*`, no `telemetry`, etc.

### Patient — `movement-with-physios-patient/App.jsx:141`
```jsx
<ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
  <ClerkTokenBridge />            // first child
  <GestureHandlerRootView>
    <SafeAreaProvider>
      <AppNavigator />
```
- `publishableKey={CLERK_PUBLISHABLE_KEY}` — `CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (`App.jsx:34`)
- `tokenCache={tokenCache}` — imported from `./src/lib/tokenCache` (`App.jsx:20`)

### Therapist — `movement-with-physios/apps/therapist/App.jsx:82`
```jsx
<ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
  <ClerkTokenBridge />            // first child
  <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
    <AppNavigator />
```
- `publishableKey={CLERK_PUBLISHABLE_KEY}` — `CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (`App.jsx:24`)
- `tokenCache={tokenCache}` — imported from `./src/lib/tokenCache` (`App.jsx:11`)

In both apps a custom **`<ClerkTokenBridge />`** is mounted as the first child inside `<ClerkProvider>` (bridges Clerk → `tokenProvider`/`apiClient`/`chatSocket`).

---

## 3. Auth screens — file paths

### Patient (`src/screens/auth/`)
| File | Role |
|---|---|
| `LoginScreen.jsx` | **Auth entry** — welcome + 2 CTAs → ClerkAuth |
| `ClerkAuthScreen.jsx` | **Clerk email-OTP** (signup/signin) — the actual auth screen |
| `OnboardingCompleteScreen.jsx` | **Deferred session activation** — calls `setActive` at the end of onboarding |
| `PersonalInfoScreen.jsx` | Onboarding (profile collection, not auth) |
| `PainLocationScreen.jsx`, `PainSeverityScreen.jsx`, `PainDurationScreen.jsx`, `TreatmentHistoryScreen.jsx`, `RecoveryGoalsScreen.jsx`, `AvailabilityScreen.jsx` | Onboarding steps (not auth) |

### Therapist (`src/screens/auth/`)
| File | Role |
|---|---|
| `LoginScreen.jsx` | **Auth entry** — welcome + 2 CTAs → ClerkAuth |
| `ClerkAuthScreen.jsx` | **Clerk email-OTP** (signin→signup fallback) — the actual auth screen |
| `TherapistPortalScreen.jsx` | Legacy email/password login form — **dead/GHOST** ("Sign In" only `console.log`; does not call Clerk) |
| `ForgotPasswordScreen.jsx` | Static stub |
| `RegisterScreen.jsx` | Static stub |
| `RegistrationNextStep.jsx` | Post-OTP confirmation → PersonalInfo |
| `PersonalInfoScreen.jsx`, `ProfessionalCredentialsScreen.jsx`, `GovernmentIDVerificationScreen.jsx`, `ProfilePhotoScreen.jsx`, `ScheduleVerificationCallScreen.jsx`, `BookingConfirmedScreen.jsx`, `OnboardingNext.jsx` | Verification onboarding (not auth) |

**Post-auth routing gate (not in `auth/`):** therapist `src/screens/BootstrapScreen.jsx` — decides Dashboard vs PersonalInfo after sign-in.

---

## 4. Which Clerk surface is in use

| Surface | Patient | Therapist |
|---|---|---|
| `<SignIn />` / `<SignUp />` pre-built | ❌ not used | ❌ not used |
| `<AuthView />` (Core 3 native) | ❌ N/A (Core 2) | ❌ N/A (Core 2) |
| **`useSignIn` / `useSignUp` custom flow** | ✅ **in use** (`ClerkAuthScreen.jsx:14`) | ✅ **in use** (`ClerkAuthScreen.jsx:15`) |
| `appearance` prop | ❌ **none set anywhere** | ❌ **none set anywhere** |
| `useOAuth` / `startSSOFlow` / SSO | ❌ none | ❌ none |

**Conclusion:** Both apps drive a **fully custom UI** on the headless Clerk hooks. Other Clerk hooks used: `useAuth` (session gating + `getToken`) and `useClerk` (sign-out). No pre-built Clerk component or `appearance` theming exists in either codebase. The auth UI is hand-built React Native (`TextInput`/`Pressable`) styled with local `colors`/`fonts`.

---

## 5. Full auth flow map (entry → identifier → OTP → post-auth)

Legend: **[Clerk]** = Clerk SDK provides it · **[custom]** = app code.

### Patient
| Step | What happens | Source |
|---|---|---|
| Entry | Splash → `LoginScreen`. CTAs: "Start My Recovery" → `navigate(CLERK_AUTH,{mode:'signup'})` (`LoginScreen.jsx:43`); "Login" → `{mode:'signin'}` (`:48`) | **[custom]** |
| Identifier | `ClerkAuthScreen` email `TextInput` (`:184`); `handleSendOTP` (`:50`) | **[custom]** UI |
| Pre-flight | `POST /auth/email-status {email, expectedRole:'patient'}` — role-conflict gate (`:58`) | **[custom]** backend |
| Send OTP (signup) | `signUp.create({emailAddress})` + `signUp.prepareEmailAddressVerification({strategy:'email_code'})` (`:73-74`) | **[Clerk]** |
| Send OTP (signin) | `signIn.create({identifier})` → find `email_code` factor → `signIn.prepareFirstFactor({strategy:'email_code', emailAddressId})` (`:78-86`) | **[Clerk]** |
| OTP entry | 6-digit `TextInput` (`:207`); `handleVerifyOTP` (`:112`) | **[custom]** UI |
| Verify (signup) | `signUp.attemptEmailAddressVerification({code})` (`:118`); if `missing_requirements` → `signUp.update({firstName,lastName})` + retry (`:122`) | **[Clerk]** |
| Post-auth (signup) | **Session deferred** — stash `global.__pendingClerkSession={setActive,sessionId}` (`:128`) → `navigate(PERSONAL_INFO)` → onboarding steps → `OnboardingCompleteScreen` "Go to Dashboard" calls `setActive({session})` (`OnboardingCompleteScreen.jsx:71`) + `completeOnboarding()` (`:74`) | **[custom]** orchestration + **[Clerk]** `setActive` |
| Verify (signin) | `signIn.attemptFirstFactor({strategy:'email_code', code})` (`:141`) → on complete `setActive({session})` (`:150`) | **[Clerk]** |
| Post-auth routing | `RootNavigator` reads `useAuth().isSignedIn` (`RootNavigator.jsx:11`) → renders `MainNavigator` vs `AuthNavigator` (`:16`). No imperative navigate. | **[Clerk]** state, **[custom]** gate |
| Bridge side-effects | `ClerkTokenBridge` (on `isSignedIn`): `awaitToken` → `POST /auth/me/init {role:'patient'}` → `GET /patient/profile` → `chatSocket.connect()` → `registerPushToken()`; 409 → `clerk.signOut()` | **[custom]** + **[Clerk]** token/signOut |

### Therapist
| Step | What happens | Source |
|---|---|---|
| Entry | Splash (`src/screens/splash/SplashScreen.jsx`) → `LoginScreen`. **Both** CTAs → `navigate('ClerkAuth')` (`LoginScreen.jsx:95,104`) — no mode param (unified flow) | **[custom]** |
| Identifier | `ClerkAuthScreen` single email `TextInput` (`:174`); `handleSendOTP` (`:44`) | **[custom]** UI |
| Pre-flight | `POST /auth/email-status {email, expectedRole:'therapist'}` (`:52`) | **[custom]** backend |
| Send OTP | Try `signIn.create({identifier})` + `prepareFirstFactor` email_code → `flow='signIn'` (`:66-75`). On `form_identifier_not_found` → `signUp.create({emailAddress})` + `prepareEmailAddressVerification` → `flow='signUp'` (`:92-98`). `session_exists`/`already_signed_in` → return (`:83-90`) | **[Clerk]** + **[custom]** branching |
| OTP entry | 6-digit `TextInput` (`:198`); `handleVerifyOTP` (`:111`) | **[custom]** UI |
| Verify | `signIn`: `signIn.attemptFirstFactor({strategy:'email_code',code})` → `setActive({session})` (`:116-123`). `signUp`: `signUp.attemptEmailAddressVerification({code})` → `setActive({session})` (`:128-130`) — **activated immediately** (no deferral) | **[Clerk]** |
| Post-auth routing | `AppNavigator` reads `useAuth().isSignedIn` (`AppNavigator.jsx:29`) → `AppStack` vs `AuthNavigator` (`:53`). `AppStack` opens on `BootstrapScreen` → waits `tokenProvider.isReady()` → routes Dashboard (onboarded) or PersonalInfo (new) | **[Clerk]** state, **[custom]** gate |
| Bridge side-effects | `ClerkTokenBridge` (on `isSignedIn`): resets flags → `awaitToken` → `POST /auth/me/init {role:'therapist'}` (sets `onboardingCompleted` + `isNewSignup`) → `GET /therapists/me/profile` → `chatSocket.connect()` → `setReady(true)` → `registerPushToken()`; 409 → `signOut()` | **[custom]** + **[Clerk]** token/signOut |

**Identifier type:** email address only (`identifier`/`emailAddress`). **OTP strategy:** `email_code` (6-digit). Phone OTP is intentionally avoided (therapist `ClerkAuthScreen.jsx:26`: "Clerk blocks Indian +91 numbers on test plan").

---

## 6. Every `@clerk/*` import (file:line)

### Patient
| File:line | Import |
|---|---|
| `App.jsx:19` | `import { ClerkProvider } from '@clerk/clerk-expo'` |
| `src/lib/ClerkTokenBridge.jsx:3` | `import { useAuth, useClerk } from '@clerk/clerk-expo'` |
| `src/navigation/RootNavigator.jsx:2` | `import { useAuth } from '@clerk/clerk-expo'` |
| `src/screens/auth/ClerkAuthScreen.jsx:14` | `import { useSignIn, useSignUp } from '@clerk/clerk-expo'` |
| `src/screens/main/ProfileScreen.jsx:17` | `import { useClerk } from '@clerk/clerk-expo'` (sign-out) |
| `src/lib/reactDomStub.js:4` | *comment only* — references `@clerk/clerk-expo 2.x` (no import) |

### Therapist
| File:line | Import |
|---|---|
| `App.jsx:10` | `import { ClerkProvider } from '@clerk/clerk-expo'` |
| `src/lib/ClerkTokenBridge.jsx:3` | `import { useAuth, useClerk } from '@clerk/clerk-expo'` |
| `src/navigation/AppNavigator.jsx:4` | `import { useAuth } from '@clerk/clerk-expo'` |
| `src/screens/auth/ClerkAuthScreen.jsx:15` | `import { useSignIn, useSignUp } from '@clerk/clerk-expo'` |
| `src/screens/dashboard/DashboardScreen.jsx:22` | `import { useClerk } from '@clerk/clerk-expo'` (sign-out) |
| `src/lib/reactDomStub.js:3` | *comment only* — references `@clerk/clerk-expo 2.x` (no import) |
| `src/services/AuthService.js:8` | *comment only* — "Screens must never import @clerk/expo directly" (no import) |

Hooks used across both apps: `ClerkProvider`, `useAuth`, `useClerk`, `useSignIn`, `useSignUp`. (No `useUser`, `useOAuth`, `useSSO`, or any Clerk UI component imported.)

---

## 7. iOS bundle ID per app

| App | iOS `bundleIdentifier` | Source | Android `package` |
|---|---|---|---|
| Patient | **`com.mwp.patient`** | `app.json:17` | `com.mwp.patient` (`app.json:27`) |
| Therapist | **`com.mwp.therapist`** | `app.json:12` | `com.mwp.therapist` (`app.json:19`) |

Both `ios/*/Info.plist` set `CFBundleIdentifier` to the build-variable `$(PRODUCT_BUNDLE_IDENTIFIER)` (resolved from the Xcode pbxproj at build time), so **`app.json` is the authoritative source** of the bundle ID.

---

## 8. Env var name holding the Clerk publishable key

**`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`** (both apps).
- Read in `App.jsx` → `const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (patient `:34`, therapist `:24`).
- Defined in each app's `.env` (patient `.env`, therapist `.env`).
- *(Value intentionally not reported. The `EXPO_PUBLIC_` prefix means Expo inlines it into the client bundle — expected for a Clerk publishable key, which is non-secret by design.)*

---

## 9. OAuth providers configured? (Google, Apple)

**None — no OAuth/SSO anywhere in either codebase.**
- No `useOAuth`, no `useSSO`, no `startSSOFlow`/`authenticateWithRedirect`.
- No `oauth_google` / `oauth_apple` strategy references.
- No "Continue with Google/Apple" buttons; no `expo-auth-session`/`expo-web-browser` wiring for SSO.
- The **only** authentication strategy used in code is **email OTP (`email_code`)** via `useSignIn`/`useSignUp`.

*Caveat: which providers are enabled on the Clerk instance is configured in the Clerk Dashboard, not in this repo — but the client code neither initiates nor handles any OAuth/social/Apple flow.*

---

*End of audit. No files were modified.*
