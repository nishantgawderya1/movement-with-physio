/**
 * apiClient — thin fetch wrapper for the MWP backend.
 *
 * Reads EXPO_PUBLIC_API_BASE_URL at build/runtime. Every request attaches the
 * latest Clerk session token from tokenProvider. Returns the standardized
 * { success, data?, error?, status? } envelope.
 */

import { tokenProvider } from './tokenProvider';

const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
const API_PREFIX = '/api/v1';

if (!BASE_URL) {
  // eslint-disable-next-line no-console
  console.warn('[apiClient] EXPO_PUBLIC_API_BASE_URL is not set');
}

function buildUrl(path) {
  if (!path.startsWith('/')) path = '/' + path;
  return BASE_URL + API_PREFIX + path;
}

function withQuery(url, params) {
  if (!params) return url;
  const pairs = [];
  Object.keys(params).forEach((k) => {
    const v = params[k];
    if (v === undefined || v === null) return;
    pairs.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(v)));
  });
  if (pairs.length === 0) return url;
  return url + (url.indexOf('?') >= 0 ? '&' : '?') + pairs.join('&');
}

async function request(method, path, opts) {
  const options = opts || {};
  const url = withQuery(buildUrl(path), options.query);

  const headers = { Accept: 'application/json', 'ngrok-skip-browser-warning': 'true' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const token = await tokenProvider.getToken();
  if (token) headers.Authorization = 'Bearer ' + token;

  const init = { method, headers, signal: options.signal };
  if (options.body !== undefined) init.body = JSON.stringify(options.body);

  try {
    const res = await fetch(url, init);
    const status = res.status;
    let json = null;
    try { json = await res.json(); } catch (e) {}

    if (!res.ok) {
      const msg = (json && json.error) || ('Request failed with status ' + status);
      return { success: false, error: msg, status };
    }

    if (json && typeof json === 'object' && 'success' in json) {
      if (json.success) return { success: true, data: json.data, status };
      return { success: false, error: json.error || 'Unknown error', status };
    }

    return { success: true, data: json, status };
  } catch (err) {
    return { success: false, error: err && err.message ? err.message : 'Network error' };
  }
}

export const apiClient = {
  baseUrl: () => BASE_URL,
  get: (path, query, signal) => request('GET', path, { query, signal }),
  post: (path, body) => request('POST', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
  del: (path) => request('DELETE', path),
};
