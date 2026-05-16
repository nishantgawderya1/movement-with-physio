/**
 * tokenProvider — singleton bridge between Clerk auth and plain-module
 * consumers (apiClient, chatSocket) that cannot use React hooks.
 *
 * A React component (ClerkTokenBridge) registers Clerk's getToken() once the
 * user is signed in. After that, any module can call getToken() to fetch a
 * fresh Clerk session JWT, and listeners can react to auth state changes.
 *
 * Works identically in Expo Go and native builds — pure in-memory state.
 */

var _getTokenFn = null;
var _myUserId = null;
var _isSignedIn = false;
var _listeners = new Set();

/**
 * Register the token fetcher provided by Clerk (i.e. useAuth().getToken).
 * @param {() => Promise<string|null>} fn
 */
function setTokenFetcher(fn) {
  _getTokenFn = fn;
}

/**
 * Fetch a fresh Clerk session token. Returns null when signed out.
 * @returns {Promise<string|null>}
 */
async function getToken() {
  if (!_getTokenFn) return null;
  try {
    return await _getTokenFn();
  } catch (err) {
    return null;
  }
}

/**
 * Store the current user's Mongo ObjectId (returned from /patient/profile).
 * Used by chatService to mark messages as "mine".
 * @param {string|null} id
 */
function setMyUserId(id) {
  _myUserId = id || null;
}

/**
 * @returns {string|null}
 */
function getMyUserId() {
  return _myUserId;
}

/**
 * Update signed-in flag and notify listeners (chatSocket reconnect, etc.).
 * @param {boolean} value
 */
function setSignedIn(value) {
  var next = !!value;
  if (next === _isSignedIn) return;
  _isSignedIn = next;
  _listeners.forEach(function (cb) {
    try { cb(_isSignedIn); } catch (e) {}
  });
}

/**
 * @returns {boolean}
 */
function isSignedIn() {
  return _isSignedIn;
}

/**
 * Subscribe to signed-in state transitions.
 * @param {(signedIn: boolean) => void} cb
 * @returns {() => void} unsubscribe
 */
function onAuthChange(cb) {
  _listeners.add(cb);
  return function () { _listeners.delete(cb); };
}

export var tokenProvider = {
  setTokenFetcher: setTokenFetcher,
  getToken: getToken,
  setMyUserId: setMyUserId,
  getMyUserId: getMyUserId,
  setSignedIn: setSignedIn,
  isSignedIn: isSignedIn,
  onAuthChange: onAuthChange,
};
