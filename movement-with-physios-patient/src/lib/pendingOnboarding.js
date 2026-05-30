/**
 * One-shot in-memory flag bridging OnboardingCompleteScreen (mounted inside
 * AuthNavigator → torn down on setActive) and ClerkTokenBridge (mounted at
 * App root, OUTSIDE PatientProvider — so it can't read PatientContext).
 *
 * Flow:
 *   OnboardingCompleteScreen.markPending() → setActive() → isSignedIn flips
 *   → ClerkTokenBridge useEffect → consumePending() → if true, /auth/me/init
 *     body carries { onboardingCompleted: true }.
 *
 * NOT persisted across app launches by design. If the launch is killed
 * between markPending and consume, the user is re-routed through onboarding
 * by RootNavigator's gate on next launch — the right fallback behavior.
 */
var pending = false;

export function markPending() {
  pending = true;
}

export function consumePending() {
  var was = pending;
  pending = false;
  return was;
}
