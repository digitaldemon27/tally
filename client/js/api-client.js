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

function setAuthToken(token) {
  if (token) localStorage.setItem('accessToken', token);
}

function removeAuthToken() {
  localStorage.removeItem('accessToken');
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

  if (response.status === 401) {
    removeAuthToken();
    window.location.href = 'login.html';
    return;
  }

  const data = await response.json();

  if (!response.ok) {
    // Use the backend's own message when available — controllers return
    // { success: false, message: "..." } for every non-2xx response.
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data;
}
