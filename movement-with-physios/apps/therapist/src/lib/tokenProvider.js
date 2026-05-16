/**
 * tokenProvider — singleton bridge between Clerk auth and plain-module
 * consumers (apiClient, chatSocket) that cannot use React hooks.
 *
 * A React component (ClerkTokenBridge) registers Clerk's getToken() once the
 * user is signed in. After that, any module can call getToken() to fetch a
 * fresh Clerk session JWT.
 *
 * Works identically in Expo Go and native builds — pure in-memory state.
 */

let _getTokenFn = null;
let _myUserId = null;
let _isSignedIn = false;
let _isReady = false;
let _onboardingCompleted = false;
let _isNewSignup = false;
const _listeners = new Set();
const _readyListeners = new Set();

function setTokenFetcher(fn) {
  _getTokenFn = fn;
}

async function getToken() {
  if (!_getTokenFn) return null;
  try {
    return await _getTokenFn();
  } catch (err) {
    return null;
  }
}

function setMyUserId(id) {
  _myUserId = id || null;
}

function getMyUserId() {
  return _myUserId;
}

function setSignedIn(value) {
  const next = !!value;
  if (next === _isSignedIn) return;
  _isSignedIn = next;
  _listeners.forEach((cb) => { try { cb(_isSignedIn); } catch (e) {} });
}

function isSignedIn() {
  return _isSignedIn;
}

function onAuthChange(cb) {
  _listeners.add(cb);
  return () => { _listeners.delete(cb); };
}

function setReady(value) {
  _isReady = !!value;
  _readyListeners.forEach((cb) => { try { cb(_isReady); } catch (e) {} });
}

function isReady() {
  return _isReady;
}

function onReady(cb) {
  _readyListeners.add(cb);
  // Fire immediately if already ready so late subscribers don't wait forever.
  if (_isReady) {
    try { cb(true); } catch (e) {}
  }
  return () => { _readyListeners.delete(cb); };
}

function setOnboardingCompleted(value) {
  _onboardingCompleted = !!value;
}

function getOnboardingCompleted() {
  return _onboardingCompleted;
}

/**
 * Whether the most recent /auth/me/init created a fresh User doc.
 * `true` only on the very first sign-in of a brand-new Clerk account;
 * `false` for every subsequent sign-in. Used by Bootstrap to decide
 * whether to send the user through onboarding or straight to Dashboard.
 * @param {boolean} value
 */
function setIsNewSignup(value) {
  _isNewSignup = !!value;
}

function isNewSignup() {
  return _isNewSignup;
}

export const tokenProvider = {
  setTokenFetcher,
  getToken,
  setMyUserId,
  getMyUserId,
  setSignedIn,
  isSignedIn,
  onAuthChange,
  setReady,
  isReady,
  onReady,
  setOnboardingCompleted,
  getOnboardingCompleted,
  setIsNewSignup,
  isNewSignup,
};
