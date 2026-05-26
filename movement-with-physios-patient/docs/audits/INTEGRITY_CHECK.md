# Static Integrity Check — feat/session-proposals

Read-only audit of all changes shipped since `ef3c65e` (Tier 0 tip) through `HEAD` (`8cf9fe3`): Phase 2 (auth rebuild) + Tier 3 (convention cleanup) + Tier 3.5 (palette) + audit archive. **No code modified.** App not run.

Scope base: `git diff --name-only ef3c65e..HEAD` → 43 paths (9 docs/`.md`, 2 package/lock, **32 code files**). Transitive importers of changed components were included.

---

## Summary

| Severity | Count |
|---|---|
| HIGH | **0** |
| MED | **0** |
| LOW | **3** |

**Top HIGH findings:** none.

### Confidence assessment
> ✅ **Branch is safe to device-test.**

Every code-verifiable invariant holds: all imports resolve, no references to the 11 Tier-0-deleted files exist in live code, the patient palette has zero undefined keys, both InlineBanner refactors are race-safe, all Clerk SDK calls are intact, both videoSockets are syntactically sound with the intended reconnect caps, and DM Sans is loaded + wired. The 3 LOW findings are comment-only staleness in **unused** files and a harmless hooks-deps lint nit — none affect runtime. The genuinely unverifiable items remain the device-only ones (actual font glyph rendering, WebRTC media, live network-failure banner) already called out in the smoke-test plan.

---

## Section 1 — Import resolution ✅
- All 8 new/modified component files imported by changed screens **exist on disk** (verified): patient `common/InlineBanner`, `common/ScreenContainer`, `ui/TextField`, `auth/AuthPillButton`; therapist `components/InlineBanner`, `components/ScreenContainer`, `components/AppButton`, `components/InputField`.
- Each consumer imports the **correct, app-specific** InlineBanner path: patient screens → `../../components/common/InlineBanner`; therapist screens → `../../components/InlineBanner`. No cross-wiring.
- **Zero** imports reference any of the 11 deleted files (TherapistPortal/ForgotPassword/Register/RegistrationNextStep/OnboardingNext screens; AuthService×2/OtpService/mockAuthService/tokenStorage; BookScreen; legacy SplashScreen). No typos/case mismatches.

## Section 2 — Component contract integrity ✅
| Component | Props accepted | Call sites | Verdict |
|---|---|---|---|
| `AuthPillButton` | label, onPress, loading, disabled, style | patient ClerkAuthScreen ×2 (email/OTP) → pass label/onPress/loading/disabled/style | ✅ |
| `TextField` | label,value,onChangeText,placeholder,keyboardType,autoCapitalize,autoComplete,secureTextEntry,maxLength,rightSlot,errorMessage,autoFocus,editable,style,inputStyle | patient ClerkAuthScreen (email + OTP) | ✅ all passed props in set |
| `ScreenContainer` (both) | children,style,scroll,keyboardAvoiding,safeAreaEdges | ClerkAuthScreens | ✅ |
| `AppButton` | title,onPress,loading,**disabled**,variant | therapist ClerkAuthScreen ×2 → variant="pill"/title/onPress/loading/disabled | ✅ both sites pass `disabled` |
| `InputField` | …,maxLength,autoFocus,autoCapitalize,**autoComplete**,inputStyle | therapist ClerkAuthScreen | ✅ `autoComplete="email"` on email site **only**; OTP site omits it (correct) |
| `InlineBanner` (both) | visible,message,variant,autoHideMs,onDismiss | 6 screens | ✅ all pass visible/message/variant/onDismiss |

No call site passes an unknown prop; no required-feeling prop (label/value/onPress) is omitted.

## Section 3 — InlineBanner usage audit ✅
All 6 screens (patient ClerkAuthScreen/MessagesScreen/WaitingForTherapistScreen; therapist ClerkAuthScreen/MessagesScreen/BookingDetailScreen):
- ✅ import the correct app-specific InlineBanner
- ✅ declare `const/var [banner, setBanner] = useState({ visible:false, message:'', variant:'error' })`
- ✅ render `<InlineBanner …/>` as a child **inside** the outermost container (not wrapping it)
- ✅ trigger `setBanner({ visible:true, … })` at every former Alert site (patient ClerkAuthScreen **7**, therapist ClerkAuthScreen **6**, Messages ×2 each, WaitingForTherapist 1, BookingDetail 4)
- ✅ `onDismiss={() => setBanner((b) => ({ ...b, visible:false }))}` — sets **only** `visible`, preserves `message` so the slide-out still renders text
- No dead state (rendered-but-never-triggered) or broken UI (triggered-but-never-rendered).

## Section 4 — InlineBanner `shouldRender` refactor ✅ (race-safe)
Both files identical in logic:
- ✅ `var [shouldRender, setShouldRender] = useState(visible)`
- ✅ IN branch calls `setShouldRender(true)` before `Animated.parallel([...]).start()`
- ✅ OUT branch: `.start(function (result) { if (result && result.finished) setShouldRender(false); })`
- ✅ gate `if (!shouldRender) return null;`
- ✅ **zero** `_value` access in either file
- ✅ deps `[visible, variant, autoHideMs]`

**Race analysis:** the `finished` guard makes the interrupt-then-reentry case safe — if `visible` flips false→true mid-exit, the new IN animation interrupts the OUT animation, whose callback then fires with `finished:false` and is ignored, so `shouldRender` is never wrongly set false during a re-entry. `setShouldRender(false)` is reachable **only** from the OUT branch on a completed animation. No path sets it false while an IN animation starts. ✅

## Section 5 — Clerk auth flow integrity ✅
**Patient ClerkAuthScreen** (unchanged since Phase 2): `mode` param respected (`route?.params?.mode`); `setLoading(true)` at entry of both handlers, `setLoading(false)` in `finally` (+ the role-conflict early-return also clears loading → no stuck spinner); `setStep('otp')`/`setStep('email')` intact; `global.__pendingClerkSession` stash present in signup path (line 146); all signUp/signIn/setActive calls present (Phase-2 diff was zero; Tier 3 did not touch this file).
**Therapist ClerkAuthScreen** (Tier 3 added only `disabled=`/`autoComplete=` JSX attributes — handlers untouched): `setFlow('signIn')`/`setFlow('signUp')` + `form_identifier_not_found` fallback branch intact; `setLoading` true/`finally`-false; `session_exists`/`already_signed_in` silent-return preserved. No stuck-spinner risk in either.

## Section 6 — videoSocket integrity ✅
Both files: options object valid — `autoConnect:false, reconnection:true, reconnectionAttempts:10, reconnectionDelay:1000, reconnectionDelayMax:30000, timeout:10000, auth:{token}`. No missing comma/brace, no reordering hazard. `transports` intentionally omitted (handshake fallback fix). `reconnect_attempt` handler still refreshes the token via `tokenProvider.getToken()`. All 6 `[videoSocket]` diagnostic console lines intact (patient 41/76/120/130/149/208; therapist 25/57/98/108/127/159).

## Section 7 — Patient palette completion ✅
- Undefined-keys audit: **EMPTY** (every `colors.X` reference resolves).
- Remapped-away names (`cardBorder`, `error`, `placeholder`, `inputBorder`, `white`): **0** occurrences remain.
- `inputBg: '#FFFFFF'` is the **only** new key (palette = 20 keys total, was 19).
- LoginScreen: **2** `colors.background` sites, **0** `colors.white`.

## Section 8 — ProfileScreen post-cleanup ✅
`handleComingSoon` refs: **0**. The 4 stub labels: **0** in JSX. `MenuRow` defined + used once (Primary body part). "Primary body part" row → `updatePatientProfile` (2 refs: import + call) via modal. Logout → `Alert.alert('Log out'…)` + Clerk `signOut` (2 refs). `Alert` import present and **used** (2 `Alert.alert` calls: logout confirm + sign-out error) — not dangling. No orphaned `MenuRow` references.

## Section 9 — Therapist font integrity ✅
All 4 DM Sans weights in `useFonts` (`App.jsx:58-61`) + imported (`9-12`); `fontFamilies.dmSans` exports all 4 (`regular/medium/semibold/bold`); ClerkAuthScreen references `fontFamilies.dmSans.{medium,regular,semibold}` + `fontFamilies.instrumentSerif` — all match the loaded set. Grep for `DMSans_*` strings finds **only** the 4 canonical names (in `fonts.js`). No typo'd family → no silent system-font fallback.

## Section 10 — Dead reference sweep ✅ (live code clean; 2 LOW comment-only)
- 11 deleted file names in live imports/JSX: **0**.
- Removed route constants `SCHEDULE` / `PATIENT_LIST`: **0**.
- `navigate()`/`replace()` to deleted routes: **0**.
- Removed chatService TODO: gone (Tier 0).
- **2 stale comment references** to the deleted `AuthService` — see LOW-1 below.

## Section 11 — Other runtime-failure risks
- **Empty catches:** 2 found, both **intentional, documented fire-and-forget** — `ProfileScreen:127 clearPushToken().catch(function(){})` (clear push token before sign-out; transient failure must not block logout) and `ClerkAuthScreen:169 setSignInActive(...).catch(() => {})` (documented: avoids a render-conflict). Not bug-masking. INFO.
- **PII in logs:** ✅ none — videoSocket logs `socketId`, `attempt`, `event`, `sent`, error `message/type` only. **No token, no userId** logged.
- **Hardcoded URLs:** ✅ none in changed files (videoSocket uses `EXPO_PUBLIC_API_BASE_URL`; screens use `apiClient`).
- **Rapid-tap double-submit:** mitigated — both ClerkAuthScreen handlers guard `if (!isReady || !email/otp.trim()) return;` and `setLoading(true)` immediately; CTAs disable while `loading` (AuthPillButton `inactive`, AppButton `disabled={…|| loading}`). BookingDetail `handleAccept/handleDecline` guard `if (acting) return;`. No duplicate-mutation path found.
- **Cleanup/listeners:** InlineBanner effect's only cleanup is `clearTimeout` (success-autohide path) — no setState in cleanup; Animated values are refs, no `addListener` leaks. WaitingForTherapistScreen poll/countdown intervals are cleared in its effect cleanup (unchanged by Tier 3). ✅
- **Hook order:** InlineBanner's early `return null` is **after** all hooks (useState/useRef/useEffect) — no conditional-hook violation. ✅

---

## LOW findings (3)

**LOW-1 — Stale `AuthService` references in two *unused* files (comment-only).**
- `movement-with-physios/apps/therapist/src/navigation/RootNavigator.jsx:18` — inline `// TODO (Backend Engineer): Replace false with AuthService.isAuthenticated()` survived the Tier-0 JSDoc replacement (that edit's scope was the `/** */` block only). It now contradicts the file's own line-12 comment ("AuthService abstraction has been removed").
- `movement-with-physios/apps/therapist/src/hooks/useLoginForm.js:29` — `// TODO: Replace with → const res = await AuthService.login(...)`.
- **Impact:** none at runtime — both are comments, and **both files are unused orphans** (RootNavigator isn't imported anywhere; `AppNavigator` is the live navigator. `useLoginForm` is imported by no screen). **Out of scope** (neither file is in `ef3c65e..HEAD`). Candidates for the future RootNavigator/useLoginForm cleanup already flagged in the Tier 0 report. Severity LOW (cosmetic, non-user-facing).

**LOW-2 — InlineBanner `useEffect` omits `onDismiss`/`message` from its deps array (both files).**
- Deps are `[visible, variant, autoHideMs]`; the success-autohide `setTimeout(() => onDismiss(), …)` closes over `onDismiss`. An `eslint-plugin-react-hooks/exhaustive-deps` lint would flag this.
- **Impact:** functionally harmless — `onDismiss` is `() => setBanner((b)=>({...b,visible:false}))` (functional update, stable behavior), and **all 6 current call sites use the `error` variant (manual dismiss)**, so the success-autohide branch isn't even exercised. No stale-closure bug reachable today. Severity LOW.

**LOW-3 (INFO) — Two intentional empty `.catch(() => {})` blocks** (ProfileScreen logout, patient ClerkAuthScreen sign-in `setActive`). Documented fire-and-forget patterns, preserved deliberately. Listed for completeness; not a defect.

---

## Not statically verifiable (device-only — confirm on the smoke test)
Font glyph rendering (esp. DM Sans loading vs. silent system fallback), WebRTC media connect/controls/PiP, live network-failure → InlineBanner slide-down, the `[BOOT] bundle commit=` SHA marker, and OTP/email round-trips. Code wiring for all of these is correct; only runtime can confirm behavior.
