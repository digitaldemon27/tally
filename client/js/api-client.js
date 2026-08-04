/**
 * api-client.js — Tally shared fetch helper
 *
 * Every feature that talks to the backend imports `apiRequest` from here.
 * This ensures all authenticated, timezone-aware requests use the same
 * header pattern — one change here fixes every feature at once.
 *
 * HOW TO USE FROM A FEATURE FILE:
 *   const data = await apiRequest('/scorecard/today');
 *   const created = await apiRequest('/scorecard', { method: 'POST', body: JSON.stringify({ note, label }) });
 */

'use strict';

// The backend runs on port 4000 (from server/.env PORT=4000) and mounts all
// routes under /api (see server.js: app.use('/api', masterRoutes)).
// TODO: update this to an environment-specific value when deploying beyond localhost.
const API_BASE = 'http://localhost:4000/api';

/**
 * Returns the stored JWT access token.
 * The login flow stores it under 'accessToken' in localStorage.
 * TODO: update this key name if the real auth wiring stores it differently —
 * this is the single place to change it, not every feature file.
 */
function getAuthToken() {
  return localStorage.getItem('accessToken');
}

let refreshInFlight = null;
let proactiveRefreshTimer = null;

function setAuthToken(token) {
  if (token) {
    localStorage.setItem('accessToken', token);
    setupProactiveRefresh();
  }
}

function removeAuthToken() {
  localStorage.removeItem('accessToken');
  clearProactiveRefresh();
}

async function tryRefreshToken() {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = fetch(`http://localhost:4000/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (data?.accessToken) {
        setAuthToken(data.accessToken);
        return true;
      }
      return false;
    })
    .catch(() => false)
    .finally(() => { refreshInFlight = null; });

  return refreshInFlight;
}

function setupProactiveRefresh() {
  clearProactiveRefresh();
  const token = getAuthToken();
  if (!token) return;

  // Refresh proactively every 13 minutes (13 * 60 * 1000 ms)
  // Access tokens expire in 15 minutes.
  proactiveRefreshTimer = setInterval(async () => {
    console.log('[DEBUG] Running proactive token refresh...');
    const success = await tryRefreshToken();
    if (!success) {
      console.warn('[DEBUG] Proactive token refresh failed. User session might expire.');
    }
  }, 13 * 60 * 1000);
}

function clearProactiveRefresh() {
  if (proactiveRefreshTimer) {
    clearInterval(proactiveRefreshTimer);
    proactiveRefreshTimer = null;
  }
}

// Auto-initialize proactive refresh on script load
if (typeof window !== 'undefined') {
  setupProactiveRefresh();
}

/**
 * Normalizes MongoDB _id and id properties.
 */
function getItemId(obj) {
  if (!obj) return null;
  return obj._id || obj.id || null;
}

/**
 * Call this at the very top of any page that requires login.
 * If there's no token, sends the user to sign in.
 */
function requireAuth() {
  const token = getAuthToken();
  if (!token) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

/**
 * Returns the browser's local IANA timezone string (e.g. 'Asia/Kolkata').
 */
function getUserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch (_) {
    return 'UTC';
  }
}

/**
 * Core fetch wrapper.
 */
async function apiRequest(path, options = {}) {
  const token = getAuthToken();
  const normalizedPath = path.startsWith('/api/') ? path : `/api${path.startsWith('/') ? '' : '/'}${path}`;
  const fullUrl = `http://localhost:4000${normalizedPath}`;

  let response;
  try {
    response = await fetch(fullUrl, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Timezone': getUserTimezone(),
        ...(options.headers || {}),
      },
    });
  } catch (networkError) {
    throw new Error('Network error — check your connection and try again.');
  }

  console.log('[DEBUG] apiRequest response status:', response.status);
  const isAuthRoute = normalizedPath.includes('/auth/login') ||
                      normalizedPath.includes('/auth/register') ||
                      normalizedPath.includes('/auth/verify-token') ||
                      normalizedPath.includes('/auth/set-password') ||
                      normalizedPath.includes('/auth/forgot-password') ||
                      normalizedPath.includes('/auth/reset-password');

  if (response.status === 401 && !isAuthRoute) {
    console.log('[DEBUG] 401 Unauthorized encountered. Attempting silent refresh...');
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      console.log('[DEBUG] Silent refresh succeeded. Retrying original request...');
      return apiRequest(path, options);
    }
    console.log('[DEBUG] Silent refresh failed or expired. Redirecting to login...');
    removeAuthToken();
    if (typeof window !== 'undefined' && !window.location.pathname.endsWith('login.html')) {
      window.location.href = 'login.html';
    }
    return;
  }

  let data = {};
  try {
    data = await response.json();
  } catch (err) {
    console.error('Failed to parse API response JSON:', err);
  }

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data;
}
