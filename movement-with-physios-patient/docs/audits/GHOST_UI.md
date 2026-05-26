# MWP Ghost-UI Sweep — Patient & Therapist (Read-Only)

**Date:** 2026-05-26
**Output location:** patient repo root (`movement-with-physios-patient/GHOST_UI.md`)
**Apps:** Patient (`movement-with-physios-patient/src`) · Therapist (`movement-with-physios/apps/therapist/src`)
**Convention referenced:** project says error feedback should be inline banners, not `Alert.alert` (Cat 9).

---

# ▲ TOP SUMMARY

## HIGH — user-visible broken (reachable screen, looks interactive, does nothing / shows fake identity)

| # | Finding | file:line | Cat |
|---|---|---|---|
| H1 | Therapist Dashboard **"Add New Appointment"** button — no `onPress` (primary CTA, dead) | `dashboard/DashboardScreen.jsx:312` | 1 |
| H2 | Therapist Dashboard notification **bell** — no `onPress` | `dashboard/DashboardScreen.jsx:175` | 1 |
| H3 | Therapist Dashboard **"View All"** ×2 (Appointments / Recent Activity) — no `onPress` | `dashboard/DashboardScreen.jsx:267,320` | 1 |
| H4 | Therapist AllClients **client card rows** — no `onPress` (tap a client → nothing opens) | `dashboard/AllClientsScreen.jsx:184` | 1 |
| H5 | Therapist AssignFlow **"Assign Exercises"** — fake success modal, persists nothing | `AssignFlow/ReviewAssignmentScreen.js:177-184` | 4 |
| H6 | Patient Home notification **bell** — `onPress={function () {}}` (empty) | `screens/main/HomeScreen.jsx:125` | 1 |
| H7 | Patient Session complete shows hardcoded name **"Great work, Priya!"** to every user | `screens/main/SessionScreen.jsx:207` | 6 |
| H8 | Patient Profile menu rows (Personal Info / Notifications / Settings / Help) — chevron rows that only fire `Alert.alert('Coming soon')` | `screens/main/ProfileScreen.jsx:138` (+rows 170-189) | 3/7 |

## Counts per category

| Cat | Description | Count |
|---|---|---|
| 1 | Pressables with no `onPress` / `() => {}` / log-only handler | **~14 elements** (9 sites) |
| 2 | Tabs/segments/state set but never read | **1** |
| 3 | Settings rows with chevron but no nav target | **1 site (4 rows)** |
| 4 | Submit handlers empty / TODO / log-only | **6** (UI) + service-layer TODOs |
| 5 | Orphan screens (registered, unreachable) | **5** (+2 dead unregistered files) |
| 6 | Hardcoded fake data still rendering | **6 sites** |
| 7 | "Coming Soon" / "Placeholder" UI labels | **3** (1 reachable) |
| 8 | Hardcoded `disabled={true}` | **0** ✅ |
| 9 | `Alert.alert(` calls (convention = inline banners) | **39** (15 patient / 24 therapist) |

---

# Category 1 — Pressables with no / empty / log-only handler

### Patient Home — notification bell (empty handler) · `screens/main/HomeScreen.jsx:125` · **HIGH**
```jsx
{/* TODO: Notifications screen not yet built */}
<Pressable style={styles.iconBtn} onPress={function () {}}>
  <Ionicons name="notifications-outline" ... />
</Pressable>
```

### Patient AttachmentSheet — 6 share options, log-only · `components/chat/AttachmentSheet.jsx:67-70` · **MED**
```jsx
function handleOptionPress(label) {
  console.log('[AttachmentSheet] selected:', label);
  slideDown(onClose);
}
```
Reachable via the chat composer paperclip; Camera/Gallery/Document/Files/Location/Audio all look functional, none act.

### Patient Profile — modal card no-op (intentional backdrop-swallow, NOT a bug) · `screens/main/ProfileScreen.jsx:214` · **LOW**
```jsx
<Pressable style={styles.modalCard} onPress={function () {}}>
```

### Therapist Dashboard — bell / "View All" ×2 / "Add New Appointment", all missing `onPress` · `dashboard/DashboardScreen.jsx:175,267,312,320` · **HIGH**
```jsx
<TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.75}>      // :175 bell
<TouchableOpacity activeOpacity={0.7}><Text style={styles.viewAll}>View All</Text>  // :267, :320
<TouchableOpacity style={styles.addApptBtn} activeOpacity={0.8}>          // :312 Add New Appointment
```

### Therapist AllClients — Filter button + client card, missing `onPress` · `dashboard/AllClientsScreen.jsx:151,184` · **HIGH (card) / MED (filter)**
```jsx
<TouchableOpacity style={styles.filterBtn} activeOpacity={0.8}>          // :151 Filter — no onPress
...
<TouchableOpacity key={client.id} style={styles.clientCard} activeOpacity={0.85}>  // :184 — no onPress
```

### Therapist ExerciseLibrary — Filter button, missing `onPress` · `exercises/ExerciseLibraryScreen.jsx:218` · **MED**
```jsx
<TouchableOpacity style={styles.filterBtn} activeOpacity={0.8}>
  <Ionicons name="options-outline" size={16} ... />
```

### Therapist ChatScreen — voice-message "Play" button, missing `onPress` · `components/chat/MessageBubble.jsx:154` · **MED**
```jsx
<TouchableOpacity style={styles.playBtn} activeOpacity={0.8}>
  <Ionicons name="play" ... />   // audio never plays
```

### Therapist TherapistPortal — "Sign In" handler is log-only · `screens/auth/TherapistPortalScreen.jsx:30-36` · **LOW (screen is orphan, see Cat 5)**
```jsx
const handleSignIn = () => {
  console.log('[MOCK] Sign In — Email:', email);
  // TODO: import AuthService and call AuthService.login(email, password)
};
```

### Patient ComposerBar — attach icon, no `onPress` ("coming soon") · `components/chat/ComposerBar.jsx:69-72` · **LOW (dead — not imported by ChatRoomScreen)**

---

# Category 2 — State set but never read

### Therapist Dashboard — `searchText` updates but filters nothing · `dashboard/DashboardScreen.jsx:65,196-197` · **MED**
```jsx
const [searchText, setSearchText] = useState('');           // :65
<TextInput value={searchText} onChangeText={setSearchText} placeholder="Search clients..." />  // :196
```
The Dashboard renders no client list keyed off `searchText` — typing does nothing. (By contrast MessagesScreen / AllClients / SelectClient / ExerciseLibrary search states ARE used to filter — those are fine.)

---

# Category 3 — Settings rows with chevron but no nav target

### Patient Profile — 4 menu rows, chevron-forward → `Alert('Coming soon')` · `screens/main/ProfileScreen.jsx:34 (chevron), 137-138, 170-189` · **MED**
```jsx
function handleComingSoon() { Alert.alert('Coming soon', '', [{ text: 'OK' }]); }   // :137
// MenuRow renders: <Ionicons name="chevron-forward" .../>   (:34)
// Personal Information / Notifications / Settings / Help & Support all → handleComingSoon
```
Chevron implies navigation; rows instead fire a "Coming soon" alert. (The 5th row, "Primary body part", does open a real modal.)

*(Other `chevron-forward` occurrences — MessagesScreen:151 picker row, QuickRepliesSheet, CalendarPicker — sit inside rows/components that DO act; not ghosts.)*

---

# Category 4 — Submit handlers empty / TODO / log-only

### Therapist AssignFlow "Assign Exercises" — fake success, persists nothing · `AssignFlow/ReviewAssignmentScreen.js:177-184` · **HIGH**
```js
const handleAssign = () => {
  // TODO: call AssignmentService.assignExercises({...})
  // TODO: backend exercise plugin was deleted in Phase A Item 5 cleanup
  setShowSuccess(true);   // shows "All Done! Exercises assigned" — but nothing saved
};
```

### Therapist verification "Continue" handlers — `console.log('[MOCK]')` + navigate, persist nothing · **MED**
```
ProfessionalCredentialsScreen.jsx:84-86   console.log('[MOCK] Professional credentials saved', payload); navigate(...)
GovernmentIDVerificationScreen.jsx:176    console.log('[MOCK] Government ID saved', payload); navigate(...)   (images never uploaded)
ProfilePhotoScreen.jsx:103                console.log('[MOCK] Profile photo saved', photo.uri); navigate(...)
ScheduleVerificationCallScreen.jsx:88     console.log('[MOCK] Verification call scheduled', selected.key); navigate(...)
```

### Therapist TherapistPortal "Sign In" — log-only (see Cat 1) · `TherapistPortalScreen.jsx:30` · **LOW (orphan)**

*Service-layer TODO submit stubs (not UI, for reference):* `services/auth/AuthService.js:37,97,161`, `services/AuthService.js:42`, `services/auth/OtpService.js:34,77`, `services/auth/tokenStorage.js:23,39,54`, `hooks/useLoginForm.js:29-30`.

---

# Category 5 — Orphan screens (registered in navigator, no UI path reaches them)

### Therapist (all in `navigation/`)
| Screen | Registered | Reachable? | Severity |
|---|---|---|---|
| **Register** | `AuthNavigator.jsx:28` | No `navigate('Register')` anywhere — LoginScreen routes both CTAs to `ClerkAuth` | **MED** orphan |
| **TherapistPortal** | `AuthNavigator.jsx:29` | No `navigate('TherapistPortal')` anywhere | **MED** orphan (its Sign-In is also log-only) |
| **ForgotPassword** | `AuthNavigator.jsx:27` | Only `navigate('ForgotPassword')` is from TherapistPortal (itself orphan) → transitively unreachable | **MED** orphan |
| **RegistrationNextStep** | `AuthNavigator.jsx:31` | No `navigate('RegistrationNextStep')` anywhere | **MED** orphan |
| **OnboardingNext** | `AppStack.jsx:71` | No `navigate('OnboardingNext')` — flow goes PersonalInfo→ProfessionalCredentials; renders "This step is coming soon." | **MED** orphan |

*Verified reachable (not orphans):* all other AppStack screens; tab routes confirmed — `ROUTES.CLIENTS='AllClients'`, `EXERCISES='ExerciseLibrary'`, `MESSAGES='Messages'`, `CHAT='Chat'`, `DASHBOARD='Dashboard'` (`constants/routes.js`) all match registered names. `ScheduleVerificationCall` reached via `const NEXT_SCREEN` in ProfilePhoto.

### Dead screen files (not registered anywhere) — **LOW**
- Patient `screens/main/BookScreen.jsx` — static "Book" placeholder; not imported/registered (grep found only its own definition).
- Therapist `screens/SplashScreen.jsx` — legacy root-level duplicate; the active splash is `screens/splash/SplashScreen.jsx`.

### Unused route constants (defined, no screen, no nav) — **LOW**
- Therapist `ROUTES.SCHEDULE='Schedule'`, `ROUTES.PATIENT_LIST='PatientList'`, `ROUTES.SELECT_CLIENT`/`SET_SCHEDULE`/`REVIEW_ASSIGNMENT` (the AssignFlow sub-stack uses its own names) — `constants/routes.js:6-7,15-17`.

---

# Category 6 — Hardcoded fake data still rendering

### Patient Session — hardcoded user name + baseline · `screens/main/SessionScreen.jsx:207,228` · **HIGH**
```jsx
<Text style={completeStyles.subtitle}>Great work, Priya!</Text>   // :207
// "vs 5/10 before session" hardcoded :228
```

### Patient BookingConfirmed — fake therapist + booking literals · `screens/main/BookingConfirmedScreen.jsx:75` · **MED**
```jsx
var therapist = route.params?.therapist ?? { name: 'Dr. Sarah James', specialization: 'Physiotherapist' };
// MEETING_LINK, "Today, Feb 15 2026", "30 Minutes", "₹500" also hardcoded
```

### Therapist AssignFlow — `MOCK_CLIENTS` renders in the live wizard · `AssignFlow/SelectClientScreen.js:23` · **MED**
```js
{ id: '1', name: 'Priya Sharma', condition: 'Lower Back Pain', initials: 'PS', avatarColor: '#6366F1' },
```

### Therapist ChatScreen — mock seed messages/name (no-roomId path) · `messages/ChatScreen.jsx:55,124` · **MED**
```js
content: "That's excellent progress, Priya! How is the pain level today?",   // :55
name: 'Priya Sharma',                                                         // :124
```

### Therapist AllClients — fabricated `status: 'Good'` for every client · `dashboard/AllClientsScreen.jsx` (`normalizeClient`) · **MED**
Real id/name from backend, but `status:'Good'`, `age`, `condition`, `adherence` are hardcoded placeholders rendered as if real.

### Therapist Dashboard — "Avg Adherence" stat hardcoded `'—'` · `dashboard/DashboardScreen.jsx:234` · **LOW**

*(Not rendered — comments/services only: `PatientContext.jsx:7,27` note the OLD "Priya"/fake data was removed; `services/auth/*.js` "Dr. Sarah Mitchell" / `9876543210` live in mock-service bodies/JSDoc.)*

---

# Category 7 — "Coming Soon" / "Placeholder" / WIP labels (rendered)

| Label | file:line | Severity |
|---|---|---|
| `Alert.alert('Coming soon', ...)` (Profile menu rows) | `screens/main/ProfileScreen.jsx:138` | **MED** (reachable) |
| "This step is coming soon." (OnboardingNext) | therapist `screens/auth/OnboardingNext.jsx:17` | **LOW** (orphan screen) |
| a11y label "Attach file (coming soon)" (ComposerBar) | patient `components/chat/ComposerBar.jsx:72` | **LOW** (dead component) |

*(All other "placeholder" hits are legitimate `placeholder="..."` TextInput props or `colors.placeholder` / loading placeholders — not ghost labels.)*

---

# Category 8 — Hardcoded `disabled={true}`

**None.** No literal `disabled={true}` found in either app — all `disabled` props are conditional (e.g. `disabled={!email.trim() || loading}`). ✅

---

# Category 9 — `Alert.alert(` calls (convention: inline banners only)

**39 total — 15 patient / 24 therapist.** Most are error/confirm feedback that the project convention says should be inline banners. Severity **LOW** unless it is the only feedback path; the "Coming soon" alert (Cat 3/7) is **MED**.

### Patient (15)
```
screens/messages/MessagesScreen.jsx:58   'Could not load therapists'
screens/messages/MessagesScreen.jsx:72   'Could not start chat'
screens/auth/ClerkAuthScreen.jsx:63,92,98,104,134,152,156   (auth errors ×7)
screens/main/BookingConfirmedScreen.jsx:121   'Opening Calendar' (stub)
screens/main/ProfileScreen.jsx:116   'Log out' confirm
screens/main/ProfileScreen.jsx:130   'Error' sign-out failed
screens/main/ProfileScreen.jsx:138   'Coming soon'        ← MED
screens/booking/WaitingForTherapistScreen.jsx:155   'Could not cancel'
lib/ClerkTokenBridge.jsx:85   'Email already in use'
screens/main/SessionScreen.jsx:539   'End session?' confirm
```

### Therapist (24)
```
screens/messages/MessagesScreen.jsx:85,94   load clients / start chat
screens/bookings/BookingDetailScreen.jsx:107,110,122,127,135   accept/decline/cancel ×5
screens/auth/ClerkAuthScreen.jsx:57,100,103,125,134,138   auth errors ×6
screens/auth/ProfilePhotoScreen.jsx:61,84,94   image-picker errors ×3
screens/auth/GovernmentIDVerificationScreen.jsx:93,120,130,148   image-picker errors ×4
components/notifications/IncomingInstantCallModal.jsx:94,106   accept/decline ×2
lib/ClerkTokenBridge.jsx:88   'Email already in use'
```

---

## Notes on severity model
- **HIGH** = on a reachable screen, the element looks interactive/finished but does nothing useful or shows a false identity to the user.
- **MED** = reachable but lower-impact (secondary control, mock data behind a clearly-WIP flow, dead-state input, convention violation that's still functional).
- **LOW** = not user-reachable (orphan/dead code), intentional no-op (backdrop swallow), or non-rendered references.

*End of sweep. No files were modified.*
