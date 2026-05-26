# Tier 3 — Read-Only Investigation

Date: 2026-05-26 · Scope: both MWP apps · **No code modified.**

- Patient: `movement-with-physios-patient/`
- Therapist: `movement-with-physios/apps/therapist/`

---

## Section 1 — `BookingDetailScreen` Alert.alert classification

File: `movement-with-physios/apps/therapist/src/screens/bookings/BookingDetailScreen.jsx`
The 5 audit-listed Alerts are the **only** Alerts in this file (grep confirmed — no others). `Alert` is imported at line 26.

### 1a · Line 107 — `handleAccept` success
```js
async function handleAccept() {        // 101
    if (acting) return;                  // 102
    setActing(true);                     // 103
    var r = await acceptInstant(bookingId); // 104
    setActing(false);                    // 105
    if (r.success) {                     // 106
      Alert.alert('Accepted', 'You accepted the instant call request.'); // 107
      load();                            // 108
    } else {                             // 109
      Alert.alert('Error', r.error || 'Failed to accept'); // 110
    }                                    // 111
  }                                      // 112
```
- **Classification: SUCCESS notification** (inside `if (r.success)`, after a *successful* action — not an error, not a confirm).
- **Recommended: CONVERT → InlineBanner** (`variant:'success'`, auto-hide).

### 1b · Line 110 — `handleAccept` failure
(context above) — `else` branch after `acceptInstant` returns `!success`.
- **Classification: ERROR** (post-failed-action).
- **Recommended: CONVERT → InlineBanner** (`variant:'error'`).

### 1c · Line 122 — `handleDecline` failure
```js
async function handleDecline() {       // 114
    if (acting) return;                  // 115
    setActing(true);                     // 116
    var r = await declineInstant(bookingId); // 117
    setActing(false);                    // 118
    if (r.success) {                     // 119
      navigation.goBack();               // 120
    } else {                             // 121
      Alert.alert('Error', r.error || 'Failed to decline'); // 122
    }                                    // 123
  }                                      // 124
```
- **Classification: ERROR** (post-failed-action).
- **Recommended: CONVERT → InlineBanner** (`variant:'error'`).

### 1d · Line 127 — `handleCancel` destructive confirm
```js
function handleCancel() {                                   // 126
    Alert.alert('Cancel booking?', 'This cannot be undone.', [ // 127
      { text: 'Keep', style: 'cancel' },                      // 128
      {                                                       // 129
        text: 'Cancel booking', style: 'destructive', onPress: async function () { // 130
          var r = await cancelBooking(bookingId);             // 131
          if (r.success) {                                    // 132
            navigation.goBack();                              // 133
          } else {                                            // 134
            Alert.alert('Error', r.error || 'Failed to cancel'); // 135
          }                                                   // 136
        }                                                     // 137
      }                                                       // 138
    ]);                                                       // 139
  }                                                           // 140
```
- **Classification: CONFIRM** (destructive 2-button prompt *before* acting).
- **Recommended: KEEP as Alert.** A banner can't capture a yes/no decision; native confirm dialog is the right tool for destructive confirmation.

### 1e · Line 135 — cancel failure (inside the destructive `onPress`)
(context above) — fires after `cancelBooking` returns `!success`.
- **Classification: ERROR** (post-failed-action, nested in the confirm callback).
- **Recommended: CONVERT → InlineBanner** (`variant:'error'`).

**File summary:** 4 convert (1 success + 3 error) · 1 keep (destructive confirm). No missed Alerts.

---

## Section 2 — Full Alert.alert inventory (re-grep)

Command (per repo): `grep -rn "Alert\.alert(" src/ --include="*.jsx" --include="*.js"`

### PATIENT — 9 calls
| File:line | Title | Message (≤60) | Type | Function |
|---|---|---|---|---|
| `lib/ClerkTokenBridge.jsx:85` | Email already in use | `(init.error…) + "\n\nUse a different email to sign in to th…` | ERROR (409 role) | init effect (`me/init` 409) |
| `screens/booking/WaitingForTherapistScreen.jsx:155` | Could not cancel | `resp.error \|\| 'Try again'` | ERROR | `handleCancel` |
| `screens/main/BookingConfirmedScreen.jsx:121` | Opening Calendar | `This will add your session to your calendar.` | **INFO/STUB** | `handleAddToCalendar` |
| `screens/main/ProfileScreen.jsx:116` | Log out | `Are you sure you want to log out?` | CONFIRM | `handleLogout` |
| `screens/main/ProfileScreen.jsx:130` | Error | `Could not sign out. Please try again.` | ERROR | `handleLogout` (catch) |
| `screens/main/ProfileScreen.jsx:138` | Coming soon | `(empty)` | **INFO/STUB** | `handleComingSoon` |
| `screens/main/SessionScreen.jsx:539` | End session? | `Your progress will be lost.` | CONFIRM | `handleBack` |
| `screens/messages/MessagesScreen.jsx:58` | Could not load therapists | `result.error \|\| 'Try again'` | ERROR | load-therapists handler |
| `screens/messages/MessagesScreen.jsx:72` | Could not start chat | `res.error \|\| 'Try again'` | ERROR | start-chat handler |

**Patient total: 9** (5 ERROR, 2 CONFIRM, 2 INFO/STUB).

### THERAPIST — 17 calls
| File:line | Title | Message (≤60) | Type | Function |
|---|---|---|---|---|
| `components/notifications/IncomingInstantCallModal.jsx:94` | Could not accept | `r.error \|\| 'Try again.'` | ERROR | `handleAccept` |
| `components/notifications/IncomingInstantCallModal.jsx:106` | Could not decline | `r.error \|\| 'Try again.'` | ERROR | `handleDecline` |
| `lib/ClerkTokenBridge.jsx:88` | Email already in use | `(init.error…) + "\n\nUse a different email to sign in to th…` | ERROR (409 role) | init effect (`me/init` 409) |
| `screens/auth/GovernmentIDVerificationScreen.jsx:93` | Permission required | `Please allow access to your photo library in Settings…` | ERROR (precond) | `pickImage` |
| `screens/auth/GovernmentIDVerificationScreen.jsx:120` | Invalid file type | `Please upload a JPG / JPEG image only.` | ERROR (validation) | `pickImage` |
| `screens/auth/GovernmentIDVerificationScreen.jsx:130` | File too large | `Maximum allowed size is ${MAX_FILE_SIZE_MB} MB…` | ERROR (validation) | `pickImage` |
| `screens/auth/GovernmentIDVerificationScreen.jsx:148` | Error | `Something went wrong while selecting the image…` | ERROR (catch) | `pickImage` |
| `screens/auth/ProfilePhotoScreen.jsx:61` | Permission required | `Please allow access to your photo library in Settings.` | ERROR (precond) | `pickPhoto` |
| `screens/auth/ProfilePhotoScreen.jsx:84` | File too large | `Maximum allowed size is ${MAX_FILE_SIZE_MB} MB…` | ERROR (validation) | `pickPhoto` |
| `screens/auth/ProfilePhotoScreen.jsx:94` | Error | `Something went wrong. Please try again.` | ERROR (catch) | `pickPhoto` |
| `screens/bookings/BookingDetailScreen.jsx:107` | Accepted | `You accepted the instant call request.` | **SUCCESS** | `handleAccept` |
| `screens/bookings/BookingDetailScreen.jsx:110` | Error | `r.error \|\| 'Failed to accept'` | ERROR | `handleAccept` |
| `screens/bookings/BookingDetailScreen.jsx:122` | Error | `r.error \|\| 'Failed to decline'` | ERROR | `handleDecline` |
| `screens/bookings/BookingDetailScreen.jsx:127` | Cancel booking? | `This cannot be undone.` | CONFIRM | `handleCancel` |
| `screens/bookings/BookingDetailScreen.jsx:135` | Error | `r.error \|\| 'Failed to cancel'` | ERROR | `handleCancel` (confirm cb) |
| `screens/messages/MessagesScreen.jsx:85` | Could not load clients | `res.error \|\| 'Try again'` | ERROR | `openNewChat` |
| `screens/messages/MessagesScreen.jsx:94` | Could not start chat | `res.error \|\| 'Try again'` | ERROR | `startChatWithClient` |

**Therapist total: 17** (14 ERROR, 1 CONFIRM, 1 SUCCESS, 1 the 409 is ERROR-class).

### Count reconciliation
| | Ghost-UI sweep (estimate) | Current (verified) |
|---|---|---|
| Patient | 15 | **9** |
| Therapist | 24 | **17** |
| **Combined** | **39** | **26** |

Phase 2 removed 13 Alerts (7 patient + 6 therapist ClerkAuthScreen). The current authoritative total is **26**. (The naive 39−13=26 matches the combined total; per-app the ghost-sweep split was slightly approximate, but the combined number reconciles exactly.)

---

## Section 3 — `colors.white` sweep (patient) — LATENT BUG CONFIRMED

`colors.white` **does not exist** in `src/constants/colors.js` (keys: `background, surface, surfaceElevated, primary, primaryLight, primaryDark, textDark, textMedium, textLight, textOnPrimary, border, divider, success, danger, warning, chip*, planCard*`). Every reference resolves to **`undefined`**.

**15 references, 0 masked by a fallback.** `grep "colors\.white *||"` → **zero** (the only `colors.white || '#fff'` fallback was in the old ClerkAuthScreen, removed in Phase 2). So **all 15 are now live undefined-references.**

Runtime effect: `backgroundColor: undefined` → renders transparent (no crash); `color: undefined` on `Ionicons`/text → falls back to default ink. Mostly *silent* because parents are already white — except selected-state text/icons that should be white-on-teal now render dark-on-teal (low-contrast visible glitch).

| File:line | Code | Intent |
|---|---|---|
| `components/auth/SelectableCard.jsx:51` | `backgroundColor: colors.white,` (`cardDefault`) | **BACKGROUND** → `colors.background` |
| `components/auth/SelectablePill.jsx:37` | `backgroundColor: colors.white,` (`pillDefault`) | **BACKGROUND** → `colors.background` |
| `screens/auth/AvailabilityScreen.jsx:140` | `backgroundColor: isSelected ? '#E0F7F2' : colors.white,` | **BACKGROUND** (unselected) → `colors.background` |
| `screens/auth/AvailabilityScreen.jsx:156` | `color={isSelected ? colors.white : colors.textLight}` | **ICON** (selected) → `colors.textOnPrimary` |
| `screens/auth/LoginScreen.jsx:100` | `backgroundColor: colors.white,` | **BACKGROUND** → `colors.background` |
| `screens/auth/LoginScreen.jsx:159` | `backgroundColor: colors.white,` | **BACKGROUND** → `colors.background` |
| `screens/auth/PainDurationScreen.jsx:67` | `backgroundColor: isSelected ? '#E0F7F2' : colors.white,` | **BACKGROUND** (unselected) → `colors.background` |
| `screens/auth/PainDurationScreen.jsx:81` | `color={isSelected ? colors.white : colors.textLight}` | **ICON** (selected) → `colors.textOnPrimary` |
| `screens/auth/PainSeverityScreen.jsx:98` | `backgroundColor: isSelected ? colors.primary : colors.white,` | **BACKGROUND** (unselected) → `colors.background` |
| `screens/auth/PainSeverityScreen.jsx:114` | `color: isSelected ? colors.white : colors.textDark,` | **FOREGROUND TEXT** (selected number on teal) → `colors.textOnPrimary` ⚠️ *visible low-contrast glitch* |
| `screens/auth/RecoveryGoalsScreen.jsx:86` | `backgroundColor: isSelected ? '#E0F7F2' : colors.white,` | **BACKGROUND** (unselected) → `colors.background` |
| `screens/auth/RecoveryGoalsScreen.jsx:102` | `color={isSelected ? colors.white : colors.textLight}` | **ICON** (selected) → `colors.textOnPrimary` |
| `screens/auth/TreatmentHistoryScreen.jsx:73` | `backgroundColor: isSelected ? '#E0F7F2' : colors.white,` | **BACKGROUND** (unselected) → `colors.background` |
| `screens/auth/TreatmentHistoryScreen.jsx:87` | `color={isSelected ? colors.white : colors.textLight}` | **ICON** (selected) → `colors.textOnPrimary` |
| `screens/splash/SplashScreen.jsx:39` | `backgroundColor: colors.white,` | **BACKGROUND** → `colors.background` |

> **Masked-fallback flag:** none remain. All 15 are unmasked.
> **Worst-impact site:** `PainSeverityScreen.jsx:114` — the selected pain-scale number is meant to be white on a teal circle but renders dark (undefined → default ink). Visible.

---

## Section 4 — `opacity._value` usage in both InlineBanner files

Both files gate the early-return on a **private Animated internal** (`_value`), undocumented RN API.

### Patient — `src/components/common/InlineBanner.jsx:63`
```js
    } else {                                                 // 47
      Animated.parallel([                                    // 48
        Animated.timing(translateY, { toValue: -80, duration: 180, useNativeDriver: true }), // 49-53
        Animated.timing(opacity,   { toValue: 0,   duration: 180, useNativeDriver: true }), // 54-58
      ]).start();                                            // 59
    }                                                        // 60
  }, [visible, variant, autoHideMs]);                        // 61
                                                             // 62
  if (!visible && opacity._value === 0) return null;         // 63  ← gating condition
                                                             // 64
  var isError = variant === 'error';                         // 65
  return (                                                   // 66
    <Animated.View                                           // 67
```

### Therapist — `src/components/InlineBanner.jsx:68`
```js
    } else {                                                 // 52
      Animated.parallel([                                    // 53
        Animated.timing(translateY, { toValue: -80, duration: 180, useNativeDriver: true }), // 54-58
        Animated.timing(opacity,   { toValue: 0,   duration: 180, useNativeDriver: true }), // 59-63
      ]).start();                                            // 64
    }                                                        // 65
  }, [visible, variant, autoHideMs]);                        // 66
                                                             // 67
  if (!visible && opacity._value === 0) return null;         // 68  ← gating condition
                                                             // 69
  var isError = variant === 'error';                         // 70
  return (                                                   // 71
```

- **Gating condition (both):** `if (!visible && opacity._value === 0) return null;` — unmount only once the hide animation has fully settled to 0 (keeps the banner mounted through its exit animation).
- **Other internal state available to replace `_value`?** No. Each component holds only two `useRef` Animated values (`translateY`, `opacity`) and no `isAnimating`/`shouldRender` flag. **Replacement path:** add a `shouldRender` state (`useState`) — set `true` when `visible` becomes true; in the hide branch pass a completion callback to `.start(() => setShouldRender(false))`, then gate on `if (!visible && !shouldRender) return null;`. That removes the private-API read with no behavior change.

---

## Section 5 — videoSocket reconnection inventory

Both files (`-patient/src/lib/videoSocket.js`, therapist `.../src/lib/videoSocket.js`) are byte-equivalent in behavior; patient uses `var`+JSDoc, therapist uses `const`/`let`+arrows.

### Connection options (verbatim, both)
```js
io(BASE_URL + NAMESPACE, {
  // No `transports` override — socket.io-client defaults to
  // ['polling', 'websocket'] … (full comment retained)
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
  auth: { token },          // patient: `token: token`
});
```
- **`transports`: intentionally absent** (defaults to `['polling','websocket']` — the May-24 fallback fix; explicit `['websocket']` was removed).

### Reconnect handlers
- **`reconnect_attempt`** (patient `_socket.io.on(...)` @74 / therapist @55): refreshes the Clerk token before each retry (`tokenProvider.getToken()` → `_socket.auth = { token: fresh }`).
- **No** `reconnect_failed`, `reconnect_error`, or `reconnect` listeners.
- Connect-time handlers inside the `connect()` Promise: `once('connect')` → resolve; `once('connect_error')` → reject; `setTimeout(10000)` safety → reject `'connect timeout'`.

### The 6 May-24 diagnostic console lines — line-number confirmation
| # | Purpose | Patient (audit) | Patient (actual) | Therapist (audit) | Therapist (actual) |
|---|---|---|---|---|---|
| 1 | `connect() called` | 41 | **41 ✓** | 25 | **25 ✓** |
| 2 | `reconnect_attempt` | 76 | **76 ✓** | 57 | **57 ✓** |
| 3 | `connected` | 120 | **120 ✓** | 98 | **98 ✓** |
| 4 | `connect_error` (warn) | 130 | **130 ✓** | 108 | **108 ✓** |
| 5 | `connect timeout fired` (warn) | 149 | **149 ✓** | 127 | **127 ✓** |
| 6 | `emit` | 208 | **208 ✓** | 159 | **159 ✓** |

All 6 present at the exact recorded line numbers in both files. (Each carries an `// eslint-disable-next-line no-console`.)

---

## Section 6 — Therapist AppButton & InputField props review

### `AppButton.jsx`
- **Props accepted:** `title`, `onPress`, `loading` (default `false`), `variant` (default `'primary'`; now `'primary' | 'outline' | 'pill'`).
- **`disabled` prop? — CONFIRMED ABSENT.** There is no destructured `disabled` prop. `disabled` appears only as the internal `<TouchableOpacity disabled={loading}>` (line 30) and a `styles.disabled` (line 64). The verification report's statement ("no disabled prop, only loading") is **correct**.
- **Adding `disabled` → zero existing callers.** `AppButton` has zero external callers (the rebuilt therapist ClerkAuthScreen is the only consumer, and it passes only `variant`/`title`/`onPress`/`loading`). Grep for `disabled` near `AppButton` returns only the component's own internal lines.

### `InputField.jsx`
- **Props accepted:** `label`, `value`, `onChangeText`, `placeholder`, `secureTextEntry` (default `false`), `rightIcon`, `onRightIconPress`, `errorMessage`, `keyboardType` (default `'default'`), and the Phase-2 additions `maxLength`, `autoFocus`, `autoCapitalize`, `inputStyle` (all no-default pass-through).
- **`autoComplete` prop? — CONFIRMED ABSENT.** Not destructured, not forwarded.
- **Adding `autoComplete` → zero existing callers.** `grep -rn "autoComplete"` across therapist `src/` returns **zero** matches anywhere.

---

## Section 7 — ProfileScreen "Coming soon" rows (patient)

File: `src/screens/main/ProfileScreen.jsx`

### `handleComingSoon` (line 137)
```js
function handleComingSoon() {
    Alert.alert('Coming soon', '', [{ text: 'OK' }]);
  }
```
(Empty message body; title-only stub.)

### The 4 stub MenuRows (lines 170–189) — all wired to `handleComingSoon`
```jsx
<MenuRow icon="person-outline"        label="Personal Information" onPress={handleComingSoon} />
<MenuRow icon="notifications-outline" label="Notifications"        onPress={handleComingSoon} />
<MenuRow icon="settings-outline"      label="Settings"             onPress={handleComingSoon} />
<MenuRow icon="help-circle-outline"   label="Help & Support"       onPress={handleComingSoon} />
```

### The working contrast row (lines 164–169) — "Primary body part"
```jsx
<MenuRow
  icon="body-outline"
  label="Primary body part"
  value={formatPainLocation(patient.painLocation)}
  onPress={function () { setIsBodyPartModalOpen(true); }}
/>
```
This one is **real**: it shows the current value and opens a working modal (`handleSelectBodyPart` → `updatePatientProfile({ painLocation })` → `patient.refresh()`).

### `MenuRow` component (defined inline in this file, lines 28–37)
```jsx
function MenuRow({ icon, label, value, onPress }) {
  return (
    <Pressable style={rowStyles.row} onPress={onPress}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={rowStyles.label}>{label}</Text>
      {value ? <Text style={rowStyles.value}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
    </Pressable>
  );
}
```
Each stub row therefore shows an icon + label + a **chevron that implies navigation**, but tapping only fires "Coming soon".

**Decision input:** The 4 stub rows have no backend behind them (Personal Info edit, notification prefs, settings, help/support are all unbuilt). Options: **(a) hide them** until built (cleanest — removes the misleading chevron affordance), or **(b)** keep + convert the Alert to a banner (still implies a feature that doesn't exist). Hiding is the lower-risk choice; the chevron currently over-promises. This overlaps a **Tier 4 product decision** (what profile features ship).

---

## Section 8 — Anything you should know

**Other latent `undefined`-reference bugs (same class as `colors.white`):**
- Beyond the 15 `colors.white` sites, no other missing-color-key references were found in the patient app, but I did **not** exhaustively diff every `colors.X` usage against the keys — recommend a quick follow-up grep of all `colors.` reads vs. the exported keys in both apps. (Therapist `colors` **does** define `white`, so therapist `colors.white` is fine.)

**Hardcoded hex that pairs with the bug (polish + correctness):**
- 4 onboarding screens use `backgroundColor: isSelected ? '#E0F7F2' : colors.white` (`AvailabilityScreen:140`, `PainDurationScreen:67`, `RecoveryGoalsScreen:86`, `TreatmentHistoryScreen:73`). `#E0F7F2` **is** the literal value of `colors.primaryLight` — so the selected state hardcodes a token value while the unselected state is `undefined`. Both halves want tokens (`colors.primaryLight` / `colors.background`).
- `ProfileScreen.jsx:340` `backgroundColor: '#FFF5F5'` (logout button) and `:354` `'rgba(0,0,0,0.45)'` (modal backdrop) are inline — minor, no token exists for either.

**Other private-API access (same class as `opacity._value`):** only the two InlineBanner sites in Section 4. No other `._value` (or similar internal-field) reads were found in either app.

**Polish items in files already touched this phase:**
- The two `InlineBanner` components are now duplicated logic across apps (intentional per the 1:1-port instruction) — both carry the `_value` smell; fix them together if/when addressed.
- `AppButton` lacks `disabled` and `InputField` lacks `autoComplete` (Section 6) — both safe to add (zero callers) if Tier 3 wants the therapist auth CTA to dim on empty input / the email field to offer autofill, restoring parity with the patient `AuthPillButton`/`TextField`.

**Overlaps with deferred Tier 4 product decisions (flag before converting Alerts):**
- `BookingConfirmedScreen:121` "Opening Calendar" and `ProfileScreen:138` "Coming soon" are **stubs**, not errors — converting them to banners would still surface a non-feature. These are product decisions (build vs. hide), not banner conversions.
- The therapist **5-screen verification flow** (`GovernmentIDVerificationScreen`, `ProfilePhotoScreen`) owns 7 of the 17 therapist Alerts (permission/validation/catch). Per the CLAUDE.md note, that flow "persists nothing" and is a Tier 4 product decision — converting its Alerts may be wasted effort if the flow is reworked/removed. Recommend deferring those 7 with the flow.
- `ClerkTokenBridge.jsx` Alerts (patient:85 / therapist:88) live in an **invisible bridge component** with no render surface to host a banner, and they sign the user out. Recommend **KEEP as Alert** (special case).
- `IncomingInstantCallModal.jsx` Alerts (94/106) fire **inside a Modal** — a top-anchored InlineBanner would render behind/around the modal; conversion needs a modal-local banner host. Flag for care.

**Destructive confirms that should stay native Alerts (not banners):** `ProfileScreen:116` (Log out), `SessionScreen:539` (End session?), `BookingDetailScreen:127` (Cancel booking?). Banners can't gather a yes/no decision.

**Net Alert-conversion candidates (if Tier 3 proceeds):** of the 26 Alerts, ~17 are ERROR/SUCCESS that *could* become banners; ~3 are destructive CONFIRM (keep); ~2 are INFO/STUB (product decision); and ~9 sit in deferred/special-case areas (verification flow, ClerkTokenBridge, modal) worth deferring. A focused first pass would be **`BookingDetailScreen` (4), `MessagesScreen` ×2 apps (4), `WaitingForTherapistScreen` (1), `ProfileScreen` sign-out error (1)** — all have a clear on-screen host and a banner primitive already available.

**No RN deprecation/lint signal available:** neither app has a configured linter/typechecker, so none of the above is surfaced automatically.
