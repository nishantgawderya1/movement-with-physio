# MWP Patient — Claude Code Reference

This document is the **single source of truth** for the current state of the MWP Patient app.
It captures every decision, convention, and completed change made by Claude Code.
Update this file after every session.

---

## graphify — Mandatory File Discovery

**Before touching any file, finding any component, or answering any codebase question:**

1. Check if `graphify-out/graph.json` exists.
2. If it exists, query it first:
   ```
   /graphify query "<what you're looking for>"
   ```
3. If it does not exist, build it first:
   ```
   /graphify .
   ```

**Never use Glob or Grep to find files without first checking the graph.** The graph already maps every component, screen, service, constant, and navigation relationship in this codebase. Use it.

After any session that adds or modifies files, run:
```
/graphify . --update
```
to keep the graph current.

---

## Stack

| Item | Version |
|---|---|
| Expo SDK | 54 |
| React Native | 0.81.5 |
| React | 19.1.0 |
| Language | JavaScript only — `.jsx` / `.js`. NO TypeScript, NO `.ts`/`.tsx` |
| Navigation | `@react-navigation/stack` v7 (NOT native-stack — needed for TransitionPresets) |
| Tab navigation | `@react-navigation/bottom-tabs` v7 |
| Fonts | `@expo-google-fonts/lora` + `@expo-google-fonts/nunito` |
| Icons | `@expo/vector-icons` (Ionicons) |
| SVG | `react-native-svg` (already installed — used in AchievementIcon) |
| Haptics | `expo-haptics` |
| Gestures | `react-native-gesture-handler` ~2.28.0 |
| Safe Area | `react-native-safe-area-context` ~5.6.0 |
| WebRTC | `react-native-webrtc@124.0.6` (pinned) + `@config-plugins/react-native-webrtc@13.0.0` |
| Dev client | `expo-dev-client@~6.0.21` (SDK 54 — NOT ^55) + `expo-build-properties@~1.0.10` |

---

## Dev Client + WebRTC plumbing (Phase 1, no UI yet)

Expo Go cannot be used — the app links `react-native-webrtc` natively, so
all development happens through a custom dev-client build (`expo run:ios
--device` once, then `expo start --dev-client` thereafter).

### Critical version pin
`expo-dev-client` and `expo-build-properties` are now on Expo's renumbered
55.x track. **SDK 54 needs the OLD numbering**: `~6.0.x` and `~1.0.x`
respectively. Installing with `npm install expo-dev-client` will grab `^55`
which breaks at compile-time (`AppContext.reloadAppAsync()` not in SDK 54
expo-modules-core). Always use `npx expo install expo-dev-client
expo-build-properties` so versions match SDK.

### metro.config.js exports bypass
`react-native-webrtc` imports `event-target-shim/index`, but the v6
`exports` field only exposes `.` — Metro's Node-exports check blocks
the subpath even via `resolveFrom`. The fix in `metro.config.js`
resolves to the literal `node_modules/react-native-webrtc/node_modules/event-target-shim/index.js`
to bypass the check. The original Clerk `react-dom` stub is preserved.

### app.json natives
- iOS: `UIBackgroundModes: ["audio"]` + `expo-build-properties.ios.deploymentTarget: "15.1"`
- Android: perms `CAMERA, RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, INTERNET, ACCESS_NETWORK_STATE, WAKE_LOCK` + `minSdkVersion: 24, compileSdkVersion: 34`
- Plugins: `expo-dev-client`, `@config-plugins/react-native-webrtc` (with camera/mic prompt strings), `expo-build-properties`

### ios/ folder is tracked
First-time prebuild generated `ios/` and it is committed (partial-bare
pattern, matches therapist). `ios/.gitignore` filters Pods/build/DerivedData.
`.expo/` is gitignored — never commit `.expo/devices.json` or
`xcodebuild*.log`.

### `.npmrc` / `legacy-peer-deps=true`
Committed at app root. Needed for `@clerk/clerk-expo 2.x` peer-dep
resolution; without it `npm install` fails.

### Placeholder assets (TODO)
`assets/icon.png`, `splash.png`, `adaptive-icon.png`, `favicon.png` are
**copies of the therapist app's assets**, dropped in because patient
`app.json` referenced files that never existed and prebuild errored.
Replace with real patient branding before any public/internal build.

---

## Coding Rules (ENFORCE FOR EVERY FILE)

1. **No TypeScript.** Files are `.jsx` or `.js` only. No `interface`, `type`, `: string`, etc.
2. **StyleSheet.create() only.** Never write `style={{ ... }}` inline. Exception: dynamic values that depend on runtime hooks (e.g. `insets.bottom`) can be merged with `[styles.x, { paddingBottom: 60 + insets.bottom }]`.
3. **Use constants.** Always import from `colors.js`, `fonts.js`, `routes.js`. No raw hex codes or magic numbers in component files.
4. **No libraries not in package.json.** Stop and ask first.
5. **JSDoc comments** on every exported component describing props.
6. **One component per file.** No multi-export component files.
7. **`var` declarations** are preferred over `const`/`let` in component files (existing code style).
8. **Animations**: Use `Animated` API only. Do NOT use `react-native-reanimated` unless explicitly requested.
9. **Folder structure:**
   ```
   src/
     components/
       auth/           ← OnboardingShell, SelectableCard, SelectablePill
       booking/        ← TherapistCard
       navigation/     ← AnimatedTabBar, TabScreenWrapper
       ui/             ← PrimaryButton, OutlineButton, AchievementIcon
     constants/        ← colors.js, fonts.js, routes.js
     context/          ← OnboardingContext, PatientContext
     navigation/
       stacks/         ← BookStack, HomeStack
       AppNavigator.jsx
       AuthNavigator.jsx
       MainNavigator.jsx
       RootNavigator.jsx
     screens/
       auth/           ← LoginScreen, onboarding steps, OnboardingCompleteScreen
       main/           ← HomeScreen, Book*, Progress, Profile, SessionScreen
       splash/         ← SplashScreen
   ```

---

## Constants Reference

### `src/constants/colors.js`
```js
colors.background      // #FFFFFF
colors.surface         // #F4F6F9
colors.primary         // #00B894  (teal)
colors.primaryLight    // #E0F7F2  (soft teal tint)
colors.primaryDark     // #007A5E
colors.textDark        // #1A1A2E
colors.textMedium      // #4A5568
colors.textLight       // #A0AEC0
colors.textOnPrimary   // #FFFFFF
colors.border          // #E2E8F0
colors.cardBorder      // subtle border for cards/circles
colors.divider         // #EDF2F7
colors.danger          // #E53E3E
colors.inputBg         // input field background
colors.inputBorder     // input field border
colors.placeholder     // input placeholder text color
colors.planCardStart   // #00B894  (gradient start)
colors.planCardEnd     // #007A5E  (gradient end)
```

### `src/constants/fonts.js`
```js
// Heading font — Lora (serif)
fonts.heading.regular  → 'Lora_400Regular'
fonts.heading.italic   → 'Lora_400Regular_Italic'
fonts.heading.semibold → 'Lora_600SemiBold'

// Body font — Nunito (rounded sans-serif)
fonts.body.regular     → 'Nunito_400Regular'
fonts.body.medium      → 'Nunito_500Medium'
fonts.body.semibold    → 'Nunito_600SemiBold'

// Size scale (also top-level for backward compat)
fonts.xs  = 11   fonts.sm  = 13   fonts.md  = 15
fonts.lg  = 17   fonts.xl  = 20   fonts.xxl = 26   fonts.xxxl = 32

// Weight shorthands
fonts.regular = '400'  fonts.medium = '500'  fonts.semibold = '600'
fonts.bold    = '700'  fonts.extrabold = '800'
```

**Typography rules:**
- `fonts.heading.regular` — screen titles, plan card titles, section headings, `lineHeight = fontSize * 1.35`
- `fonts.body.*` — all other text: labels, buttons, pills, tab labels, body copy
- `fonts.body.semibold` + `letterSpacing: 0.3` — button labels (PrimaryButton, OutlineButton)
- `fonts.body.medium` + `fontSize: 11` — tab bar labels

### `src/constants/routes.js` — Key values
```js
PATIENT_ROUTES.HOME              = 'HOME'
PATIENT_ROUTES.HOME_SCREEN       = 'HOME_SCREEN' // stack-internal — avoids HOME>HOME nesting
PATIENT_ROUTES.SESSION           = 'SESSION'   // ← exercise player screen
PATIENT_ROUTES.BOOK_APPOINTMENT  = 'BOOK_APPOINTMENT'
PATIENT_ROUTES.BOOK_THERAPIST    = 'BOOK_THERAPIST'
PATIENT_ROUTES.SLOT_SELECTION    = 'SLOT_SELECTION'
PATIENT_ROUTES.BOOKING_CONFIRMED = 'BOOKING_CONFIRMED'
PATIENT_ROUTES.MESSAGES          = 'MESSAGES'  // ← conversation list (Chat tab root)
PATIENT_ROUTES.CHAT_ROOM         = 'CHAT_ROOM' // ← single chat room
PATIENT_ROUTES.PROGRESS          = 'PROGRESS'
PATIENT_ROUTES.PROFILE           = 'PROFILE'
// Auth
PATIENT_ROUTES.SPLASH            = 'SPLASH'
PATIENT_ROUTES.LOGIN             = 'LOGIN'
PATIENT_ROUTES.PERSONAL_INFO     = 'PERSONAL_INFO'
// ... (PAIN_LOCATION, PAIN_SEVERITY, PAIN_DURATION, TREATMENT_HISTORY,
//      RECOVERY_GOALS, AVAILABILITY, ONBOARDING_COMPLETE)
```

---

## Navigation Architecture

```
App.jsx
└── GestureHandlerRootView         ← required by @react-navigation/stack for swipe-back
    └── SafeAreaProvider           ← required for useSafeAreaInsets everywhere
        └── AppNavigator.jsx
            ├── BackHandler (Android hardware back)
            └── NavigationContainer (ref attached)
                └── PatientProvider
                    └── RootNavigator.jsx
                        ├── isOnboardingComplete=false → AuthNavigator.jsx
                        └── isOnboardingComplete=true  → MainNavigator.jsx
```

### RootNavigator — `src/navigation/RootNavigator.jsx`
- Uses `createStackNavigator`
- `screenOptions={{ headerShown: false, animationEnabled: false, gestureEnabled: false }}`
- **Zero animation on root switch** — prevents bounce/snap when flipping isOnboardingComplete

### AuthNavigator — `src/navigation/AuthNavigator.jsx`
- Uses `createStackNavigator` from `@react-navigation/stack`
- `TransitionPresets.SlideFromRightIOS` with spring config:
  `{ stiffness: 1000, damping: 500, mass: 3, overshootClamping: true }`
- `gestureEnabled: true`, `gestureDirection: 'horizontal'`
- Wrapped in `<OnboardingProvider>`
- Screens: Splash → Login → ClerkAuth → PersonalInfo → PainLocation → PainSeverity → PainDuration → TreatmentHistory → RecoveryGoals → Availability → OnboardingComplete

### MainNavigator — `src/navigation/MainNavigator.jsx`
- Uses `createBottomTabNavigator`
- `tabBar` prop → renders `<AnimatedTabBar>` (custom component)
- `lazy: false` — preloads all 5 tabs for instant switching
- `headerShown: false` on all screens
- **5 tabs**: HOME(0) → BookStack(1) → **MESSAGES/Chat(2)** → PROGRESS(3) → PROFILE(4)
- HOME tab uses **HomeStack** so SESSION can be pushed inside it
- MESSAGES tab uses **MessagesStack** so CHAT_ROOM can be pushed inside it
- Chat tab (center) uses elevated CenterTabButton — not a standard tab icon

### HomeStack — `src/navigation/stacks/HomeStack.jsx`
- Uses `createStackNavigator` (NOT native-stack)
- Same `TransitionPresets.SlideFromRightIOS` spring config as BookStack
- Screens: Home → Session

### BookStack — `src/navigation/stacks/BookStack.jsx`
- Uses `createStackNavigator` (NOT native-stack)
- Same `TransitionPresets.SlideFromRightIOS` spring config as AuthNavigator
- `BookTherapistScreen` has `gestureEnabled: false` — prevents accidental swipe-back from tab root
- Screens: BookTherapist → SlotSelection → BookingConfirmed

### MessagesStack — `src/navigation/stacks/MessagesStack.jsx`
- Uses `createStackNavigator` (NOT native-stack)
- Same `TransitionPresets.SlideFromRightIOS` spring config as BookStack
- `MessagesScreen` has `gestureEnabled: false` — prevents accidental swipe-back from tab root
- Screens: MessagesScreen → ChatRoomScreen

### AnimatedTabBar — `src/components/navigation/AnimatedTabBar.jsx`
- Custom tab bar component, receives `{ state, descriptors, navigation }` from React Navigation
- **5 tabs**: renders `CenterTabButton` for the Chat tab (index 2); standard Pressable for the rest
- **Teal pill indicator**: `width: 32, height: 3, borderRadius: 99, backgroundColor: colors.primary`
  - Pill **opacity: 0** when Chat tab is active (button itself shows active state)
- **Position**: `position: 'absolute', top: 0`, centered via `marginLeft: (tabWidth - 32) / 2`
- **Animation**: `Animated.spring` on `pillX` + `Animated.timing` on `pillOpacity`
- **Haptics**: `Haptics.impactAsync(ImpactFeedbackStyle.Light)` on every tab press
- **Safe area**: `useSafeAreaInsets()` — height = `60 + insets.bottom`
- **Unread polling**: polls `chatService.getConversations()` every 15s for total unread count → shows badge on `CenterTabButton`
- Uses `navigation.emit({ type: 'tabPress' })` for correct React Navigation event handling

---

## Tab Screen Entry Animation — `TabScreenWrapper`

### `src/components/navigation/TabScreenWrapper.jsx`
- **Purpose**: Wraps the root `<SafeAreaView>` of each tab screen to animate entry on every tab focus.
- **Props**: `{ children, tabIndex: number }`
  - `tabIndex` values: Home=0, Book=1, **Chat/Messages=2**, Progress=3, Profile=4
- **How it works**:
  - `useIsFocused()` — triggers when the tab becomes active
  - `useNavigationState(state => state.index)` — reads the bottom tab's current index
  - `prevIndex` ref tracks the previously focused tab index across renders
  - Direction logic (corrected):
    ```js
    var direction = tabIndex > prevIndex.current ? -1 : 1;
    // Moving right (higher index) → direction=-1 → starts at -16px (slides in from left)
    // Moving left  (lower index)  → direction=+1 → starts at +16px (slides in from right)
    ```
  - Animation: `opacity 0→1` + `translateX ±16→0` in **210ms** parallel, `useNativeDriver: true`
- **Used in all 4 tab root screens** — wrap pattern:
  ```jsx
  return (
    <TabScreenWrapper tabIndex={N}>
      <SafeAreaView style={styles.safe}>
        {/* ... */}
      </SafeAreaView>
    </TabScreenWrapper>
  );
  ```

---

## Onboarding Layout — `OnboardingShell`

### `src/components/auth/OnboardingShell.jsx`
- `ScrollView` uses `contentContainerStyle={{ flexGrow: 1 }}`
- Children are wrapped in `<View style={{ flex: 1, paddingHorizontal: 24 }}>`
- This `flex: 1` cascades to all onboarding screens, filling the vertical space on all screen sizes

---

## Button Components

### `src/components/ui/PrimaryButton.jsx`
```
backgroundColor: colors.primary   borderRadius: 12   height: 52
label: fonts.body.semibold, color: colors.textOnPrimary, fontSize: 15, letterSpacing: 0.3
disabled: backgroundColor: colors.primaryLight, opacity: 0.7
```

### `src/components/ui/OutlineButton.jsx`
```
backgroundColor: colors.primaryLight   borderWidth: 1.5   borderColor: colors.primary
borderRadius: 12   height: 52
label: fonts.body.semibold, color: colors.primary, fontSize: 15, letterSpacing: 0.3
```

### `src/components/ui/AchievementIcon.jsx`
- Renders one of 3 premium SVG icons via `react-native-svg` based on `type` prop
- Props: `{ type: 'flame' | 'star' | 'trophy', size: number = 48 }`
- Used in `ProgressScreen` achievements section (replaces emoji icons)
- FlameIcon: outer warm amber + inner teal core, viewBox="0 0 48 48"
- StarIcon: golden star with inner teal accent
- TrophyIcon: amber trophy with teal base accent

---

## Screen Inventory & Navigation Wiring

### Auth Screens (`src/screens/auth/`)
All wrapped in `OnboardingProvider` via `AuthNavigator`.

| Screen | Key Design Notes |
|---|---|
| `SplashScreen.jsx` | Logo + auto-advance |
| `LoginScreen.jsx` | Heading: `fonts.heading.regular` |
| `PersonalInfoScreen.jsx` | Inputs vertically centered; uses `colors.inputBg/inputBorder/placeholder` |
| `PainLocationScreen.jsx` | FlatList content centered vertically |
| `PainSeverityScreen.jsx` | **Premium 58px perfect-circle grid** — see below |
| `PainDurationScreen.jsx` | Full-width icon-based cards replace pills |
| `TreatmentHistoryScreen.jsx` | Two large stacked Yes/No cards |
| `RecoveryGoalsScreen.jsx` | 2-column icon-based cards |
| `AvailabilityScreen.jsx` | 2-column icon-based cards (morning/afternoon/evening) |
| `OnboardingCompleteScreen.jsx` | Mount animation: ring scale → check fade → text slide → button slide |

`OnboardingShell.jsx` (`src/components/auth/`) — step progress wrapper used by all onboarding screens.

#### `PainSeverityScreen.jsx` — Pain Scale Grid
- Grid: 5 columns × 2 rows of **58px perfect circles** (`width:58, height:58, borderRadius:29`)
- Unselected: `borderWidth:1.5, colors.cardBorder`, subtle `shadowOpacity:0.06`
- Selected: `backgroundColor:colors.primary`, no border, no shadow
- **Selected value display** (when a number is chosen):
  - Large number: `fontSize:72, fonts.semibold, color:colors.primary`
  - Label: `fonts.sm, colors.textMedium, fonts.medium`
- **Placeholder** when nothing selected: `"Tap a number to rate your pain"` in `fonts.medium`
- Number `10` uses `fonts.sm` (smaller to fit the circle)
- Legend row at `marginTop: 20` (1=No Pain … 10=Worst Pain)

### Chat Screens (`src/screens/messages/`)

#### `MessagesScreen.jsx`
- Wrapped in `<TabScreenWrapper tabIndex={2}>`
- WhatsApp-style conversation list using `ConversationRow` components
- Loads from `chatService.getConversations()`
- Header: "Messages" in `fonts.heading.regular` 22px
- Each row: teal avatar initials, online dot, unread badge, therapist name + last message + time
- Tap → navigate to `PATIENT_ROUTES.CHAT_ROOM` with `{ roomId, therapistName, therapistAvatar, isOnline }`
- Empty state with centered text + emoji

#### `ChatRoomScreen.jsx`
- Custom header (no `headerShown`): back arrow + avatar + name (Lora) + online status + video call placeholder
- Inverted FlatList for message history (bottom-up rendering)
- `chatService.getMessages(roomId)` on mount + `chatService.markAsRead(roomId, null)` to clear badge
- Optimistic send: appends message to state immediately, calls `chatService.sendMessage`
- Long-press on any bubble → sets `replyTo` state → shows `ReplyPreview` in composer
- Typing indicator poll: `setInterval → chatService.getTypingStatus(roomId)` every 3s
- **Keyboard handling**: Manual `Keyboard.addListener` — no `KeyboardAvoidingView` anywhere
  - `keyboardWillShow` → `setKeyboardHeight(e.endCoordinates.height)` (fires early on iOS, no visible jump)
  - `keyboardWillHide` → `setKeyboardHeight(0)`
  - Composer `marginBottom: keyboardHeight` pushes the bar exactly above the keyboard — no estimation
- **Composer bar is inlined directly in `ChatRoomScreen.jsx`** (not imported from `ComposerBar.jsx`)
  - Row: paperclip/attach icon (left) | TextInput (center, flex 1) | send button (right)
  - Rendered **outside** the loading ternary so it is always visible
  - `composerOuter` paddingBottom set inline: `keyboardHeight > 0 ? 12 : insets.bottom > 0 ? insets.bottom : 12`
    - Tab bar is hidden when ChatRoom is active (see MainNavigator), so no 60px clearance needed
    - On older devices (no home indicator) falls back to 12px
  - Back button `Pressable` uses `hitSlop={{ top:12, bottom:12, left:12, right:12 }}`
    for a reliable tap target; calls `navigation.goBack()`
  - Send button: 42px teal circle, `colors.primary`; disabled = `colors.textLight` grey
  - Scale-pulse animation on send: 1 → 1.12 → 1, two `Animated.timing` @ 75ms each, `useNativeDriver: true`
  - `ReplyPreview` shown above the input row when `replyTo` state is set
- **Attachment Sheet**: `isAttachmentOpen` state + `openAttachmentSheet` / `closeAttachmentSheet` handlers
  - Paperclip `onPress` → `openAttachmentSheet()`
  - `<AttachmentSheet visible={isAttachmentOpen} onClose={closeAttachmentSheet} />` rendered
    **at the bottom of the root `SafeAreaView`**, outside FlatList and composer, overlaying everything
- **Swipe-to-dismiss keyboard**:
  - `PanResponder` attached to `composerOuter` View (the outer wrapper, NOT the TextInput itself)
    - `onMoveShouldSetPanResponder`: `dy > 8 && |dy| > |dx| * 1.5` — clearly downward only
    - `onPanResponderRelease`: `dy > 20` → `Keyboard.dismiss()`
  - FlatList `onScrollBeginDrag={() => Keyboard.dismiss()}` dismisses keyboard when scrolling messages
  - `keyboardShouldPersistTaps="handled"` kept on FlatList (unchanged)

#### `AttachmentSheet.jsx` (`src/components/chat/`)
- Modal-based overlay (`transparent`, `animationType="none"`) with `statusBarTranslucent`
- Inner `AnimatedSheet` component re-mounts on every `visible=true` so spring always starts fresh
- **Slide animation**: `Animated.spring` on `translateY` (400 → 0 open, 0 → 400 close), `useNativeDriver: true`
- **Backdrop**: `rgba(0,0,0,0.45)` with `StyleSheet.absoluteFillObject` + `<Pressable>` to dismiss
- **Sheet header**: gray pill drag handle (40×4, `colors.border`) + "Share" title centered
- **6-option grid** (2 columns, 3 rows via `flexWrap: 'wrap'`, `width: '30%'` per cell):

  | Ionicon                  | Label    |
  |--------------------------|----------|
  | `camera-outline`         | Camera   |
  | `image-outline`          | Gallery  |
  | `document-outline`       | Document |
  | `folder-outline`         | Files    |
  | `location-outline`       | Location |
  | `musical-notes-outline`  | Audio    |

- Icon circle: 58px, `borderRadius: 29`, `backgroundColor: '#E8F5F0'`, icon color `#1A5C4A`
- Option label: `fonts.body.regular`, `fontSize: 12`, `colors.textMedium`
- Press any option → `console.log('[AttachmentSheet] selected:', label)` then slides down + closes

#### `ComposerBar.jsx` (`src/components/chat/`)
- Standalone component — kept as a reusable reference but **not currently imported by `ChatRoomScreen`**
- Same visual spec as the inlined composer: 42px buttons, 22px borderRadius input, 1px borderTop
- Can be re-imported if the composer needs to be reused elsewhere

### Main Screens (`src/screens/main/`)

#### `HomeScreen.jsx`
- Wrapped in `<TabScreenWrapper tabIndex={0}>`
- Accepts `{ navigation }` prop
- Interactive elements wired:
  - 🔔 Bell icon → `onPress: () => {}` (TODO stub)
  - 👤 Avatar → `navigation.navigate(PATIENT_ROUTES.PROFILE)`
  - **START SESSION** → `navigation.navigate(PATIENT_ROUTES.SESSION)`
  - **View All** (Pain Trend) → `navigation.navigate(PATIENT_ROUTES.PROGRESS)`
  - **Book Session** quick action → `navigation.navigate(BOOK_APPOINTMENT, { screen: BOOK_THERAPIST })`
  - **View Progress** quick action → `navigation.navigate(PATIENT_ROUTES.PROGRESS)`
- ScrollView `contentContainerStyle` uses `[styles.scrollContent, { paddingBottom: 60 + insets.bottom }]`
- Headings: `fonts.heading.regular` + `lineHeight: fontSize * 1.35`

#### `BookTherapistScreen.jsx`
- Wrapped in `<TabScreenWrapper tabIndex={1}>`
- **No back button** — this is a tab root; back button was removed
- Header is a single centered `<Text style={headerTitle}>Book Therapist</Text>`
- TherapistCard onPress → `navigation.navigate(PATIENT_ROUTES.SLOT_SELECTION, { therapist })`
- `gestureEnabled: false` set in BookStack to prevent swipe-back from tab root

#### `SlotSelectionScreen.jsx`
- Accepts `{ navigation, route }` prop
- Reads `therapist` from `route.params`
- Confirm Booking → `navigation.navigate(PATIENT_ROUTES.BOOKING_CONFIRMED, { therapist, slot, date })`
- Back button → `navigation.goBack()`

#### `BookingConfirmedScreen.jsx`
- Accepts `{ navigation, route }` prop
- Reads `therapist`, `slot`, `date` from `route.params`
- All text uses `fonts.heading.regular` (Lora) for therapist name, `fonts.body.*` (Nunito) for details
- Back to Home → `navigation.navigate(PATIENT_ROUTES.HOME)` (navigate, not goBack)
- Animated scale-in checkmark on mount

#### `ProgressScreen.jsx`
- Wrapped in `<TabScreenWrapper tabIndex={3}>` ← updated from 2 to 3 (Chat tab added at index 2)
- ScrollView `contentContainerStyle` uses dynamic `paddingBottom: 60 + insets.bottom`
- Uses `AchievementIcon` SVG component for achievement badges
- Pain trend chart via `victory-native`, adherence dot grid via `react-native-svg`
- Heading: `fonts.heading.regular` + lineHeight

#### `ProfileScreen.jsx`
- Wrapped in `<TabScreenWrapper tabIndex={4}>` ← updated from 3 to 4 (Chat tab added at index 2)
- Accepts `{ navigation }` prop
- Menu rows have `onPress` handlers via `handleComingSoon()` → `Alert.alert('Coming soon', '', [{ text: 'OK' }])`
- ScrollView uses dynamic `paddingBottom: 60 + insets.bottom`

#### `SessionScreen.jsx`
- Exercise session player — rep-based and duration-based exercises
- 5 mock exercises with `sets`, `reps`/`duration` mode
- Phases: `active` → `rest` → next exercise → `complete`
- State: `currentIndex`, `currentSet`, `phase`, `restSeconds`, `elapsedSeconds`
- `handleRepComplete()` — no `repsDone`/`setRepsDone` state (removed); calls `advanceExercise()` or increments set and enters rest
- Hero card difficulty badge: frosted-pill style `rgba(255,255,255,0.25)` on teal background
- Shows session summary on complete with stats

---

## Tab Bar — Safe Area Fix

Tab bar is `position: 'absolute'` inside `AnimatedTabBar`. This means **all tab screens with ScrollView must add paddingBottom** to prevent content hiding behind the tab bar.

**Pattern (in every main screen with ScrollView):**
```jsx
var insets = useSafeAreaInsets();
// ...
<ScrollView
  contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 + insets.bottom }]}
>
```

Screens already updated: `HomeScreen`, `ProgressScreen`, `ProfileScreen`.

### Composer / FlatList screens (non-ScrollView)

For screens that have a **FlatList + bottom composer** (e.g. `ChatRoomScreen`):
- **Do NOT** use `paddingBottom` on the FlatList's `contentContainerStyle` for the tab bar
- The tab bar is **hidden** when inside ChatRoomScreen (see `MainNavigator.jsx` `isTabBarHidden`),
  so the composer only needs `paddingBottom: insets.bottom > 0 ? insets.bottom : 8`
- Give the FlatList `style={styles.flex}` so it fills available space without pushing the composer off-screen
- Composer must be rendered **outside** any loading ternary to guarantee it is always present
- **`KeyboardAvoidingView` removed** — `keyboardVerticalOffset` approach caused a gap with custom header; replaced with manual `Keyboard.addListener` + `marginBottom: keyboardHeight` on composer (`keyboardWillShow` / `keyboardWillHide`)

---

## Cross-Tab Navigation Pattern

When navigating from one tab into a screen nested inside another tab's stack:
```js
// CORRECT — switches to BOOK_APPOINTMENT tab then pushes BOOK_THERAPIST
navigation.navigate(PATIENT_ROUTES.BOOK_APPOINTMENT, {
  screen: PATIENT_ROUTES.BOOK_THERAPIST,
});

// WRONG — won't find the screen if called from a different tab
navigation.navigate(PATIENT_ROUTES.BOOK_THERAPIST);
```

---

## Android BackHandler

Implemented in `AppNavigator.jsx`:
```js
var sub = BackHandler.addEventListener('hardwareBackPress', function () {
  if (navigationRef.current?.canGoBack()) {
    navigationRef.current.goBack();
    return true;   // consumed
  }
  return false;   // let system handle (exit/minimise)
});
return () => sub.remove();  // cleanup on unmount
```

---

## Font Loading — `App.jsx`

```js
// Loaded at startup via useFonts()
Lora_400Regular, Lora_400Regular_Italic, Lora_600SemiBold,
Nunito_400Regular, Nunito_500Medium, Nunito_600SemiBold
```

App renders `null` until fonts are loaded (or error). SplashScreen held via `expo-splash-screen`.

---

## Known Stubs / TODO

| Item | Status |
|---|---|
| Notifications screen | No-op `onPress: () => {}` in HomeScreen bell icon |
| Profile menu rows (Personal Info, Notifications, Settings, Help) | `Alert.alert('Coming soon')` |
| Clerk auth integration | Stub `ClerkAuthScreen` shows "Login coming soon" |
| Session screen (exercise player) | ✅ Built — `SessionScreen.jsx`, 5 mock exercises, rep + duration modes |
| Chat feature | ✅ Built — `MessagesScreen`, `ChatRoomScreen`, 6 chat components, `chatService` mock |
| Composer bar | ✅ Inlined in `ChatRoomScreen` — always visible, paddingBottom = `insets.bottom` (tab bar hidden via `isTabBarHidden` in MainNavigator) |
| Tab bar overlap fix | ✅ `MainNavigator` hides the entire tab bar (incl. `CenterTabButton`) when focused route inside MessagesStack is `CHAT_ROOM` — uses `getFocusedRouteNameFromRoute` |
| Keyboard gap fix | ✅ **Replaced `KeyboardAvoidingView`** — now uses `Keyboard.addListener('keyboardWillShow/Hide')` + `marginBottom: keyboardHeight` on composer View. Fires earlier than `keyboardDidShow`, eliminates the gap precisely. |
| Back button fix | ✅ `navigation.goBack()` on `Pressable` with `hitSlop={{ top:12,bottom:12,left:12,right:12 }}` for reliable tap target |
| Attachment sheet | ✅ `AttachmentSheet.jsx` (`src/components/chat/`) — Modal, spring slide-up, backdrop tap-to-dismiss, 6-option grid. Paperclip icon in composer opens it. |
| Swipe-to-dismiss keyboard | ✅ `PanResponder` on `composerOuter` (dy>8, |dy|>|dx|×1.5 to capture, dy>20 to dismiss). FlatList `onScrollBeginDrag` also calls `Keyboard.dismiss()`. |
| Real therapy session data | All data is mock from `PatientContext` / hardcoded in SessionScreen |
| Real therapist data | Mock list in `BookTherapistScreen` |
| Real chat API | `chatService.js` mock-first — swap implementations when backend is ready |
| Video call from chat header | Placeholder `onPress: () => {}` in ChatRoomScreen |
| Video consultation UI | Not built — WebRTC native modules linked (Phase 1 plumbing only). Verified on iOS via temporary smoke screen (now removed). Bare `mediaDevices.getUserMedia` + `RTCView` confirmed working. |
| Patient brand assets | `assets/*.png` are placeholders copied from therapist — replace with real branding before any external build. |

---

## Verification Checklist (run after each session)

- [ ] `npx expo start` launches without crashing
- [ ] No red error screen on device/simulator
- [ ] No TypeScript syntax in any `.js` / `.jsx` file
- [ ] No inline styles — use `StyleSheet.create()` + array merge for dynamic values
- [ ] All color values come from `colors` import (no raw hex)
- [ ] All font sizes/families come from `fonts` import
- [ ] All route strings come from `PATIENT_ROUTES` import
- [ ] Every screen with ScrollView/FlatList inside a tab has `paddingBottom: 60 + insets.bottom`
- [ ] New stack navigators use `@react-navigation/stack` (not `native-stack`)
- [ ] `GestureHandlerRootView` and `SafeAreaProvider` are the outermost wrappers in `App.jsx`
- [ ] All 5 tab root screens are wrapped in `<TabScreenWrapper tabIndex={N}>`
  - Home=0, Book=1, **Messages=2** (NEW), Progress=3, Profile=4
- [ ] New tab root screens have `gestureEnabled: false` in their stack's `screenOptions`
- [ ] No react-native-keyboard-controller, no useAnimatedKeyboard, no reanimated
