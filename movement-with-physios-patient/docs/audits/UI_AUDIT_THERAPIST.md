# MWP Therapist App — UI Audit (Read-Only)

**Date:** 2026-05-26
**Scope:** Every screen file in the MWP therapist app.
**App root:** `/Users/gouravshokeen/Downloads/backend-repo/movement-with-physios/apps/therapist`

## Routing convention (investigated & confirmed)

Not Expo Router. **React Navigation v7** (`@react-navigation/native-stack` + `@react-navigation/stack`). No top-level `app/` directory. Screens live under **`src/screens/`**:

```
src/screens/auth/        (12 files — Clerk auth + verification onboarding)
src/screens/AssignFlow/  (3 files — exercise-assignment wizard, .js)
src/screens/bookings/    (3 files)
src/screens/dashboard/   (3 files)
src/screens/exercises/   (2 files)
src/screens/messages/    (2 files)
src/screens/splash/      (1 file — active)
src/screens/SplashScreen.jsx   (1 file — legacy root-level, DEAD/unused)
src/screens/BootstrapScreen.jsx (1 file — post-auth routing gate)
src/screens/video/       (3 files)
```

**32 screen files total.** Note: the repo `CLAUDE.md` is **significantly stale** — it predates the bookings / proposals / video / chat / real-dashboard work and describes `DashboardScreen.jsx` as an "EMPTY FILE" (it is now a 560-line backend-wired home). Findings below come from the actual current code.

### Service → endpoint reference (all prefixed `/api/v1`)

| Service fn | File | Endpoint |
|---|---|---|
| `listBookings` | `src/services/bookingService.js` | GET `/bookings` |
| `getBooking` | `src/services/bookingService.js` | GET `/bookings/:id` |
| `acceptInstant` | `src/services/bookingService.js` | POST `/bookings/:id/accept` |
| `declineInstant` | `src/services/bookingService.js` | POST `/bookings/:id/decline` |
| `cancelBooking` | `src/services/bookingService.js` | PATCH `/bookings/:id/cancel` |
| `createProposal` | `src/services/proposalService.js` | POST `/bookings/proposals` (Idempotency-Key) |
| `listProposals` | `src/services/proposalService.js` | GET `/bookings/proposals` |
| `cancelProposal` | `src/services/proposalService.js` | DELETE `/bookings/proposals/:id` |
| `getConversations` | `src/services/chatService.js` | GET `/chat/rooms` |
| `getMessages` | `src/services/chatService.js` | GET `/chat/rooms/:id/messages` |
| `sendMessage` | `src/services/chatService.js` | POST `/chat/rooms/:id/messages` (TEXT ONLY) |
| `markAsRead` | `src/services/chatService.js` | POST `/chat/rooms/:id/read` (+ socket `mark_read`) |
| `createRoomWithPatient` | `src/services/chatService.js` | POST `/chat/rooms` |
| `listMyClients` | `src/services/chatService.js` | GET `/therapists/me/clients` |
| `subscribeToRoom` / `setTyping` | `src/services/chatService.js` | socket only (`/chat` namespace) |
| `getCall` | `src/services/videoCallService.js` | GET `/video/calls/:id` |
| `joinCall` | `src/services/videoCallService.js` | POST `/video/calls/:id/join` |
| `leaveCall` | `src/services/videoCallService.js` | POST `/video/calls/:id/leave` |
| `getIceConfig` | `src/services/videoCallService.js` | GET `/video/ice-config` |
| `getAssessment` | `src/services/assessmentService.js` | GET `/assessments/:id` |
| `respond` | `src/services/assessmentService.js` | POST `/assessments/:id/respond` |
| `complete` | `src/services/assessmentService.js` | PATCH `/assessments/:id/complete` |
| `getPdf` | `src/services/assessmentService.js` | GET `/assessments/:id/pdf` |
| `toggleAvailability` | `src/services/availabilityService.js` | PATCH `/therapists/me/instant-availability` |
| `registerPushToken` / `clearPushToken` | `src/services/notificationService.js` | PATCH `/users/me/fcm-token` |
| `login` / `forgotPassword` / `register` | `src/services/auth/AuthService.js` | **MOCK** (`setTimeout`, no backend) |
| `sendOtp`/`verifyOtp`/`signOut`/… | `src/services/AuthService.js` | **STUBS** (console.warn / return false/null) |
| `sendOTP` / `verifyOTP` | `src/services/auth/OtpService.js`, `auth/mockAuthService.js` | **MOCK** (`[MOCK]` logs, OTP `123456`) |

Additional **REAL** endpoints discovered in screens (not in a service file): `POST /auth/email-status`, `POST /auth/me/init` (ClerkAuth/PersonalInfo/Bootstrap), `GET /therapists/me/profile`, `GET /therapists/me/dashboard` (DashboardScreen).

---

# `src/screens/auth/` — Clerk auth + onboarding

## LoginScreen
**Path:** `…/src/screens/auth/LoginScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn | Backend endpoint | Data source |
|---|---|---|---|---|
| "Activate My Clinic" (primary) | inline `navigation.navigate('ClerkAuth')` | none | none | n/a |
| "Login" (outline) | inline `navigation.navigate('ClerkAuth')` | none | none | n/a |

`FEATURES` is a hardcoded constant array (non-interactive rows).

### States
- **Loading:** none · **Empty:** none · **Error:** none

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

## ClerkAuthScreen
**Path:** `…/src/screens/auth/ClerkAuthScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| Email TextInput | `setEmail` | none | none | local state |
| "Send Code →" (Pressable) | `handleSendOTP` | `apiClient.post` pre-flight + Clerk `signIn.create`/`prepareFirstFactor` (fallback `signUp.create`) | POST `/api/v1/auth/email-status` + Clerk SDK | REAL + Clerk SDK |
| 6-digit code TextInput | `setOtp` | none | none | local state |
| "Verify & Continue" (Pressable) | `handleVerifyOTP` | Clerk `attemptFirstFactor`/`attemptEmailAddressVerification` + `setActive` | none (Clerk SDK; routing via AppNavigator) | Clerk SDK |
| "← Change email" (Pressable) | inline `() => { setStep('email'); setOtp(''); }` | none | none | local reset |

### States
- **Loading:** present — `loading` swaps `ActivityIndicator` into both buttons + `btnDisabled`
- **Empty:** n/a
- **Error:** **Alert.alert** only (wrong-app conflict L57, sign-up error L100, generic L103, incomplete status L125/134, invalid code L138). `session_exists` branch silently returns (L89).

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

## PersonalInfoScreen
**Path:** `…/src/screens/auth/PersonalInfoScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| Back arrow (conditional on `canGoBack()`) | inline `navigation.goBack()` | none | none | n/a |
| Full Name TextInput | inline `val => { setFullName(val); setErrorMessage(''); }` | none | none | local state |
| Full Name `onSubmitEditing` | `handleContinue` | `apiClient.post` (fire-and-forget) + `tokenProvider.setOnboardingCompleted` | POST `/api/v1/auth/me/init` | REAL |
| "Continue" (TouchableOpacity) | `handleContinue` | `apiClient.post` + `tokenProvider.setOnboardingCompleted` | POST `/api/v1/auth/me/init` | REAL |

**Stale comments:** header (L5, L52–56) still calls `handleContinue` a "MOCK HANDLER" to wire to `TherapistService`, but the body is now a REAL `apiClient.post('/auth/me/init')`. The call is fire-and-forget inside an IIFE (L72) with no error handling; navigation to `ProfessionalCredentials` fires regardless of success/failure.

### States
- **Loading:** absent — init call not awaited, no spinner; Continue disabled only by empty-name check
- **Empty:** n/a
- **Error:** inline **error banner** for client-side name validation only (L176–185). No Alert. Backend `/auth/me/init` failure is unhandled.

### TODO/FIXME/XXX
none (header has "Backend developer: wire up…"/"MOCK HANDLER" prose at L5, L53–56 — no literal token)

### Diagnostic console.log
none

---

## TherapistPortalScreen
**Path:** `…/src/screens/auth/TherapistPortalScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn | Backend endpoint | Data source |
|---|---|---|---|---|
| Email TextInput | `setEmail` | none | none | local state |
| Password TextInput | `setPassword` | none | none | local state |
| Eye toggle (`eye-outline`/`eye-off-outline`) | inline `() => setShowPassword(!showPassword)` | none | none | local state |
| "Forgot Password?" | inline `navigation.navigate('ForgotPassword')` | none | none | n/a |
| "Sign In" (TouchableOpacity) | `handleSignIn` → **GHOST** (only `console.log` + TODO comments; no action, no navigation) | none | none | n/a (no-op) |

### States
- **Loading:** absent · **Empty:** n/a · **Error:** absent (TODO at L34 says "on failure → show error message" — nothing implemented)

### TODO/FIXME/XXX
- `TherapistPortalScreen.jsx:32` — `// TODO: import AuthService and call AuthService.login(email, password)`
- `TherapistPortalScreen.jsx:33` — `// TODO: on success → navigate to Dashboard`
- `TherapistPortalScreen.jsx:34` — `// TODO: on failure → show error message`

### Diagnostic console.log
- `TherapistPortalScreen.jsx:31` — `console.log('[MOCK] Sign In — Email:', email);`

---

## ForgotPasswordScreen
**Path:** `…/src/screens/auth/ForgotPasswordScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn | Backend endpoint | Data source |
|---|---|---|---|---|
| "← Back to Login" | inline `navigation.goBack()` | none | none | n/a |

Pure static stub ("This screen will be implemented by the backend developer.").

### States
- **Loading:** none · **Empty:** none · **Error:** none

### TODO/FIXME/XXX
none (L5 "Stub screen — UI placeholder only" — no literal token)

### Diagnostic console.log
none

---

## RegisterScreen
**Path:** `…/src/screens/auth/RegisterScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn | Backend endpoint | Data source |
|---|---|---|---|---|
| "← Back to Login" | inline `navigation.goBack()` | none | none | n/a |

Pure static stub ("This screen will be built in the next sprint.").

### States
- **Loading:** none · **Empty:** none · **Error:** none

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

## RegistrationNextStep
**Path:** `…/src/screens/auth/RegistrationNextStep.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn | Backend endpoint | Data source |
|---|---|---|---|---|
| "Continue" (TouchableOpacity) | inline `navigation.navigate('PersonalInfo')` | none | none | n/a |

Static confirmation screen.

### States
- **Loading:** none · **Empty:** none · **Error:** none

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

## OnboardingNext
**Path:** `…/src/screens/auth/OnboardingNext.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn | Backend endpoint | Data source |
|---|---|---|---|---|
| Back arrow (`arrow-back`) | inline `navigation.goBack()` | none | none | n/a |

Static "This step is coming soon." placeholder.

### States
- **Loading:** none · **Empty:** none · **Error:** none

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

## ProfessionalCredentialsScreen
**Path:** `…/src/screens/auth/ProfessionalCredentialsScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn | Backend endpoint | Data source |
|---|---|---|---|---|
| Back arrow (`arrow-back`, L106) | `navigation.goBack()` | none | none | n/a |
| Degree/Qualification TextInput (L142) | `setDegree` + clear error; `onSubmitEditing`→focus license | none | none | local state |
| License Number TextInput (L159) | `setLicense`; `onSubmitEditing`→focus years | none | none | local state |
| Years of Experience TextInput (numeric, L177) | `setYearsExp`; `onSubmitEditing`→focus specialization | none | none | local state |
| Specialization TextInput (L195) | `setSpecial`; `onSubmitEditing`→`handleContinue` | none | none | local state |
| "Continue" (TouchableOpacity, L212) | `handleContinue` (L76) — validates, `console.log('[MOCK]…')`, then `navigation.navigate('GovernmentIDVerification')`. **Persists nothing.** | none | none | local state → nav-only (degree/license/years/specialization discarded) |

### States
- **Loading:** absent · **Empty:** n/a · **Error:** inline field validation (red `errorText` under each input, L154/172/190/207). No banner, no Alert.

### TODO/FIXME/XXX
- `ProfessionalCredentialsScreen.jsx:85` — `// TODO: await TherapistService.saveCredentials(payload);`

### Diagnostic console.log
- `ProfessionalCredentialsScreen.jsx:84` — `console.log('[MOCK] Professional credentials saved:', payload);`

---

## GovernmentIDVerificationScreen
**Path:** `…/src/screens/auth/GovernmentIDVerificationScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| Back arrow (`arrow-back`, L208) | `navigation.goBack()` | none | none | n/a |
| "ID Type" selector row (L237) | `setDropdownOpen(true)` | none | none | local state |
| ID type option rows in modal (L362) | `setIdType(item)` + reset images + close | none | none | **HARDCODED** `INDIA_ID_TYPES` (L43–49) |
| Modal overlay (tap dismiss, L350) | `setDropdownOpen(false)` | none | none | local |
| Front "Upload"/"Change" (L274) | `pickImage('front')` (L89) | `ImagePicker` (expo-image-picker) | device, no backend | device → local state (`frontImage`) |
| Back "Upload"/"Change" (L306) | `pickImage('back')` (L89) | `ImagePicker` | device, no backend | device → local state (`backImage`) |
| "Continue" (L330) | `handleContinue` (L168) — validates, `console.log('[MOCK]…')`, then `navigation.navigate('ProfilePhoto')`. **Persists nothing; images never uploaded.** | none | none | local → nav-only |

### States
- **Loading:** per-action — `uploadingFront`/`uploadingBack` spinners in upload buttons (L279/311)
- **Empty:** conditional reveal — upload rows hidden until ID type chosen; placeholder hint when no image (L262/294)
- **Error:** two channels — inline field validation (L251/287/319) + **Alert.alert** for permission denied (L93), invalid type (L120), >5MB (L130), generic picker fail (L148)

### TODO/FIXME/XXX
- `GovernmentIDVerificationScreen.jsx:177` — `// TODO: await TherapistService.saveGovID(payload);`

### Diagnostic console.log
- `GovernmentIDVerificationScreen.jsx:176` — `console.log('[MOCK] Government ID saved:', payload);`

---

## ProfilePhotoScreen
**Path:** `…/src/screens/auth/ProfilePhotoScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn | Backend endpoint | Data source |
|---|---|---|---|---|
| Back arrow (`arrow-back`, L125) | `navigation.goBack()` | none | none | n/a |
| Photo box (tappable, L151) | `pickPhoto` (L58) | `ImagePicker` (expo-image-picker) | device, no backend | device → local state (`photo`) |
| "Upload Photo"/"Change Photo" (L170) | `pickPhoto` (L58) | `ImagePicker` | device, no backend | device → local state |
| "Continue" (L188) | `handleContinue` (L101) — `console.log('[MOCK]…')` + `navigation.navigate(NEXT_SCREEN)`. **Photo URI never uploaded.** | none | none | local → nav-only |
| "Skip for now" (L197) | `handleSkip` (L109) — `console.log('[MOCK]…')` + navigate | none | none | nav-only |

### States
- **Loading:** per-action — `uploading` spinners in photo box (L157) + upload button (L176)
- **Empty:** photo box "No photo" placeholder when nothing picked (L162)
- **Error:** **Alert.alert** for permission denied (L61), >8MB (L84), generic fail (L94). No inline banner.

### TODO/FIXME/XXX
- `ProfilePhotoScreen.jsx:104` — `// TODO: await TherapistService.saveProfilePhoto({ uri: photo.uri });`

### Diagnostic console.log
- `ProfilePhotoScreen.jsx:103` — `console.log('[MOCK] Profile photo saved:', photo.uri);`
- `ProfilePhotoScreen.jsx:110` — `console.log('[MOCK] Profile photo skipped.');`

---

## ScheduleVerificationCallScreen
**Path:** `…/src/screens/auth/ScheduleVerificationCallScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn | Backend endpoint | Data source |
|---|---|---|---|---|
| Back arrow (`arrow-back`, L110) | `navigation.goBack()` | none | none | n/a |
| Date tiles ×5 weekdays (L144) | `setSelectedKey(day.key)` | none | none | locally computed `getNextWeekdays(5)` (L40); DAY_NAMES/MONTH_NAMES HARDCODED (L33–34). No time-slot picker (date only). |
| "Confirm Booking" (L176) | `handleConfirm` (L85) — `console.log('[MOCK]…')` + `navigation.navigate('BookingConfirmed', { selectedDate })`. **Not persisted.** | none | none | local → nav-only |

### States
- **Loading:** absent · **Empty:** prompt-only ("Tap a date to select" L170) · **Error:** absent (Confirm disabled until date chosen)

### TODO/FIXME/XXX
- `ScheduleVerificationCallScreen.jsx:89` — `// TODO: await TherapistService.scheduleVerificationCall({ date: selected.key });`

### Diagnostic console.log
- `ScheduleVerificationCallScreen.jsx:88` — `console.log('[MOCK] Verification call scheduled for:', selected.key);`

---

## BookingConfirmedScreen (auth)
**Path:** `…/src/screens/auth/BookingConfirmedScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn | Backend endpoint | Data source |
|---|---|---|---|---|
| (none — auto-advance) | `useEffect` timer (L57) → `navigation.replace('PendingVerificationDashboard')` after 3000ms | none | none | `route.params.selectedDate` (display only) |

### States
- **Loading:** animated progress bar (auto-advance timer, "Taking you to next step…")
- **Empty:** date pill rendered only if `selectedDate` param exists (L87)
- **Error:** none

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

# `src/screens/splash/`, root splash, Bootstrap

## SplashScreen (active)
**Path:** `…/src/screens/splash/SplashScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn | Backend endpoint | Data source |
|---|---|---|---|---|
| (none — animated splash) | mount: 2800ms timer → `navigation.replace('Login')` (L73). `DEV_BYPASS` const (L27, currently `false`) would replace→`Dashboard` (L39). | none | none | n/a |

### States
- **Loading:** splash `ActivityIndicator` fades in after logo (L103) · **Empty:** n/a · **Error:** none

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

## SplashScreen (legacy root-level — DEAD/UNUSED)
**Path:** `…/src/screens/SplashScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn | Backend endpoint | Data source |
|---|---|---|---|---|
| (none) | mount: 2000ms timer → `navigation.replace(ROUTES.LOGIN)` (L12) | none | none | n/a |

**Dead code** — `CLAUDE.md` confirms "legacy, unused by navigator"; active splash is `splash/SplashScreen.jsx`. Static "Therapist App – Installed" copy.

### States
- **Loading:** none · **Empty:** n/a · **Error:** none

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

## BootstrapScreen
**Path:** `…/src/screens/BootstrapScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn | Backend endpoint | Data source |
|---|---|---|---|---|
| (none — routing gate / full-screen loader) | waits for `tokenProvider.isReady()`, then `decideRoute()` → `navigation.replace(...)` | none directly | (reads tokenProvider state hydrated from `POST /auth/me/init`) | REAL (in-memory flags) |

`decideRoute()` (L28–35): onboarding completed → `Dashboard`; new signup → `PersonalInfo`; else → `Dashboard`.

### States
- **Loading:** present — renders only `ActivityIndicator` (L71) until tokenProvider ready
- **Empty:** n/a
- **Error:** none — no fallback if tokenProvider never becomes ready (would spin indefinitely)

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

# `src/screens/dashboard/`

## DashboardScreen
**Path:** `…/src/screens/dashboard/DashboardScreen.jsx`

> Fully built backend-wired home (560 lines). `CLAUDE.md`'s "EMPTY FILE" note is stale.

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| Notifications bell + red dot (L175) | **GHOST** — `TouchableOpacity`, no `onPress` | none | none | n/a (static red dot, not data-driven) |
| Logout (`log-out-outline`, L180) | `handleLogout` (L104) | `clearPushToken` (notificationService.js) + Clerk `signOut()` | PATCH `/users/me/fcm-token` (fire-and-forget) | REAL |
| Search "Search clients..." (L192) | `setSearchText` | none | none | **dead** — `searchText` never read/filtered anywhere |
| Availability Switch "Available for instant calls" (L207) | `handleToggleAvailability` (L121) | `toggleAvailability` (availabilityService.js) | PATCH `/therapists/me/instant-availability` | REAL (optimistic, reverts on failure) |
| Stats cards ×4 (L251) | none (plain `View`) | dashboard fetch | GET `/therapists/me/dashboard` | REAL (Active Clients, Completed Sessions, Rating); **Avg Adherence hardcoded `'—'`** (L234) |
| "View All" — Today's Appointments (L267) | **GHOST** — `TouchableOpacity`, no `onPress` | none | none | n/a |
| Appointment rows (L291) | none (plain `View`) | dashboard fetch | GET `/therapists/me/dashboard` (`upcomingBookings`) | REAL |
| "Add New Appointment" (L311) | **GHOST** — `TouchableOpacity`, no `onPress` | none | none | n/a |
| "View All" — Recent Activity (L320) | **GHOST** — `TouchableOpacity`, no `onPress` | none | none | n/a |
| BottomTabBar: Home/Clients/Messages/Calendar/Exercises | `handleTabPress(id)` (L138) | none | none | nav-only (→ CLIENTS/MESSAGES/BOOKINGS/EXERCISES; Home no-op) |

Mount + focus fetch (L78): `apiClient.get('/therapists/me/profile')` + `apiClient.get('/therapists/me/dashboard')` in parallel.

### States
- **Loading:** appointments card "Loading…" row while `loading`; stats show `'—'` until data populates. No top-level spinner.
- **Empty:** appointments "No upcoming appointments" (L285); Recent Activity always static "No recent activity yet" (L328) — no activity endpoint.
- **Error:** **none** — fetch has no try/catch (a rejected promise leaves `loading` stuck true). Availability toggle failure silent (`console.warn` + revert, L130).

### TODO/FIXME/XXX
none (header L6 "replace MOCK_* constants" is stale — no MOCK_* remain)

### Diagnostic console.log
- `DashboardScreen.jsx:117` — `console.warn('[Dashboard] sign-out failed:', err);`
- `DashboardScreen.jsx:130` — `console.warn('[Dashboard] availability toggle failed:', resp.error);`

---

## PendingVerificationDashboard
**Path:** `…/src/screens/dashboard/PendingVerificationDashboard.jsx`

> Static verification-waiting screen — NOT the real home (that's DashboardScreen).

### Interactive elements
| Visible label / icon | Handler fn | Service fn | Backend endpoint | Data source |
|---|---|---|---|---|
| "Contact Support" (outline, L163) | **GHOST** — no `onPress` | none | none | n/a |
| "[DEV] Go to Full Dashboard" (L170) | inline `() => navigation.replace('Dashboard')` | none | none | nav-only (DEV-only, flagged for removal) |

All content hardcoded: `STEPS` (L22–29, hardcoded `done` booleans), `LOCKED_STATS` (L32–37, all `'—'`), "What happens next?" list (L147–152). Copy bug at L149 ("credentials and credentials").

### States
- **Loading:** none (static) · **Empty:** n/a · **Error:** none

### TODO/FIXME/XXX
- `PendingVerificationDashboard.jsx:169` — `{/* TODO: Remove this button and route via real auth state */}`

### Diagnostic console.log
none

---

## AllClientsScreen
**Path:** `…/src/screens/dashboard/AllClientsScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| Back (`arrow-back`, L128) | inline `navigation.goBack()` | none | none | n/a |
| Search "Search by name or condition..." (L143) | `setSearchText` | none (client-side filter) | none | filters `clients` by **name only** (L104); "condition" never filtered |
| "Filter" (`options-outline`, L151) | **GHOST** — `TouchableOpacity`, no `onPress` | none | none | n/a |
| Client card rows (L184) | **GHOST** — `TouchableOpacity`, no `onPress` (no detail navigation) | clients fetch | GET `/therapists/me/clients` | REAL data; card tap is GHOST |
| BottomTabBar: Home/Clients/Messages/Calendar/Exercises | `handleTabPress(id)` (L111) | none | none | nav-only |

Mount + focus fetch (L79): `apiClient.get('/therapists/me/clients', { limit:50, includeAll:true })`. **`normalizeClient` (L50–64) fabricates per-client fields**: `status: 'Good'` (hardcoded — every client shows a blue "Good" badge), `age:null`, `condition:''`, `adherence:0`, `pain:0`, `days:0`, `lastSession:'—'`. Only `id` + `name` are real.

### States
- **Loading:** centered `ActivityIndicator` (L168) + "Loading…" subtitle (L134)
- **Empty:** "No clients yet" + "Patients who book sessions with you will show up here." (L172)
- **Error:** inline (no Alert) — on failure swaps empty region to "Could not load clients" + error string (L174)

### TODO/FIXME/XXX
none (header L4 "replace MOCK_CLIENTS" is stale — no MOCK_CLIENTS remain)

### Diagnostic console.log
none

---

# `src/screens/bookings/`

## BookingsScreen
**Path:** `…/src/screens/bookings/BookingsScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| "+" propose (header `add`, L234) | inline `navigation.navigate(PROPOSE_SESSION)` | none | none | nav-only |
| "Upcoming" tab (L249) | inline `setTab('upcoming')` + reload | `listBookings` | GET `/bookings` | REAL |
| "Past" tab (L249) | inline `setTab('past')` + reload | `listBookings` | GET `/bookings` | REAL |
| Booking row (`BookingRow`, L325) | `openBooking(b)` (L213) → navigate BOOKING_DETAIL | none | none | nav-only |
| "Join" pill (green, when `isVideo && canJoin`, L120) | `openBooking(b, {joinNow})` → navigate PRE_CALL_LOBBY with `booking.videoCallId` | none (does NOT call getCall) | none | nav-only; `canJoin` trusted from list payload |
| Proposal row (`ProposalRow`, L277) | `setDetailSheet({open:true, proposal})` | none (opens sheet) | none | REAL data |
| Pull-to-refresh (`RefreshControl`, L315) | inline `setRefreshing(true); load()` | `listBookings` | GET `/bookings` | REAL |
| ProposalDetailSheet `onClose` (L337) | inline reset | none | none | local |
| ProposalDetailSheet "Cancel proposal" (in sheet) | `handleCancel`→`cancelProposal` | `cancelProposal` (proposalService.js) | DELETE `/bookings/proposals/:id` | REAL |
| BottomTabBar tabs | `onTabPress` (L205) | none | none | nav-only |

Loads: bookings via `listBookings({limit:50})` on mount + focus; proposals via `listProposals` (useFocusEffect).

### States
- **Loading:** `loading` true on mount + each tab switch → centered `ActivityIndicator` (L294)
- **Empty:** "No upcoming sessions." / "No past sessions." (L302); proposals section hidden entirely when empty (L263)
- **Error:** inline (no Alert), two channels — bookings red `errorText` (L298); `proposalsError` inline `errorBanner` (L287)

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

## BookingDetailScreen
**Path:** `…/src/screens/bookings/BookingDetailScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| Back chevron (L186) / error-state "Back" (L165) | inline `navigation.goBack()` | none | none | n/a |
| "Accept" (instant_pending) | `handleAccept` (L101) | `acceptInstant` (bookingService.js) | POST `/bookings/:id/accept` | REAL |
| "Decline" (instant_pending) | `handleDecline` (L114) | `declineInstant` (bookingService.js) | POST `/bookings/:id/decline` | REAL |
| "Join Call" (`videocam`, video + canJoin) | `handleJoinCall` (L142) → navigate PRE_CALL_LOBBY | none | none | nav-only |
| "View Assessment PDF" (`document-text-outline`) | `handleViewPdf` (L147) → `Linking.openURL(pdfUrl)` | `getPdf` (assessmentService.js) — URL pre-fetched in `load` | GET `/assessments/:id/pdf` | REAL |
| "Cancel booking" (danger) | `handleCancel` → Alert confirm → `cancelBooking` (L126) | `cancelBooking` (bookingService.js) | PATCH `/bookings/:id/cancel` | REAL |

Mount `load` (L66): `getBooking` → then `getCall` if `videoCallId` (derives `canJoin`, L81) → then `getPdf` if assessment completed.

### States
- **Loading:** full-screen `ActivityIndicator` early-return (L151)
- **Empty:** none distinct — `!booking` falls into error branch "Booking not found" (L160)
- **Error:** both patterns — load failure → full-screen inline `errorText` + Back (L160); action failures (accept/decline/cancel) → **Alert.alert** (L110/122/135); accept success also Alert (L107)

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

## ProposeSessionScreen
**Path:** `…/src/screens/bookings/ProposeSessionScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| Back arrow (L126) | inline `navigation.goBack()` | none | none | n/a |
| "Choose a patient" field (L156) | inline `setShowPatientSheet(true)` | none (opens sheet) | none | local |
| "Change" (when patient selected, L149) | `handleClear` → `setPatient(null)` | none | none | local |
| Patient picker row (`PatientPickerSheet` onSelect) | inline `setPatient(p)`; sheet fetch → `listMyClients({includeAll:false})` | `chatService.listMyClients` (chatService.js) | GET `/therapists/me/clients` | REAL |
| PatientPickerSheet `onClose` (backdrop) | inline `setShowPatientSheet(false)` | none | none | local |
| "Select date" field (L171) | inline `setShowCalendar(true)` | none (opens CalendarPicker) | none | local |
| Calendar day cell (`CalendarPicker` onSelect) | inline `setDate(d); setTime(null)` | none (pure controlled input; past days blocked) | none | local |
| Calendar prev/next month | `prevMonth`/`nextMonth` | none | none | local |
| Calendar close/backdrop | `onClose` → `setShowCalendar(false)` | none | none | local |
| Time hour pills (`TimePillPicker`) | `onChange` → `setTime` | none (pure controlled input) | none | local |
| Time minute pills (`TimePillPicker`) | `onChange` → `setTime` | none (pure controlled input) | none | local |
| Meeting-type toggle "Video"/"In-person" (L210) | inline `setMeetingType(opt.value)` | none | none | local |
| Notes TextInput (multiline, max 500) | `onChangeText` → `setNotes` | none | none | local |
| "Cancel" (bottom bar, L257) | inline `navigation.goBack()` | none | none | nav-only |
| "Send proposal" / "Sending..." (L88) | `handleSubmit` (disabled unless `canSubmit && !submitting`) | `createProposal` (proposalService.js) | POST `/bookings/proposals` | REAL |

`handleSubmit` (L95) hardcodes `durationMinutes: 60` + `timezone: 'Asia/Kolkata'` (no duration toggle, no tz selector UI). Comment (L7) notes therapist apiClient lacks Idempotency-Key; double-tap guard is the UI `submitting` lock only.

### States
- **Loading:** submit-in-flight → "Sending..." + disabled; PatientPickerSheet has own client-fetch spinner
- **Empty:** PatientPickerSheet "No patients yet…" empty state; time field hint "Select a date first"
- **Error:** inline only (no Alert) — `errorMessage` → `errorBanner` via `friendlyError()` typed-code mapping (L56); PatientPickerSheet own inline `errorText`

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

# `src/screens/exercises/`

## ExerciseLibraryScreen
**Path:** `…/src/screens/exercises/ExerciseLibraryScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn | Backend endpoint | Data source |
|---|---|---|---|---|
| Back (`arrow-back`, L183) | `navigation.goBack()` | none | none | n/a |
| Assign/Select button (L190) | `handleAssignPress` (L142) → navigate ASSIGN_FLOW/SELECT_CLIENT with selected exercises | none | none | **MOCK/HARDCODED** `MOCK_EXERCISES` (L26–99) |
| Search "Search Exercise" (L210) | `setSearchText` (local filter) | none | none | **MOCK/HARDCODED** (filters `MOCK_EXERCISES`) |
| "Filter" (`options-outline`, L218) | **GHOST** — no `onPress` | none | none | n/a |
| Category filter chips (L234) | `setActiveFilter(cat)` (local) | none | none | **MOCK/HARDCODED** (`categories` from `MOCK_EXERCISES`) |
| Exercise card rows (L258) | `toggleExercise(id)` (local selection) | none | none | **MOCK/HARDCODED** `MOCK_EXERCISES` |
| BottomTabBar (home/clients/messages/calendar) | `handleTabPress` (L166) | none | none | nav-only |

### States
- **Loading:** absent (synchronous in-file array; entrance animation only)
- **Empty:** absent — empty filter renders nothing (no empty-state branch)
- **Error:** none

### TODO/FIXME/XXX
none (L4 "Backend dev: replace MOCK_EXERCISES…" and L25 "Mock data — replace with API calls" are comments — no literal TODO token, but explicit MOCK markers)

### Diagnostic console.log
none

---

## ExerciseDetailScreen
**Path:** `…/src/screens/exercises/ExerciseDetailScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn | Backend endpoint | Data source |
|---|---|---|---|---|
| Back (`arrow-back`, L96) | `navigation.goBack()` | none | none | n/a |

Read-only detail view. Data from `route.params.exercise` with **HARDCODED** fallback object (L39–49), hardcoded `description` (L176) + `Tips` array (L192). All other content non-interactive display.

### States
- **Loading:** absent (prop-driven; entrance animations only)
- **Empty:** partial — falls back to default object + `?? '—'` field defaults
- **Error:** none

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

# `src/screens/messages/`

## MessagesScreen
**Path:** `…/src/screens/messages/MessagesScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| Back (`arrow-back`, L117) | `navigation.goBack()` | none | none | n/a |
| New chat (`add`, L122) | `openNewChat` (L80) | `chatService.listMyClients` | GET `/therapists/me/clients` | REAL |
| Search "Search conversations..." (L131) | `setSearchText` (local filter) | none | none | local filter over REAL `conversations` |
| Conversation row (L159) | inline `navigation.navigate(CHAT, { conv })` | none (list from `getConversations`) | GET `/chat/rooms` | REAL |
| New-chat modal backdrop (L203) | `setNewChatOpen(false)` | none | none | n/a |
| Client row in modal (L220) | `startChatWithClient(item)` (L90) | `chatService.createRoomWithPatient` → navigate CHAT | POST `/chat/rooms` | REAL |
| BottomTabBar (home/clients/exercise/calendar) | `handleTabPress` (L105) | none | none | nav-only |

### States
- **Loading:** `loading` true initially → `ActivityIndicator` (L142); modal own `clientsLoading` spinner
- **Empty:** conversations 💬 "No conversations yet" (L152); modal "No clients yet…" (L211)
- **Error:** **Alert.alert** only — "Could not load clients" (L85), "Could not start chat" (L94). `getConversations` failure **silently swallowed** (L47) → shows empty state, no error

### TODO/FIXME/XXX
none (L4 "replace MOCK_CONVERSATIONS" is stale — none exists)

### Diagnostic console.log
none

---

## ChatScreen
**Path:** `…/src/screens/messages/ChatScreen.jsx`

> Rich chat UI; backend `sendMessage` is **TEXT ONLY**. Many rich features are UI-only.

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| Back (`arrow-back`, L428) | `navigation.goBack()` | none | none | n/a |
| (load history on mount) | useEffect (L151) | `getMessages` + `markAsRead` | GET `/chat/rooms/:id/messages`; POST `/chat/rooms/:id/read` | REAL when `conv.roomId` present; else MOCK seed `makeMockMessages` (L38–117) |
| (live messages/typing/read) | `subscribeToRoom` callbacks (L164) | `chatService.subscribeToRoom` | socket `/chat`; markAsRead → POST `/chat/rooms/:id/read` | REAL |
| Composer text input (ComposerBar) | `setInputText` (L499) | none (note: `setTyping` socket exists in service but is **NOT wired** here) | none | local state |
| Send (`send`, ComposerBar) | `handleSend` (L211) | `sendMessage` — **only when `isRealRoom && text`** | POST `/chat/rooms/:id/messages` (TEXT ONLY) | REAL for text; image-attachment send = **UI-only, no backend** (L242) |
| Mic (`mic-outline`, ComposerBar) | `setIsRecording(true)` (L509) | none | none | n/a (enters recording UI) |
| `[+]` tray toggle (ComposerBar) | `handleToggleTray` (L502) | none | none | local |
| Remove-attachment ✕ (ComposerBar) | `setAttachmentPreview(null)` (L507) | none | none | local |
| AttachmentTray "Photo & File" tile | `handlePhotoTile` → `ImagePicker` → `setAttachmentPreview` | none — **image never uploaded** | none | **UI-only, no backend** |
| AttachmentTray "Voice Note" tile | `setIsRecording(true)` (L481) | none | none | n/a |
| AttachmentTray "Quick Replies" tile | `setQuickRepliesOpen(true)` (L485) | none | none | local |
| AttachmentTray "Assign Exercise" tile | `setExerciseModalOpen(true)` (L489) | none | none | local |
| VoiceRecorder cancel ✕ | `setIsRecording(false)` (L510) | none | none | local |
| VoiceRecorder send ✓ | `handleVoiceSend` (L301) | none — adds local voice msg, **never persisted** | none | **UI-only, no backend** |
| QuickRepliesSheet template rows | `setInputText(text)` (L525) | none — fills composer; `TEMPLATES` HARDCODED | none | **MOCK/HARDCODED** |
| QuickRepliesSheet close/backdrop | `setQuickRepliesOpen(false)` | none | none | n/a |
| ExerciseSelectModal "Assign" rows | `handleExerciseSelect` (L337) | none — adds local msg, **never persisted**; `EXERCISES` HARDCODED | none | **UI-only + MOCK/HARDCODED** |
| ExerciseSelectModal close/backdrop | `setExerciseModalOpen(false)` | none | none | n/a |
| Message bubble long-press (MessageBubble) | `setReactionTarget(msg.id)` (L406) | none | none | local (opens ReactionPicker) |
| Message bubble swipe-right (PanResponder) | `setReplyTo({...})` (L407) | none | none | local |
| ReactionPicker emoji buttons | `handleReact(target, emoji)` (L518) | none — **local reaction state only, never persisted** | none | **UI-only, no backend** |
| ReactionPicker close/backdrop | `setReactionTarget(null)` | none | none | n/a |
| Existing reaction pills on bubble | `handleReact(id, emoji)` (L414) | none — local toggle | none | **UI-only, no backend** |
| ReplyPreviewBar close ✕ | `setReplyTo(null)` (L505) | none | none | local |
| Voice message "Play" button (MessageBubble L154) | **GHOST** — `TouchableOpacity`, no `onPress`; audio never plays | none | none | n/a |
| Exercise card "View Exercise →" (MessageBubble) | inline `navigation.navigate('ExerciseDetail', { exercise })` | none | none | nav-only |

### States
- **Loading:** `loadingMessages` is set (L135) but **never rendered** — no `loadingMessages ?` branch in JSX; list shows blank until messages arrive (effectively a missing loading state)
- **Empty:** absent — no empty-message UI; a real room with no history renders a blank inverted FlatList
- **Error:** minimal — failed text send marks optimistic message `status:'failed'` (L247), but MessageBubble's `ReadReceipt` (L33) has **no `'failed'` case**, so failure is invisible. No Alert/banner. `getMessages` failure silently leaves list empty (L157)

### TODO/FIXME/XXX
none (L37 "Legacy mock seed…", L259 "Legacy mock path…", L242 "because the backend doesn't support uploads yet" are explanatory comments — no literal token)

### Diagnostic console.log
- `AttachmentTray.jsx:109` — `console.warn('Document pick error:', e);` (inside the **dead/unreachable** `handleDocumentTile`)
- `VoiceRecorder.jsx:64` — `console.warn('Recording not available:', e);`

---

# `src/screens/AssignFlow/` — exercise-assignment wizard (100% MOCK)

## SelectClientScreen
**Path:** `…/src/screens/AssignFlow/SelectClientScreen.js`

### Interactive elements
| Visible label / icon | Handler fn | Service fn | Backend endpoint | Data source |
|---|---|---|---|---|
| Header back (`arrow-back`, L62) | `navigation.goBack()` | none | none | n/a |
| Search "Search clients..." (L97) | `setSearchText` → `filteredClients` (L37) | none (client-side) | none | **MOCK/HARDCODED** `MOCK_CLIENTS` (L22–29) |
| Search clear (`close-circle`, L100) | `setSearchText('')` | none | none | local |
| Client rows (`ClientCard`, L113) | `setSelectedClient(...)` | none | none | **MOCK/HARDCODED** `MOCK_CLIENTS` |
| "Back" (bottom, L132) | `navigation.goBack()` | none | none | nav-only |
| "Next" (+`arrow-forward`, L47) | `handleNext` → navigate SET_SCHEDULE (passes selections) | none | none | nav-only; no-op when `!selectedClient` |

### States
- **Loading:** absent (synchronous constant) · **Empty:** present — "No clients found" only via search filter (L118) · **Error:** absent

### TODO/FIXME/XXX
none (L21 "Mock clients — Backend developer: replace with API call" is a MOCK marker, no token)

### Diagnostic console.log
none

---

## SetScheduleScreen
**Path:** `…/src/screens/AssignFlow/SetScheduleScreen.js`

### Interactive elements
| Visible label / icon | Handler fn | Service fn | Backend endpoint | Data source |
|---|---|---|---|---|
| Header back (L116) | `navigation.goBack()` | none | none | n/a |
| Start Date field (L145) | `setShowCal(true)` | none | none | local; opens CalendarPicker |
| CalendarPicker select/close (L198) | `setStartDate` / `setShowCal(false)` | none | none | local |
| Program Duration pills (1–4 weeks, L167) | `setDuration` | none | none | **HARDCODED** options (L165) |
| Frequency pills (Daily/Every other day/Weekly, L176) | `setFrequency` | none | none | **HARDCODED** options (L175) |
| Time pills (Morning/Afternoon/Evening, L187) | `setTimeOfDay` | none | none | **HARDCODED** options (L185) |
| "Back" (bottom, L204) | `navigation.goBack()` | none | none | nav-only |
| "Next" (+`arrow-forward`, L97) | `handleNext` → navigate REVIEW_ASSIGNMENT | none | none | nav-only; no-op until complete |

### States
- **Loading:** absent · **Empty:** absent · **Error:** absent (only disabled Next button gating, no message)

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

## ReviewAssignmentScreen
**Path:** `…/src/screens/AssignFlow/ReviewAssignmentScreen.js`

### Interactive elements
| Visible label / icon | Handler fn | Service fn | Backend endpoint | Data source |
|---|---|---|---|---|
| Header back (L198) / "Back" (bottom, L275) | `navigation.goBack()` | none | none | n/a |
| "Assign Exercises" (+`checkmark-circle-outline`, L278) | `handleAssign` (L177) — **persists NOTHING**: body is comments + `setShowSuccess(true)` (L184) | none | none | **MOCK** — fake success modal; no service, no fetch |
| "Back to Library" (success modal, L288) | `handleDone` → navigate EXERCISES `{ clearSelection: true }` | none | none | nav-only |

Displayed data (`selectedClient`/`scheduleConfig`/`selectedExercises`) from `route.params`, originally from `MOCK_CLIENTS`. The "All Done! Exercises assigned" modal is purely cosmetic.

### States
- **Loading:** absent · **Empty:** absent (`?? '—'` fallbacks) · **Error:** absent (no operation can fail; success modal unconditional)

### TODO/FIXME/XXX
- `ReviewAssignmentScreen.js:179` — `// TODO: call AssignmentService.assignExercises({ exercises: selectedExercises, clientId: selectedClient.id, schedule: scheduleConfig })`
- `ReviewAssignmentScreen.js:180` — `// TODO: backend exercise plugin was deleted in Phase A Item 5 cleanup`
- `ReviewAssignmentScreen.js:181` — `// (run \`git log -- backend/src/plugins/exercise/\` to find the deletion);`
- `ReviewAssignmentScreen.js:182` — `// re-wire to a new assignment endpoint when product spec is ready.`

### Diagnostic console.log
none

---

# `src/screens/video/`

## PreCallLobbyScreen
**Path:** `…/src/screens/video/PreCallLobbyScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| Header back (`chevron-back`, L173) / error-state "Back" (L156) | `handleBack` → `navigation.goBack()` | none | none | n/a |
| "Join Call" (`videocam`, L213) | `handleJoin` (L117) — tears down preview, `navigation.replace('VideoCall', ...)`. Gated on `call.canJoin` | none (nav-only) | none | REAL gate from `getCall` |
| (mount) call+booking load + 5s poll | `load()` (L65) | `getCall` (videoCallService.js) + `getBooking` (bookingService.js) | GET `/video/calls/:id`; GET `/bookings/:id` | REAL |
| (mount) camera preview | `start()` (L87) | `mediaDevices.getUserMedia` (react-native-webrtc) | none (local media) | REAL (device camera) |

### States
- **Loading:** `loading` → full-screen `ActivityIndicator` + "Loading session…" (L140); preview own "Starting camera…" (L193)
- **Empty:** partial — fallbacks ("Patient" name); "join window opens shortly…" when `!call.canJoin` (L203)
- **Error:** inline (no Alert; `Alert` imported L26 but **unused**) — call-load error → full-screen `errorText` + Back (L151); camera error → inline `previewError` (L193)

### TODO/FIXME/XXX
none

### Diagnostic console.log
none in this file (videoSocket not yet engaged here)

---

## VideoCallScreen
**Path:** `…/src/screens/video/VideoCallScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| (mount) load call meta | `loadMeta()` (L85) | `getCall` (videoCallService.js) | GET `/video/calls/:id` | REAL |
| (auto after selfUserId) join | `hook.join()` (L115) | `useVideoCall.join` → `joinCall` + `videoSocket.connect`/emits | POST `/video/calls/:id/join`; socket `/video`: `join_call`/`offer`/`answer`/`ice_candidate`/`call_ended` | REAL |
| Mute (`mic`/`mic-off`, L268) | `hook.toggleMute` | local audio-track `enabled` flip | none | REAL local control |
| Camera on/off (`videocam`/`videocam-off`, L275) | `hook.toggleCamera` | local video-track flip | none | REAL local control |
| End call (`call` rotated 135°, L136) | `handleEndCall` → `hook.leave` then `navigation.replace('SessionEnded')` | `leaveCall` + socket emit | socket `/video`: `end_call`; POST `/video/calls/:id/leave` | REAL |
| Switch camera (`camera-reverse`, L285) | `hook.switchCamera` | `videoTrack._switchCamera()` | none | REAL local control |
| Error-overlay "Retry" (L248) | `hook.join` (re-join) | `joinCall` + socket re-wire | POST `/video/calls/:id/join` + socket | REAL |
| Error-overlay "End" (L251) | `handleEndCall` | `leaveCall` + socket emit | socket `/video`: `end_call`; POST `/video/calls/:id/leave` | REAL |
| Draggable PiP (PanResponder, L165) | `pipPanResponder` | none (local Animated drag) | none | n/a |
| AssessmentPanel (when `assessmentId`, L294) | child — see below | `assessmentService.*` | see AssessmentPanel | REAL |
| (auto) peer-ended → navigate | useEffect on `callStatus==='ended'` (L147) | socket `call_ended` → `navigation.replace('SessionEnded')` | socket `/video`: `call_ended` | REAL |

**AssessmentPanel** (`src/components/video/AssessmentPanel.jsx`) is fully wired: getAssessment→GET `/assessments/:id` (L143); respond→POST `/assessments/:id/respond` (L210); complete→PATCH `/assessments/:id/complete` (L229); getPdf→GET `/assessments/:id/pdf` (L183, polling). Its controls (Skip L299, Next/Complete L319, scale/boolean/multiselect/text inputs L374–457, drag handle L282, View PDF L350) are all REAL.

### States
- **Loading:** no `remoteUrl` → placeholder `ActivityIndicator` + "Waiting for patient to join…" (L198); "Connection failed" when `callStatus==='failed'` (L206)
- **Empty:** n/a (waiting placeholder doubles as no-remote-stream state)
- **Error:** inline overlay (no Alert) for `PEER_CONNECTION_FAILED` / `OTHER_PARTY_NOT_ANSWERING` (L242) — "No answer"/"Connection failed" + Retry/End

### TODO/FIXME/XXX
- `VideoCallScreen.jsx:184` — `// TODO: surface body part when getCall response includes it.`

### Diagnostic console.log
None directly. Fired via `videoSocket.js` from this screen's join/leave/retry handlers:
| file:line | log |
|---|---|
| `src/lib/videoSocket.js:25` | `console.log('[videoSocket] connect() called', {...})` |
| `src/lib/videoSocket.js:57` | `console.log('[videoSocket] reconnect_attempt', { attempt })` |
| `src/lib/videoSocket.js:98` | `console.log('[videoSocket] connected', { socketId })` |
| `src/lib/videoSocket.js:108` | `console.warn('[videoSocket] connect_error', {...})` |
| `src/lib/videoSocket.js:127` | `console.warn('[videoSocket] connect timeout fired')` |
| `src/lib/videoSocket.js:159` | `console.log('[videoSocket] emit', { event, sent })` (every `join_call`/`answer`/`ice_candidate`/`end_call`) |

(`useVideoCall.js` has zero console statements.)

---

## SessionEndedScreen
**Path:** `…/src/screens/video/SessionEndedScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| (mount, when `assessmentId`) load assessment + maybe PDF | useEffect (L46) | `getAssessment`, `getPdf` (assessmentService.js) | GET `/assessments/:id`; GET `/assessments/:id/pdf` (if completed) | REAL |
| "View Assessment PDF" (`document-text-outline`, L89) | `handleViewPdf` (L72) → `Linking.openURL(pdfUrl)` | (URL from `getPdf`) | GET `/assessments/:id/pdf` | REAL (rendered only when `pdfUrl` set) |
| "Back to Bookings" (L67) | `handleBackToBookings` → navigate BOOKINGS | none | none | nav-only |

### States
- **Loading:** `pdfChecking` → `ActivityIndicator` in assess row (L87)
- **Empty:** graceful — "PDF still generating — check Bookings shortly." (L95); assessment row omitted when no `assessmentId` (L98)
- **Error:** **absent** — failed `getAssessment`/`getPdf` silently swallowed (assessment stays null, no message). PDF-fetch failure indistinguishable from "no assessment".

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

# Summary

### Counts
- **Total screens:** 32 (incl. 1 dead legacy `SplashScreen.jsx`)
- **Total interactive elements (table entries across all screens):** ~177
  *(Methodology: counts each table row. Multi-option sets — date tiles, pill selectors, category chips, exercise cards, attachment tiles — are listed as one entry each; non-pressable display elements and pure data-load effects are excluded; child-component elements rendered on a screen are attributed to that screen.)*
- **GHOST elements (onPress missing / empty / console.log-only):** **10**
  1. `TherapistPortalScreen.jsx` "Sign In" — `console.log` only, no action/navigation (L29–35)
  2. `DashboardScreen.jsx` Notifications bell — `TouchableOpacity`, no `onPress` (L175)
  3. `DashboardScreen.jsx` "View All" (Today's Appointments) — no `onPress` (L267)
  4. `DashboardScreen.jsx` "Add New Appointment" — no `onPress` (L311)
  5. `DashboardScreen.jsx` "View All" (Recent Activity) — no `onPress` (L320)
  6. `PendingVerificationDashboard.jsx` "Contact Support" — no `onPress` (L163)
  7. `AllClientsScreen.jsx` "Filter" button — no `onPress` (L151)
  8. `AllClientsScreen.jsx` client card row — no `onPress` (L184, no detail navigation)
  9. `ExerciseLibraryScreen.jsx` "Filter" button — no `onPress` (L218)
  10. `ChatScreen` → `MessageBubble.jsx` voice "Play" button — no `onPress` (L154; audio never plays)

  *(Dead-code GHOST, not counted — not reachable on any screen: `AttachmentTray.jsx` `handleDocumentTile` (L99–111) is defined but never wired; only the photo tile maps to a handler.)*

- **MOCK / hardcoded-backed flows:** **8**
  1. **Auth fallback services** — `auth/AuthService.js` (login/register/forgotPassword), `auth/OtpService.js`, `auth/mockAuthService.js`, and `AuthService.js` Clerk stubs are all MOCK/stub; `TherapistPortalScreen` "Sign In" is a no-op against them. (Live auth path now uses real Clerk via `ClerkAuthScreen`.)
  2. **Verification onboarding (5 screens)** — ProfessionalCredentials, GovernmentIDVerification, ProfilePhoto, ScheduleVerificationCall, BookingConfirmed: collect input / pick images but **persist nothing** (navigation-only; images never uploaded).
  3. **PendingVerificationDashboard** — fully static (`STEPS`, `LOCKED_STATS` all `'—'`, "what's next" list).
  4. **ExerciseLibraryScreen + ExerciseDetailScreen** — `MOCK_EXERCISES` catalog + hardcoded tips/fallbacks; no exercise backend.
  5. **AssignFlow (SelectClient → SetSchedule → ReviewAssignment)** — `MOCK_CLIENTS` + hardcoded schedule pills; final "Assign Exercises" shows a **fake success modal and persists nothing** (backend exercise plugin was deleted).
  6. **ChatScreen rich features** — image attachments, voice notes, reactions, quick replies, exercise-send are **UI-only** (chat backend is text-only); mock seed (`makeMockMessages`) + auto-reply when no `roomId`.
  7. **AllClientsScreen** — REAL client fetch, but `normalizeClient` **fabricates** `status:'Good'` (every client) + age/condition/adherence/pain placeholders; only id+name are real.
  8. **DashboardScreen** — REAL profile/dashboard fetch, but "Avg Adherence" hardcoded `'—'` and "Recent Activity" is permanently static "No recent activity yet" (no endpoint).

### Full list of TODO/FIXME/XXX hits (file:line)
- `src/screens/auth/TherapistPortalScreen.jsx:32` — `// TODO: import AuthService and call AuthService.login(email, password)`
- `src/screens/auth/TherapistPortalScreen.jsx:33` — `// TODO: on success → navigate to Dashboard`
- `src/screens/auth/TherapistPortalScreen.jsx:34` — `// TODO: on failure → show error message`
- `src/screens/auth/ProfessionalCredentialsScreen.jsx:85` — `// TODO: await TherapistService.saveCredentials(payload);`
- `src/screens/auth/GovernmentIDVerificationScreen.jsx:177` — `// TODO: await TherapistService.saveGovID(payload);`
- `src/screens/auth/ProfilePhotoScreen.jsx:104` — `// TODO: await TherapistService.saveProfilePhoto({ uri: photo.uri });`
- `src/screens/auth/ScheduleVerificationCallScreen.jsx:89` — `// TODO: await TherapistService.scheduleVerificationCall({ date: selected.key });`
- `src/screens/dashboard/PendingVerificationDashboard.jsx:169` — `{/* TODO: Remove this button and route via real auth state */}`
- `src/screens/AssignFlow/ReviewAssignmentScreen.js:179` — `// TODO: call AssignmentService.assignExercises({...})`
- `src/screens/AssignFlow/ReviewAssignmentScreen.js:180` — `// TODO: backend exercise plugin was deleted in Phase A Item 5 cleanup`
- `src/screens/AssignFlow/ReviewAssignmentScreen.js:181` — `// (run \`git log -- backend/src/plugins/exercise/\` to find the deletion);`
- `src/screens/AssignFlow/ReviewAssignmentScreen.js:182` — `// re-wire to a new assignment endpoint when product spec is ready.`
- `src/screens/video/VideoCallScreen.jsx:184` — `// TODO: surface body part when getCall response includes it.`

*(No `FIXME` or `XXX` tokens found in any screen file. Additional explicit `[MOCK]` / "replace with API call" markers — not literal TODO tokens — appear in: ProfessionalCredentials:84, GovernmentID:176, ProfilePhoto:103/110, ScheduleVerificationCall:88, ExerciseLibrary:4/25, SelectClient:21, MessagesScreen:4, DashboardScreen:6, AllClientsScreen:4.)*

### Other notable (non-GHOST) gaps & inconsistencies
- **"Submit/save that persists nothing"** (handler navigates or shows a modal, so not a strict GHOST): the 4 verification "Continue/Confirm" buttons (ProfessionalCredentials, GovernmentID, ProfilePhoto, ScheduleVerificationCall) and the AssignFlow **"Assign Exercises"** button (fake success modal). Government-ID and Profile-photo image URIs are captured but **never uploaded**.
- **Dead / no-op inputs:** `DashboardScreen` search box (`searchText` set but never read); `AllClientsScreen` search placeholder says "name or condition" but only name is filtered.
- **Silently-swallowed failures:** `DashboardScreen` profile/dashboard fetch (no try/catch — can wedge on "Loading…"); `MessagesScreen` `getConversations`; `ChatScreen` `getMessages` + failed `sendMessage` (`status:'failed'` has no UI rendering); `SessionEndedScreen` assessment/PDF fetch; `PersonalInfoScreen` `/auth/me/init`.
- **One-directional typing:** `ChatScreen` consumes inbound `onTyping` but never calls `chatService.setTyping`, so it never broadcasts the therapist's own typing.
- **Dead code:** legacy `src/screens/SplashScreen.jsx` (unused by navigator); `AttachmentTray.handleDocumentTile` (unreachable). Unused `Alert` import in `PreCallLobbyScreen.jsx:26`. `BookingsScreen` "Join" trusts the list's `canJoin` while `BookingDetailScreen` re-derives it via `getCall`.
- **DEV affordance shipped:** `PendingVerificationDashboard` "[DEV] Go to Full Dashboard" (L170, TODO to remove at L169); active splash `DEV_BYPASS` const (L27, currently `false`).
- **Stale `CLAUDE.md`:** describes `DashboardScreen` as empty and omits bookings/proposals/video/chat/AssignFlow entirely; in-file "replace MOCK_*" comments on Dashboard/AllClients/Messages are also stale (those screens are now real-data-backed).

### Backend-connected (REAL) flows confirmed
Clerk auth (`/auth/email-status`, `/auth/me/init`), dashboard (`/therapists/me/profile`, `/therapists/me/dashboard`), clients (`/therapists/me/clients`), instant-availability toggle (`/therapists/me/instant-availability`), bookings (list/get/accept/decline/cancel), proposals (create/list/cancel + `ProposalDetailSheet`, `PatientPickerSheet`), instant-call accept/decline (`IncomingInstantCallModal`, currently dormant pending a backend socket emit), chat (rooms/messages/read/create + `/chat` socket), video calls (get/join/leave/ice + `/video` socket via `useVideoCall`), assessments (get/respond/complete/pdf via `AssessmentPanel`), and push-token register/clear.
