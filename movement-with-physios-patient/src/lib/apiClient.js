/**
 * apiClient — thin fetch wrapper for the MWP backend.
 *
 * Reads EXPO_PUBLIC_API_BASE_URL at build/runtime (Expo inlines the value into
 * the bundle for both Expo Go and native production builds). Every request
 * attaches the latest Clerk session token from tokenProvider.
 *
 * All methods return { success, data?, error?, status? } so callers can keep
 * the same envelope used by the existing chatService contract.
 */

import { tokenProvider } from './tokenProvider';

var BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
var API_PREFIX = '/api/v1';

if (!BASE_URL) {
  // Surface misconfig early — don't silently hit relative URLs in dev.
  // eslint-disable-next-line no-console
  console.warn('[apiClient] EXPO_PUBLIC_API_BASE_URL is not set');
}

/**
 * Build full URL for an API path.
 * @param {string} path - e.g. '/chat/rooms'
 * @returns {string}
 */
function buildUrl(path) {
  if (!path.startsWith('/')) path = '/' + path;
  return BASE_URL + API_PREFIX + path;
}

/**
 * Append query params to a URL.
 * @param {string} url
 * @param {Object<string, any>} params
 * @returns {string}
 */
function withQuery(url, params) {
  if (!params) return url;
  var pairs = [];
  Object.keys(params).forEach(function (k) {
    var v = params[k];
    if (v === undefined || v === null) return;
    pairs.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(v)));
  });
  if (pairs.length === 0) return url;
  return url + (url.indexOf('?') >= 0 ? '&' : '?') + pairs.join('&');
}

/**
 * Core request runner.
 * @param {string} method - GET | POST | DELETE | PATCH
 * @param {string} path
 * @param {{ body?: any, query?: Object, signal?: AbortSignal, idempotencyKey?: string }} [opts]
 * @returns {Promise<{ success: boolean, data?: any, error?: string, status?: number }>}
 */
async function request(method, path, opts) {
  var options = opts || {};
  var url = withQuery(buildUrl(path), options.query);

  var headers = { Accept: 'application/json', 'ngrok-skip-browser-warning': 'true' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

  var token = await tokenProvider.getToken();
  if (token) headers.Authorization = 'Bearer ' + token;

  var init = {
    method: method,
    headers: headers,
    signal: options.signal,
  };
  if (options.body !== undefined) init.body = JSON.stringify(options.body);

  try {
    var res = await fetch(url, init);
    var status = res.status;

    var json = null;
    try { json = await res.json(); } catch (e) { /* empty body is OK */ }

    if (!res.ok) {
      var msg = (json && json.error) || ('Request failed with status ' + status);
      return { success: false, error: msg, status: status };
    }

    // Backend envelope: { success: true, data: ... }
    if (json && typeof json === 'object' && 'success' in json) {
      if (json.success) return { success: true, data: json.data, status: status };
      return { success: false, error: json.error || 'Unknown error', status: status };
    }

    return { success: true, data: json, status: status };
  } catch (err) {
    return { success: false, error: err && err.message ? err.message : 'Network error' };
  }
}

export var apiClient = {
  baseUrl: function () { return BASE_URL; },
  get: function (path, query, signal) { return request('GET', path, { query: query, signal: signal }); },
  /**
   * @param {string} path
   * @param {*} body
   * @param {{ idempotencyKey?: string }} [options]
   */
  post: function (path, body, options) {
    var opts = { body: body };
    if (options && options.idempotencyKey) opts.idempotencyKey = options.idempotencyKey;
    return request('POST', path, opts);
  },
  /**
   * @param {string} path
   * @param {*} body
   * @param {{ idempotencyKey?: string }} [options]
   */
  patch: function (path, body, options) {
    var opts = { body: body };
    if (options && options.idempotencyKey) opts.idempotencyKey = options.idempotencyKey;
    return request('PATCH', path, opts);
  },
  del: function (path) { return request('DELETE', path); },
};
