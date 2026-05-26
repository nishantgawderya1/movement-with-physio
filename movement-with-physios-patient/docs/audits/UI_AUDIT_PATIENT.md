# MWP Patient App — UI Audit (Read-Only)

**Date:** 2026-05-26
**Scope:** Every screen file in the MWP patient app.
**App root:** `/Users/gouravshokeen/Downloads/backend-repo/movement-with-physios-patient`

## Routing convention (investigated & confirmed)

This app does **NOT** use Expo Router. There is no top-level `app/` directory.
Navigation is **React Navigation v7** (`@react-navigation/stack` +
`@react-navigation/bottom-tabs`), with screens living under **`src/screens/`**:

```
src/screens/auth/      (10 files — onboarding + Clerk auth)
src/screens/booking/   (1 file)
src/screens/main/      (9 files — tab roots + booking flow + session player)
src/screens/messages/  (2 files — chat)
src/screens/splash/    (1 file)
src/screens/video/     (3 files — WebRTC video call)
```

Navigators: `src/navigation/{AppNavigator,AuthNavigator,MainNavigator,RootNavigator}.jsx`
+ `src/navigation/stacks/{HomeStack,BookStack,MessagesStack}.jsx`.

**26 screen files total.**

### Service → endpoint reference (all prefixed `/api/v1`)

| Service fn | File | Endpoint |
|---|---|---|
| `listBookings` | `src/services/bookingService.js` | GET `/bookings` |
| `getBooking` | `src/services/bookingService.js` | GET `/bookings/:id` |
| `requestInstantCall` | `src/services/bookingService.js` | POST `/bookings/instant` |
| `cancelBooking` | `src/services/bookingService.js` | PATCH `/bookings/:id/cancel` |
| `listProposals` | `src/services/proposalService.js` | GET `/bookings/proposals` |
| `acceptProposal` | `src/services/proposalService.js` | POST `/bookings/proposals/:id/accept` |
| `declineProposal` | `src/services/proposalService.js` | POST `/bookings/proposals/:id/decline` |
| `getConversations` | `src/services/chatService.js` | GET `/chat/rooms` |
| `getMessages` | `src/services/chatService.js` | GET `/chat/rooms/:id/messages` |
| `sendMessage` | `src/services/chatService.js` | POST `/chat/rooms/:id/messages` |
| `markAsRead` | `src/services/chatService.js` | POST `/chat/rooms/:id/read` (+ socket `mark_read`) |
| `createRoom` | `src/services/chatService.js` | POST `/chat/rooms` |
| `listAvailableTherapists` | `src/services/chatService.js` | GET `/therapists` |
| `getTypingStatus` | `src/services/chatService.js` | **MOCK no-op** (no backend) |
| `subscribeToRoom` / `setTyping` | `src/services/chatService.js` | socket only (`/chat` namespace) |
| `getCall` | `src/services/videoCallService.js` | GET `/video/calls/:id` |
| `joinCall` | `src/services/videoCallService.js` | POST `/video/calls/:id/join` |
| `leaveCall` | `src/services/videoCallService.js` | POST `/video/calls/:id/leave` |
| `getIceConfig` | `src/services/videoCallService.js` | GET `/video/ice-config` |
| `registerPushToken` / `clearPushToken` | `src/services/notificationService.js` | PATCH `/users/me/fcm-token` |
| `requestPermissions` / `registerProposalCategory` | `src/services/notificationService.js` | expo-notifications (no backend) |
| `updatePatientProfile` | `src/services/auth/patientService.js` | PATCH `/patient/profile` |
| `submitOnboarding` | `src/services/auth/mockOnboardingService.js` | **MOCK** (`setTimeout`, returns `pat_mock_001`, no backend) |

---

# `src/screens/auth/`

## LoginScreen
**Path:** `/Users/gouravshokeen/Downloads/backend-repo/movement-with-physios-patient/src/screens/auth/LoginScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| "Start My Recovery" (Pressable) | `handleStartRecovery` | none | none | navigate → CLERK_AUTH `{ mode: 'signup' }` |
| "Login" (Pressable) | `handleLogin` | none | none | navigate → CLERK_AUTH `{ mode: 'signin' }` |

`FEATURES` array (lines 15–31) is HARDCODED but renders non-interactive rows only.

### States
- **Loading:** none
- **Empty:** none
- **Error:** none

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

## ClerkAuthScreen
**Path:** `/Users/gouravshokeen/Downloads/backend-repo/movement-with-physios-patient/src/screens/auth/ClerkAuthScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| Email TextInput (`you@example.com`) | `onChangeText=setEmail` | none | none | local state `email` |
| "Send Code" (Pressable, email step) | `handleSendOTP` | `apiClient.post` (`src/lib/apiClient.js`) + Clerk `signUp.create`/`signIn.create` | POST `/api/v1/auth/email-status` (pre-flight) + Clerk SDK | REAL + Clerk SDK |
| OTP TextInput (`6-digit code`) | `onChangeText=setOtp` | none | none | local state `otp` |
| "Verify & Continue" (Pressable, otp step) | `handleVerifyOTP` | Clerk `attemptEmailAddressVerification` / `attemptFirstFactor` / `setActive` | none (Clerk SDK only) | Clerk SDK; signup → navigate PERSONAL_INFO + stash `global.__pendingClerkSession`; signin → `setActive` |
| "← Change email" (Pressable, otp step) | inline `() => { setStep('email'); setOtp(''); }` | none | none | local state reset |

### States
- **Loading:** present — `loading` true during send/verify; button shows `<ActivityIndicator>` + disabled (lines 196–203, 217–225)
- **Empty:** none
- **Error:** **Alert.alert** only — many branches: wrong-app-for-email (63), account-already-exists (92), no-account-found (98), generic (104), sign-up incomplete (134), sign-in incomplete (152), invalid code (156). No inline banner.

### TODO/FIXME/XXX
none

### Diagnostic console.log
none (`__DEV__`-gated on-screen dev hint at lines 237–243 is rendered text, not a console.log)

---

## PersonalInfoScreen
**Path:** `/Users/gouravshokeen/Downloads/backend-repo/movement-with-physios-patient/src/screens/auth/PersonalInfoScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| "Full name" TextInput | `onChangeText=setName` | none | none | local state `name` |
| "Age" TextInput | `onChangeText=setAge` | none | none | local state `age` |
| "Continue" (OnboardingShell) | `handleContinue` | `apiClient.post` (`src/lib/apiClient.js`) — fire-and-forget | POST `/api/v1/auth/me/init` `{ role:'patient', name }` | OnboardingContext write + REAL backfill; navigate → PAIN_LOCATION |
| back arrow (OnboardingShell) | `handleBack` | none | none | `navigation.goBack()` |

Continue gated by `isValid` (name non-empty + age 1–120).

### States
- **Loading:** none (`me/init` is fire-and-forget, `.catch(() => {})`, no UI lock)
- **Empty:** none
- **Error:** none — init failure silently swallowed (line 34)

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

## PainLocationScreen
**Path:** `/Users/gouravshokeen/Downloads/backend-repo/movement-with-physios-patient/src/screens/auth/PainLocationScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| SelectableCard ×8 (Back, Neck, Arm, Leg, Shoulder, Spine, Pelvic Physio, Fracture) | `toggleLocation` (inline onPress) | none | none | **HARDCODED** `PAIN_LOCATIONS` (lines 8–17); multi-select local state |
| "Continue" (OnboardingShell) | `handleContinue` | none | none | OnboardingContext write `painLocations`; navigate → PAIN_SEVERITY |
| back arrow (OnboardingShell) | `handleBack` | none | none | `navigation.goBack()` |

Continue disabled when `selectedLocations.length === 0`.

### States
- **Loading:** none · **Empty:** none · **Error:** none

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

## PainSeverityScreen
**Path:** `/Users/gouravshokeen/Downloads/backend-repo/movement-with-physios-patient/src/screens/auth/PainSeverityScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| Severity circle Pressable ×10 (1–10) | inline `() => setSelectedSeverity(level)` | none | none | **HARDCODED** `SEVERITY_LEVELS` (line 9) + `PAIN_LABELS` (11–14) |
| "Continue" (OnboardingShell) | `handleContinue` | none | none | OnboardingContext write `painSeverity`; navigate → PAIN_DURATION |
| back arrow (OnboardingShell) | `handleBack` | none | none | `navigation.goBack()` |

Continue disabled when `selectedSeverity === null`.

### States
- **Loading:** none
- **Empty:** informational placeholder "Tap a number to rate your pain" when nothing selected (lines 70–76)
- **Error:** none

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

## PainDurationScreen
**Path:** `/Users/gouravshokeen/Downloads/backend-repo/movement-with-physios-patient/src/screens/auth/PainDurationScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| Duration TouchableOpacity ×4 (Less than 1 week, 1–4 weeks, 1–3 months, More than 3 months) | inline `() => setSelectedDuration(option)` | none | none | **HARDCODED** `DURATION_OPTIONS` (10–15) + `DURATION_ICONS` (17–22) |
| "Continue" (OnboardingShell) | `handleContinue` | none | none | OnboardingContext write `painDuration`; navigate → TREATMENT_HISTORY |
| back arrow (OnboardingShell) | `handleBack` | none | none | `navigation.goBack()` |

Continue disabled when `!selectedDuration`.

### States
- **Loading:** none · **Empty:** none · **Error:** none

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

## TreatmentHistoryScreen
**Path:** `/Users/gouravshokeen/Downloads/backend-repo/movement-with-physios-patient/src/screens/auth/TreatmentHistoryScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| "Yes" card (TouchableOpacity) | inline `() => setHadTreatment(true)` | none | none | **HARDCODED** `CARD_OPTIONS` (40–43) |
| "No" card (TouchableOpacity) | inline `() => { setHadTreatment(false); setDetails(''); }` | none | none | **HARDCODED** `CARD_OPTIONS` |
| "Brief details (optional)" TextInput (Yes only) | `onChangeText=setDetails` | none | none | local state `details` |
| "Continue" (OnboardingShell) | `handleContinue` | none | none | OnboardingContext write; navigate → RECOVERY_GOALS |
| back arrow (OnboardingShell) | `handleBack` | none | none | `navigation.goBack()` |

Continue disabled when `hadTreatment === null`.

### States
- **Loading:** none · **Empty:** none · **Error:** none

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

## RecoveryGoalsScreen
**Path:** `/Users/gouravshokeen/Downloads/backend-repo/movement-with-physios-patient/src/screens/auth/RecoveryGoalsScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| Goal TouchableOpacity ×6 (Reduce Pain, Improve Mobility, Post-Surgery Recovery, Sports Performance, Posture Correction, General Wellness) | `toggleGoal` (inline onPress) | none | none | **HARDCODED** `GOAL_OPTIONS` (10–17) + `GOAL_ICONS` (19–26) |
| "Continue" (OnboardingShell) | `handleContinue` | none | none | OnboardingContext write `recoveryGoals`; navigate → AVAILABILITY |
| back arrow (OnboardingShell) | `handleBack` | none | none | `navigation.goBack()` |

Continue disabled when `selectedGoals.length === 0`.

### States
- **Loading:** none · **Empty:** none · **Error:** none

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

## AvailabilityScreen
**Path:** `/Users/gouravshokeen/Downloads/backend-repo/movement-with-physios-patient/src/screens/auth/AvailabilityScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| Slot TouchableOpacity ×6 (Weekday/Weekend × Mornings/Afternoons/Evenings) | `toggleSlot` (inline onPress) | none | none | **HARDCODED** `SLOT_OPTIONS` (13–20) + `SLOT_ICONS` (22–29) |
| "Finish" / "Submitting…" (OnboardingShell continue) | `handleContinue` | `submitOnboarding` (`mockOnboardingService.js`) **+** `updatePatientProfile` + `mapUiLabelToBodyPart` (`patientService.js`), via `Promise.all` | `submitOnboarding` → **MOCK** (no backend); `updatePatientProfile` → PATCH `/api/v1/patient/profile` `{ painLocation }` | **MOCK** (full payload) + REAL (best-effort painLocation push); on success `navigation.replace` → ONBOARDING_COMPLETE |
| back arrow (OnboardingShell) | `handleBack` | none | none | `navigation.goBack()` |

Continue disabled when `selectedSlots.length === 0 || isSubmitting`. The final onboarding submit is the **mock** — backend never receives the full profile; only `painLocation` is pushed best-effort.

### States
- **Loading:** present — `isSubmitting` flips label to "Submitting…", disables button, renders `<ActivityIndicator>` (lines 173–179)
- **Empty:** none
- **Error:** **inline banner** only — `submitError` → red `<Text style={styles.errorText}>` (181–183), set from `mockResult.error`. Real-profile failure does NOT surface (only `console.warn`). No Alert.

### TODO/FIXME/XXX
none (comments mention "Phase 3"/"P2 in the audit" at 72–80, 92–94 — no TODO/FIXME/XXX token)

### Diagnostic console.log
- `AvailabilityScreen.jsx:97` — `console.warn('[AvailabilityScreen] painLocation backend update failed:', profileResult.error)` (intentional best-effort log; `// eslint-disable-next-line no-console` at 96)

---

## OnboardingCompleteScreen
**Path:** `/Users/gouravshokeen/Downloads/backend-repo/movement-with-physios-patient/src/screens/auth/OnboardingCompleteScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| "Go to Dashboard" (Pressable) | `handleNavigate` | Clerk `setActive` via `global.__pendingClerkSession` OR `completeOnboarding` (PatientContext) | none (Clerk SDK only) | exit animation → activate pending Clerk session → RootNavigator auto-switches to MainNavigator |

No data submit here — submit already happened on AvailabilityScreen.

### States
- **Loading:** none (animated mount/exit only)
- **Empty:** none
- **Error:** none — `await setActive(...)` at line 71 is NOT wrapped in try/catch (unhandled on failure)

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

# `src/screens/booking/`

## WaitingForTherapistScreen
**Path:** `/Users/gouravshokeen/Downloads/backend-repo/movement-with-physios-patient/src/screens/booking/WaitingForTherapistScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| back arrow — pending state (line 265) | `handleCancel` (145) | `cancelBooking` (`bookingService.js`) | PATCH `/api/v1/bookings/:id/cancel` | REAL |
| "Cancel Request" button (279–289) | `handleCancel` (145) | `cancelBooking` (`bookingService.js`) | PATCH `/api/v1/bookings/:id/cancel` | REAL |
| back arrow — error state (199) | `handleBackToHome` (159) | none | none | `popToTop` |
| "Retry" button — error state (206–208) | `handleRetryLoad` (165) | `getBooking` (`bookingService.js`) | GET `/api/v1/bookings/:id` | REAL |
| "Back to Messages" — error state (209–211) | `handleBackToHome` (159) | none | none | navigation only |
| back arrow — declined state (222) | `handleBackToHome` (159) | none | none | navigation only |
| "Back to Messages" — declined state (229–231) | `handleBackToHome` (159) | none | none | navigation only |
| back arrow — cancelled state (240) | `handleBackToHome` (159) | none | none | navigation only |
| "Back to Messages" — cancelled state (246–248) | `handleBackToHome` (159) | none | none | navigation only |

Background (non-interactive): mount + 3s poll `getBooking(bookingId)` → GET `/api/v1/bookings/:id` (96–143). On `status==='confirmed'` w/ `videoCallId` → `navigation.replace(PRE_CALL_LOBBY)` (119). REAL.

### States
- **Loading:** present — pending state shows `ActivityIndicator` (274) + "Waiting for {name} to accept…" (271–273); cancel-in-flight shows button `ActivityIndicator` (`cancelling`, 284–285); countdown `formatRemaining` ticks every 5s. No distinct first-load spinner (shows pending UI with `therapistName` default `'Therapist'`).
- **Empty:** degenerate — missing `bookingId` → `loadError = 'Missing bookingId'` (97–99) → error layout.
- **Error:** mixed — inline full-screen error layout for load failures w/ Retry + "Back to Messages" (196–215); **cancel** failure → `Alert.alert('Could not cancel', …)` (155).

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

# `src/screens/main/`

## HomeScreen
**Path:** `/Users/gouravshokeen/Downloads/backend-repo/movement-with-physios-patient/src/screens/main/HomeScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| 🔔 Notifications bell (Pressable, line 125) | **GHOST** — `onPress={function () {}}` (empty) | none | none | n/a |
| 👤 Avatar (Pressable, 128) | inline → `navigation.navigate(PROFILE)` | none | none | n/a |
| START SESSION (Pressable, 157) | inline → `navigation.navigate(SESSION)` | none | none | n/a |
| "View All" — Pain Trend (Pressable, 189) | inline → `navigation.navigate(PROGRESS)` | none | none | n/a |
| "Book Session" quick action (Pressable, 257) | inline → `navigate(BOOK_APPOINTMENT, { screen: BOOK_THERAPIST })` | none | none | n/a |
| "View Progress" quick action (Pressable, 273) | inline → `navigation.navigate(PROGRESS)` | none | none | n/a |

(`ellipsis-horizontal` icon at line 143 is a plain `<Ionicons>`, not pressable.)
All content (`patient.name`, `painTrend`, `streak`, `adherence`, `todayPlan`, `weekProgress`) reads from **PatientContext** (`usePatient()`, line 103) — **MOCK** per app docs. No API calls.

### States
- **Loading:** absent (renders from context synchronously)
- **Empty:** absent (assumes context fields populated)
- **Error:** none

### TODO/FIXME/XXX
- `HomeScreen.jsx:124` — `{/* TODO: Notifications screen not yet built */}`

### Diagnostic console.log
none

---

## AppointmentsRootScreen
**Path:** `/Users/gouravshokeen/Downloads/backend-repo/movement-with-physios-patient/src/screens/main/AppointmentsRootScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| InlineBanner dismiss (312) | `dismissBanner` (147) | none | none | local state |
| **Accept** — in `PendingProposalRow` (onAccept, 347) | `handleAccept(pid)` (178) | `acceptProposal` (`proposalService.js`) | POST `/api/v1/bookings/proposals/:id/accept` | REAL |
| **Decline** — in `PendingProposalRow` (onDecline, 348) | `handleDeclineOpen(pid)` (212) — opens sheet | none | none | n/a |
| **Decline** confirm — in `DeclineProposalSheet` (onSubmit, 398) | `handleDeclineSubmit(reason)` (218) | `declineProposal` (`proposalService.js`) | POST `/api/v1/bookings/proposals/:id/decline` | REAL |
| **Cancel** — in `DeclineProposalSheet` (onClose/backdrop, 397) | `handleDeclineCancel` (215) — closes sheet | none | none | n/a |
| Decline reason TextInput — in `DeclineProposalSheet` (73) | local `setReason` (no onSubmitEditing) | none | none | local state |
| **Join now** — in `BookingCard` (onJoinPress, 371/432) | `handleJoinCall(b)` (272) → cross-stack `navigate(MESSAGES, { screen: PRE_CALL_LOBBY })` | none | none | n/a |
| "Book a new session" FAB (PrimaryButton, 392) | `handleBookNewSession` (265) → `navigate(BOOK_THERAPIST)` | none | none | n/a |

Lists: proposals via `listProposals({ status:'pending' })` → GET `/api/v1/bookings/proposals` (REAL); bookings via `listBookings({ limit:50 })` → GET `/api/v1/bookings` (REAL). `MOCK_PROPOSALS` (28–36) is **dead** behind `USE_MOCK_PROPOSALS = false` (27). Notification deep-links auto-trigger `handleAccept`/`handleDeclineOpen` via `route.params` (246–263).

### States
- **Loading:** present — `loadingProposals`/`loadingBookings` (113–114); Upcoming shows "Loading..." (361); Accept button → "Accepting..." (PendingProposalRow:90); Decline → "Declining..." (DeclineProposalSheet:102)
- **Empty:** present — "No upcoming sessions yet" (363), "No past sessions yet" (382); Pending section hidden when `proposals.length === 0`
- **Error:** present — **inline banner** for accept failures (`showBanner(friendlyAcceptError(...), 'error')`, 207); decline errors inline inside sheet (228–233 → DeclineProposalSheet errorBanner 86–90). No Alert. **Note:** `listProposals`/`listBookings` failures silently set empty arrays (123–124, 134–135) — no error surfaced.

### TODO/FIXME/XXX
none (lines 22–26 reference "Mock-first per CLAUDE.md"/`USE_MOCK_PROPOSALS` — no token)

### Diagnostic console.log
none

---

## BookScreen
**Path:** `/Users/gouravshokeen/Downloads/backend-repo/movement-with-physios-patient/src/screens/main/BookScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn | Backend endpoint | Data source |
|---|---|---|---|---|
| (none) | — | — | — | — |

Static placeholder — renders only centered `<Text>Book</Text>` (line 14). JSDoc labels it "Placeholder for the Book Appointment tab screen" (8). No interactive elements, no data.

### States
- **Loading:** absent · **Empty:** absent (itself a static stub) · **Error:** none

### TODO/FIXME/XXX
none ("Placeholder" at line 8 is not a token)

### Diagnostic console.log
none

---

## BookTherapistScreen
**Path:** `/Users/gouravshokeen/Downloads/backend-repo/movement-with-physios-patient/src/screens/main/BookTherapistScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| Therapist row — `TherapistCard` (onPress, 73→65) | `handleTherapistPress(therapist)` (65) → `navigate(SLOT_SELECTION, { therapist })` | none | none | n/a |
| Featured banner (ListHeaderComponent, 113–123) | none (not pressable) | none | none | n/a |

List fetched in `loadTherapists` (44) via `apiClient.get('/therapists', { limit:50, includeUnverified:true })` (49) → **GET `/api/v1/therapists`** (REAL), bypassing `chatService.listAvailableTherapists` (same endpoint). `normalizeTherapist` (21) injects **HARDCODED** card defaults: `exp:''`, `reviews:0`, `langs:['English']`, `slot:'Available'`, `spec` fallback `'Physiotherapist'`, `rating` fallback `0` (22–32) — these are not from backend.

### States
- **Loading:** present — `loading` true initially/during fetch; `renderEmpty` shows `<ActivityIndicator>` (79–84)
- **Empty:** present — not loading + empty: "No therapists available yet" + "Check back soon…" (88–93)
- **Error:** present — **inline** in same empty component: on failure `error` set (54) → "Could not load therapists" + error string. No banner/Alert.

### TODO/FIXME/XXX
none (45–48 explain `includeUnverified` dev gate — no token)

### Diagnostic console.log
none

---

## SlotSelectionScreen
**Path:** `/Users/gouravshokeen/Downloads/backend-repo/movement-with-physios-patient/src/screens/main/SlotSelectionScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn | Backend endpoint | Data source |
|---|---|---|---|---|
| back arrow (`chevron-back`, 39) | inline `navigation.goBack()` | none | none | n/a |
| Slot pill ×7 (e.g. "10:00 AM", 75–83) | inline `setSelectedSlot(slot)` | none | none | **MOCK/HARDCODED** `TIME_SLOTS` (9–12) |
| "Confirm Booking" (99–105) | `handleConfirm` (27) — navigation only → BOOKING_CONFIRMED | none | none | n/a (passes `BOOKING_DATE` const, 14) |

**No booking is created here** — Confirm only navigates.

### States
- **Loading:** absent · **Empty:** absent (fixed array) · **Error:** absent (`route.params.therapist` unguarded — would throw at line 54 if missing)

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

## BookingConfirmedScreen
**Path:** `/Users/gouravshokeen/Downloads/backend-repo/movement-with-physios-patient/src/screens/main/BookingConfirmedScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn | Backend endpoint | Data source |
|---|---|---|---|---|
| Copy-link icon (Pressable, 227) | `handleCopyLink` (109) → `Clipboard.setStringAsync(MEETING_LINK)` | none | none | **HARDCODED** `MEETING_LINK` |
| Open-link icon (Pressable, 234) | `handleOpenLink` (116) → `Linking.openURL(MEETING_LINK)` | none | none | **HARDCODED** `MEETING_LINK` |
| "Add to Calendar" (Pressable, 243) | `handleAddToCalendar` (120) → `Alert.alert('Opening Calendar', …)` — stub | none | none | n/a (no real calendar integration) |
| "Share" (Pressable, 247) | `handleShare` (124) → `Share.share({...})` | none | none | **HARDCODED** `MEETING_LINK` |
| "Back to Home" (Pressable, 255) | inline → `navigation.navigate(HOME)` | none | none | n/a |
| "Book Another Session" (Pressable, 262) | inline → `navigation.navigate(BOOK_THERAPIST)` | none | none | n/a |

**No service/API calls.** `MEETING_LINK = 'https://meet.mwp.care/room/pat-ab12cd34'` (HARDCODED, line 20). `therapist`/`selectedSlot` from `route.params` with HARDCODED fallbacks (`Dr. Sarah James` / `11:00 AM`, 75–76). Detail rows are HARDCODED literals: Date "Today, Feb 15 2026" (190), Duration "30 Minutes" (200), Fee "₹500" (205), Type "Video Consultation" (210); only Time reflects `selectedSlot` (195).

### States
- **Loading:** absent (mount animations only)
- **Empty:** absent (hardcoded fallbacks instead)
- **Error:** none — `Clipboard`/`Linking` unguarded (no `.catch`); `handleAddToCalendar` raises an informational Alert (stub)

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

## ProfileScreen
**Path:** `/Users/gouravshokeen/Downloads/backend-repo/movement-with-physios-patient/src/screens/main/ProfileScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| MenuRow "Primary body part" (`body-outline`, 164–169) | inline `setIsBodyPartModalOpen(true)` | none (open); save in modal | none | REAL — shows `patient.painLocation` from `usePatient()` (167) |
| MenuRow "Personal Information" (170–174) | `handleComingSoon` (137) → `Alert.alert('Coming soon')` | none | none | n/a |
| MenuRow "Notifications" (175–179) | `handleComingSoon` (137) | none | none | n/a |
| MenuRow "Settings" (180–184) | `handleComingSoon` (137) | none | none | n/a |
| MenuRow "Help & Support" (185–189) | `handleComingSoon` (137) | none | none | n/a |
| "Logout" (193–200) | `handleLogout` (115) → confirm Alert → `clearPushToken()` (fire-and-forget) + Clerk `signOut()` | `clearPushToken` (`notificationService.js`) | PATCH `/api/v1/users/me/fcm-token` (+ Clerk signOut) | REAL |
| Modal backdrop (210) | inline `setIsBodyPartModalOpen(false)` | none | none | n/a |
| Modal card inner (214) | inline `function () {}` (no-op, swallows backdrop tap) | none | none | n/a |
| Body-part option pill ×`BACKEND_BODY_PARTS` (221–238) | inline → `handleSelectBodyPart(option)` (97) | `updatePatientProfile` (`patientService.js`) | PATCH `/api/v1/patient/profile` `{ painLocation }` | REAL |

(The 4 "coming soon" MenuRows are functional Alerts, not GHOSTs. The modal card-inner `function () {}` is an intentional tap-swallow, not a GHOST.)

### States
- **Loading:** present — body-part save shows `ActivityIndicator` (`isSavingBodyPart`, 242–248); options disabled while saving (228). No screen-level spinner (context-backed).
- **Empty:** graceful fallbacks — name → email → `'Patient'` (153); `getInitials` → `'?'` (83); body part → `'Not set'` (45). Stats chips were removed (comment 156–159) because they were hardcoded mock numbers.
- **Error:** mixed — body-part save failure → inline banner `modalError` (249–251); sign-out failure → `Alert.alert('Error', …)` (130); `clearPushToken` failure silently swallowed `.catch(() => {})` (127, intentional).

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

## ProgressScreen
**Path:** `/Users/gouravshokeen/Downloads/backend-repo/movement-with-physios-patient/src/screens/main/ProgressScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn | Backend endpoint | Data source |
|---|---|---|---|---|
| (none — fully presentational) | — | none | none | **MOCK/HARDCODED** |

No buttons / no `onPress`. Outer ScrollView (72) and inner horizontal achievements ScrollView (208) are scroll containers only. All data HARDCODED: `PAIN_DATA` (29–33), `WEEK_LABELS` (34), `COMPLETED_DOTS=28`/`MISSED_DOTS=4` + `DOT_STATUS` (40–48), `ACHIEVEMENTS` (50–54), "↓ 82% reduction" (80), pain labels "9/10"→"3/10" (125/132), adherence "8/10" (146–147), "3 days away" nudge (223–225). Charts via `victory-native`; adherence grid via `react-native-svg`.

### States
- **Loading:** absent · **Empty:** absent · **Error:** absent

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

## SessionScreen
**Path:** `/Users/gouravshokeen/Downloads/backend-repo/movement-with-physios-patient/src/screens/main/SessionScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn | Backend endpoint | Data source |
|---|---|---|---|---|
| back arrow (`chevron-back`, 669) | `handleBack` (538) → confirm Alert → `navigation.goBack()` | none | none | n/a |
| "Done — Set X of Y" (rep-based, 632–652) | `handleRepComplete` (511) — local state only | none | none | **MOCK/HARDCODED** `SESSION_EXERCISES` (24–80) |
| "Skip Rest" (rest phase, 575–577) | `handleSkipRest` (534) → `advanceExercise` | none | none | **MOCK/HARDCODED** |
| Pause/Resume footer (744–756) | inline `setIsPaused(p => !p)` | none | none | local timer state |
| Skip footer (`play-skip-forward`, 759–762) | `handleSkipExercise` (530) → `advanceExercise` | none | none | local state |
| Pain-level circle 1/3/5/7/9 (complete view, 233–247) | inline `setSelectedPain(level)` | none | none | **MOCK/HARDCODED** `painLevels` (190); "vs 5/10 before session" (228) hardcoded |
| "Save & Return Home" (complete view, 253–260) | inline `navigation.reset(… HOME)` — **navigation only; does NOT persist pain check-in or session** | none | none | n/a — selected pain + stats discarded (label says "Save" but saves nothing) |

(Exercise strip pills at 706–733 have no `onPress` — display only.) Countdown timers auto-advance via `setInterval` (446–490), all local. Header "Morning Mobility" (672) and "Great work, Priya!" (207) are hardcoded strings.

### States
- **Loading:** absent (no network; local timer/animation only)
- **Empty:** absent (fixed 5-exercise array)
- **Error:** only as confirmation guard — `handleBack` → `Alert.alert('End session?', …)` (539–550). No data-error path.

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

# `src/screens/messages/`

## MessagesScreen
**Path:** `/Users/gouravshokeen/Downloads/backend-repo/movement-with-physios-patient/src/screens/messages/MessagesScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| "+" new-chat icon (Ionicons `add`, header) | `openPicker` (51) | `chatService.listAvailableTherapists` | GET `/api/v1/therapists` | REAL |
| Conversation list row (`ConversationRow` onPress, 89/125) | `handleConversationPress(item)` → navigate CHAT_ROOM | none | none | data via `getConversations` → GET `/chat/rooms` |
| Therapist picker row (`therapistRow`, 68/141) | `startChatWith(item)` | `chatService.createRoom` | POST `/api/v1/chat/rooms` | REAL |
| Modal backdrop Pressable (197) | `closePicker` (64) | none | none | n/a |
| Modal `onRequestClose` (Android back, 195) | `closePicker` | none | none | n/a |

(Initial load + focus listener: `loadConversations` → `getConversations` → GET `/chat/rooms`, REAL.)

### States
- **Loading:** present — `loading` defaults true → centered `ActivityIndicator` (170–173); picker has own `therapistsLoading` spinner (201–204)
- **Empty:** present — 💬 + "No conversations yet" + "Tap the + button above…" (109–119); picker empty: "No therapists available yet." (205–210)
- **Error:** **Alert.alert** only — `listAvailableTherapists` fail → `Alert.alert('Could not load therapists', …)` (58); `createRoom` fail → `Alert.alert('Could not start chat', …)` (72). **No inline banner.** `getConversations` failure is **silently swallowed** (no `else`, 38–41) → shows empty state, not error.

### TODO/FIXME/XXX
- `MessagesScreen.jsx:79` (in comment 78–80) — references "see TODO in chatService.js" re: unpopulated participants. No literal `TODO:`/`FIXME`/`XXX` token in this file.

### Diagnostic console.log
none

---

## ChatRoomScreen
**Path:** `/Users/gouravshokeen/Downloads/backend-repo/movement-with-physios-patient/src/screens/messages/ChatRoomScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| back arrow (Ionicons `chevron-back`, 270) | inline `navigation.goBack()` | none | none | n/a |
| **Video-call header icon** | **NOT PRESENT** — header has only back arrow + avatar + name + online status (267–288). The doc's "video-call placeholder" icon does not exist in this file. | — | — | — |
| paperclip / attach (Ionicons `attach`, 73/338) | `openAttachmentSheet` | none (opens local sheet) | none | n/a |
| TextInput onChangeText (348) | `handleChangeText` → `notifyTyping` (184) | `chatService.setTyping` | socket only (`/chat` ns), no REST | REAL (socket) |
| TextInput submit | none — `multiline`, `blurOnSubmit={false}`, **no `onSubmitEditing`** (345–355) | — | — | no send-on-enter |
| send button (Ionicons `arrow-up`, 361) | `handleSend` (200) | `chatService.sendMessage` | POST `/api/v1/chat/rooms/:id/messages` | REAL |
| message bubble long-press (`MessageBubble` onLongPress, 234/245) | `handleLongPress(item)` → sets `replyTo` | none | none | n/a |
| FlatList `onScrollBeginDrag` (310) | inline `Keyboard.dismiss()` | none | none | n/a |
| Composer PanResponder release (swipe-down, 94–98) | inline `Keyboard.dismiss()` | none | none | n/a |
| ReplyPreview close (Ionicons `close`, onDismiss, 331) | inline `setReplyTo(null)` | none | none | n/a |
| AttachmentSheet "Camera" | `handleOptionPress('Camera')` → **GHOST** (AttachmentSheet.jsx:67–70, `console.log` + close) | none | none | n/a |
| AttachmentSheet "Gallery" | `handleOptionPress('Gallery')` → **GHOST** | none | none | n/a |
| AttachmentSheet "Document" | `handleOptionPress('Document')` → **GHOST** | none | none | n/a |
| AttachmentSheet "Files" | `handleOptionPress('Files')` → **GHOST** | none | none | n/a |
| AttachmentSheet "Location" | `handleOptionPress('Location')` → **GHOST** | none | none | n/a |
| AttachmentSheet "Audio" | `handleOptionPress('Audio')` → **GHOST** | none | none | n/a |
| AttachmentSheet backdrop / `onRequestClose` | `handleClose` → `slideDown(onClose)` → `closeAttachmentSheet` | none | none | n/a |

(Mount: `loadMessages` → `getMessages` then `markAsRead` → GET `/chat/rooms/:id/messages` + POST `/chat/rooms/:id/read`, REAL. Socket: `subscribeToRoom` onMessage/onTyping/onReadBy, 135–166; onMessage also calls `markAsRead`, 147.)

### States
- **Loading:** present — `loading` defaults true → centered `ActivityIndicator` (293–296); composer stays visible (rendered outside ternary)
- **Empty:** **absent** — no `ListEmptyComponent`; empty conversation renders a blank list (only `TypingIndicator` header)
- **Error:** **none** — `getMessages` failure silently swallowed (no `else`, 106–110); `sendMessage` failure leaves optimistic message in place with no reconciliation/retry/error (no `else`, 221–229). No Alert, no banner.

### TODO/FIXME/XXX
none

### Diagnostic console.log
- Rendered child `AttachmentSheet.jsx:68` — `console.log('[AttachmentSheet] selected:', label)` — fires from all 6 attachment options (diagnostic/placeholder)

---

# `src/screens/splash/`

## SplashScreen
**Path:** `/Users/gouravshokeen/Downloads/backend-repo/movement-with-physios-patient/src/screens/splash/SplashScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn | Backend endpoint | Data source |
|---|---|---|---|---|
| (none — auto-advance) | `useEffect` `setTimeout` 2500ms → `navigation.replace(LOGIN)` (14–22) | none | none | n/a |

No tappable elements — logo display that auto-navigates to LOGIN after 2500ms (timer cleared on unmount, 19–21).

### States
- **Loading:** N/A (it is itself a transient splash)
- **Empty:** N/A
- **Error:** none

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

# `src/screens/video/`

## PreCallLobbyScreen
**Path:** `/Users/gouravshokeen/Downloads/backend-repo/movement-with-physios-patient/src/screens/video/PreCallLobbyScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| "Join Call" (videocam icon + text, 210–217) | `handleJoin` (121) — stops local preview tracks + `navigation.replace(VIDEO_CALL)` | none (navigation only) | none | REAL (gated on `call.canJoin` from `getCall`) |
| back arrow (header, 174–176) | `handleBack` (140) → `navigation.goBack()` | none | none | n/a |
| back arrow (error state, 160–162) | `handleBack` (140) → `navigation.goBack()` | none | none | n/a |
| Local camera preview (RTCView, 184) — not pressable | mount `mediaDevices.getUserMedia` (95) | none (device media) | none | REAL (local camera/mic) |

Backing data: mount + 5s-poll `getCall(callId)` (70–85) → `videoCallService.getCall` → GET `/api/v1/video/calls/:callId` (REAL), gates the Join button.

### States
- **Loading:** present — `loading` true until first `getCall` resolves (60/77) → `ActivityIndicator` + "Loading session…" (144–153)
- **Empty:** present (waiting variant) — `call` loaded but `!call.canJoin` → "The join window opens shortly before the scheduled time." (203–207), Join disabled/greyed (211–213); preview "Starting camera…" placeholder (191–197)
- **Error:** present, two kinds — (1) call-load error → full-screen inline `errorText` + Back (155–166); (2) camera preview error → inline `previewError` text inside preview box (194). No Alert.

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

## VideoCallScreen
**Path:** `/Users/gouravshokeen/Downloads/backend-repo/movement-with-physios-patient/src/screens/video/VideoCallScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn (name + file) | Backend endpoint + method | Data source |
|---|---|---|---|---|
| Mute toggle (mic/mic-off, 238–244) | `hook.toggleMute` (useVideoCall.js:299) — flips local audio track + `isMuted` | none | none | REAL local-state control |
| Camera toggle (videocam/videocam-off, 245–251) | `hook.toggleCamera` (useVideoCall.js:306) — flips local video track + `isCameraOff` | none | none | REAL local-state control |
| End call (phone icon rot. 135°, 252–254) | `handleEndCall` (119) → `hook.leave` (useVideoCall.js:113) then `navigation.replace(SESSION_ENDED)` | `videoCallService.leaveCall` + socket emit | socket `/video`: `end_call` (useVideoCall.js:115) **AND** POST `/api/v1/video/calls/:id/leave` (HTTP backstop, :117) | REAL |
| Switch/flip camera (camera-reverse, 255–257) | `hook.switchCamera` (useVideoCall.js:313) — native `_switchCamera()` | none | none | REAL local-state control |
| "Retry" (error overlay, 220–222) | `hook.join` (useVideoCall.js:124) | `videoCallService.joinCall` (+ getIceConfig via join resp) + socket connect/emits | POST `/api/v1/video/calls/:id/join` (:140); socket `/video`: `join_call` (:220), `offer` (:206), `ice_candidate` (:183) | REAL |
| "End" (error overlay, 223–226) | `handleEndCall` (119) → `hook.leave` then `navigation.replace(SESSION_ENDED)` | `videoCallService.leaveCall` + socket emit | socket `/video`: `end_call`; POST `/api/v1/video/calls/:id/leave` | REAL |
| Draggable PiP (Animated.View + PanResponder, 185–197) | PanResponder pan handlers (146–163) — local drag reposition | none | none | REAL local UI gesture |

(Mount: `getCall(callId)` for top-bar name (73–83), GET `/api/v1/video/calls/:id`, REAL. Mount: `hook.join()` auto-invoked once (95–101) — same chain as Retry. `useEffect` auto-navigates to SESSION_ENDED when `hook.callStatus === 'ended'`, 129–138.)

### States
- **Loading:** present — no remote stream → full-screen `ActivityIndicator` + "Waiting for therapist…" (172–181); also "Connection failed" text here when `callStatus === 'failed'` (178)
- **Empty:** present — same waiting placeholder serves no-remote-peer; local PiP not rendered until `localUrl` exists (184–197)
- **Error:** present — **inline overlay** (NOT Alert) when `hook.error === 'PEER_CONNECTION_FAILED'` or `'OTHER_PARTY_NOT_ANSWERING'` (214–229): "No answer" / "Connection failed" + Retry + End

### TODO/FIXME/XXX
none ("budget" at line 50 is a comment, not a token)

### Diagnostic console.log
None in this file directly. Handlers route into `useVideoCall.js` / `videoSocket.js`, whose diagnostic logs fire (see below).

---

## SessionEndedScreen
**Path:** `/Users/gouravshokeen/Downloads/backend-repo/movement-with-physios-patient/src/screens/video/SessionEndedScreen.jsx`

### Interactive elements
| Visible label / icon | Handler fn | Service fn | Backend endpoint | Data source |
|---|---|---|---|---|
| "Back to Messages" (58–60) | `handleBackToHome` (43) → `navigation.popToTop()` | none | none | n/a |

**Label/intent mismatch:** button reads "Back to Messages" (59) while handler/comments say "Back to Home" and call `popToTop()` (43–47). `durationSeconds` from route params (no fetch). No assessment fetch (intentionally removed for patient).

### States
- **Loading:** none (static)
- **Empty:** none — `durationSeconds` defaults 0 → "Duration: 0:00" (32–37, 56)
- **Error:** none

### TODO/FIXME/XXX
none

### Diagnostic console.log
none

---

## Diagnostic console.logs in the video signaling layer (fire from the screens above)

These live in `src/lib/videoSocket.js` and are triggered by VideoCallScreen handlers (`hook.join` from Retry/mount; `handleEndCall`/`hook.leave`; WebRTC signaling). Added during a recent debugging arc — **temporary diagnostics**:

| file:line | log |
|---|---|
| `src/lib/videoSocket.js:41` | `console.log('[videoSocket] connect() called', { hasSocket, connected, connecting })` |
| `src/lib/videoSocket.js:76` | `console.log('[videoSocket] reconnect_attempt', { attempt })` |
| `src/lib/videoSocket.js:120` | `console.log('[videoSocket] connected', { socketId })` |
| `src/lib/videoSocket.js:130` | `console.warn('[videoSocket] connect_error', { message, description, context, type })` |
| `src/lib/videoSocket.js:149` | `console.warn('[videoSocket] connect timeout fired')` |
| `src/lib/videoSocket.js:208` | `console.log('[videoSocket] emit', { event, sent })` (fires on every `join_call`/`offer`/`ice_candidate`/`end_call`) |

(`useVideoCall.js` contains no `console.log`/`console.warn` of its own.)

---

# Summary

### Counts
- **Total screens:** 26
- **Total interactive elements (table entries across all screens):** ~112
  *(Methodology: counts each table row. Multi-option grids — e.g. PainLocation's 8 cards, PainSeverity's 10 circles, the 6 AttachmentSheet options — are listed as one entry each except where individually broken out; non-pressable display elements such as the Home ellipsis icon and SessionScreen exercise strip are excluded.)*
- **GHOST elements (onPress missing/empty/console.log-only):** **7**
  1. `HomeScreen.jsx:125` — 🔔 Notifications bell, `onPress={function () {}}` (empty)
  2–7. `ChatRoomScreen` → `AttachmentSheet.jsx:67–70` — 6 share options (Camera, Gallery, Document, Files, Location, Audio), each only `console.log('[AttachmentSheet] selected:', label)` then closes
- **MOCK / hardcoded-backed flows:** **6**
  1. **Onboarding submit** (`AvailabilityScreen` → `mockOnboardingService.submitOnboarding`) — MOCK; backend never receives the full profile (only best-effort `painLocation` via PATCH `/patient/profile`)
  2. **SessionScreen** exercise player — entirely MOCK/hardcoded (`SESSION_EXERCISES`); "Save & Return Home" persists nothing
  3. **ProgressScreen** — 100% hardcoded charts/stats/achievements; no service calls
  4. **SlotSelectionScreen** — hardcoded `TIME_SLOTS` + date + fee; "Confirm Booking" creates no real booking
  5. **BookingConfirmedScreen** — hardcoded meeting link, date, duration, fee, type, therapist fallback; no booking fetched/created
  6. **HomeScreen** — all content from PatientContext (mock data per app docs)

### Full list of TODO/FIXME/XXX hits (file:line)
- `src/screens/main/HomeScreen.jsx:124` — `{/* TODO: Notifications screen not yet built */}`
- `src/services/chatService.js:37` — `TODO(backend): make POST /chat/rooms .populate('participants') to match the GET shape.` *(service file; referenced by `MessagesScreen.jsx:79` comment)*

*(No `FIXME` or `XXX` tokens found in any screen file.)*

### Other notable (non-GHOST) gaps & inconsistencies
- **`SessionScreen` "Save & Return Home"** — label implies persistence; handler only does `navigation.reset` to HOME. `selectedPain` and session stats are discarded. Not a GHOST (it does navigate) but functionally a no-save.
- **`SessionEndedScreen`** — button label "Back to Messages" contradicts handler (`popToTop`, commented "Back to Home").
- **Silently-swallowed failures (no user-facing error):** `ChatRoomScreen` `getMessages` + `sendMessage` (optimistic message never reconciled); `MessagesScreen` `getConversations`; `AppointmentsRootScreen` `listProposals`/`listBookings`; `PersonalInfoScreen` `me/init`; `AvailabilityScreen` real-profile push (logs `console.warn` only).
- **Dead code:** `MOCK_PROPOSALS` (`AppointmentsRootScreen.jsx:28–36`) is unreachable behind `USE_MOCK_PROPOSALS = false`. `ComposerBar.jsx` is not imported by any screen (ChatRoomScreen inlines its own composer); its "Attach file (coming soon)" Pressable has **no** `onPress` (a GHOST in dead code — not counted above since it is not rendered on any screen).
- **Stale documentation:** `CLAUDE.md` describes a video-call icon in the `ChatRoomScreen` header and a 3s typing-status poll; neither exists in the current file (typing is live via socket `subscribeToRoom`).
- **Unguarded params:** `SlotSelectionScreen` reads `route.params.therapist` with no guard (would throw if navigated without it).

### Backend-connected (REAL) flows confirmed
Chat (rooms/messages/read/create + socket), proposals (list/accept/decline), bookings (list/get/cancel + instant via `InstantCallModal`, which is not rendered by the audited screen set), video calls (get/join/leave/ice + `/video` socket), push-token register/clear, patient-profile painLocation update, and Clerk auth pre-flight (`/auth/email-status`, `/auth/me/init`).
