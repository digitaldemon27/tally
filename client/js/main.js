/**
 * main.js — Tally
 * Handles: Nav scroll shadow, Scroll reveal, Smooth scroll,
 *          Interactive vote demo, Form validation (name, email,
 *          password strength, confirm password), Password toggles.
 *          Also drives: verify-email, set-password, dashboard, identity detail pages.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initScrollReveal();
  initSmoothScroll();
  initVoteDemo();
  initSignupForm();
  initEmailVerification(); // no-ops if not on verify-email.html
  initSetPasswordForm();   // no-ops if not on set-password.html
  // Mock implementations disabled in favor of real db-backed integrations in dashboard.js and identity.js
  // initDashboard();
  // initIdentityDetail();
  updateNavNotificationBadge();
});

/* ============================================================
   NAV — Add shadow / border on scroll
   ============================================================ */
function initNav() {
  const nav = document.querySelector('.site-nav');
  if (!nav) return;

  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 10);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run once on load
}

/* ============================================================
   SCROLL REVEAL — IntersectionObserver fallback for Firefox
   (Chrome/Edge 115+ use CSS scroll-driven animations natively)
   ============================================================ */
function initScrollReveal() {
  const nativeSupport = CSS.supports(
    '(animation-timeline: view()) and (animation-range: entry)'
  );

  if (nativeSupport) return; // CSS handles it

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;

  if (prefersReducedMotion) {
    reveals.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  reveals.forEach(el => observer.observe(el));
}

/* ============================================================
   SMOOTH SCROLL — for anchor links
   ============================================================ */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.pushState(null, '', targetId);

      // Move focus to the target for keyboard/SR users
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });
}

/* ============================================================
   INTERACTIVE VOTE DEMO — Hero card
   ============================================================ */
function initVoteDemo() {
  const btn = document.getElementById('cast-vote-btn');
  const countEl = document.getElementById('hero-vote-count');
  if (!btn || !countEl) return;

  // Current demo vote state
  let votes = 13;

  // All individual tally SVG groups in the hero card
  const tallyGroups = document.querySelectorAll('.card-tally .tally-group');

  // Track which strokes have been "drawn" (we'll add new ones dynamically)
  let currentGroupIdx = 2; // 0-indexed; group 0 and 1 are full (5 strokes each)
  let currentStrokeIdx = 3; // group 2 already has 3 strokes (votes 11-13)

  // How many strokes to show in each group before creating a new group
  const STROKES_PER_GROUP = 5;

  // Stroke coords within a group SVG (4 verticals + 1 diagonal)
  const STROKE_DEFS = [
    { x1: 6, y1: 4, x2: 6, y2: 28 }, // vertical 1
    { x1: 16, y1: 4, x2: 16, y2: 28 }, // vertical 2
    { x1: 26, y1: 4, x2: 26, y2: 28 }, // vertical 3
    { x1: 36, y1: 4, x2: 36, y2: 28 }, // vertical 4
    { x1: 2, y1: 26, x2: 46, y2: 6 }, // diagonal cross
  ];

  // SVG viewBox widths per stroke count
  const GROUP_WIDTHS = [0, 16, 26, 36, 46, 52];

  function createNewGroup() {
    const container = document.querySelector('.card-tally .tally-marks');
    if (!container) return null;

    const wrap = document.createElement('div');
    wrap.className = 'tally-group';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'tally-svg');
    svg.setAttribute('height', '32');
    svg.setAttribute('viewBox', '0 0 16 32');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.style.width = '16px';

    wrap.appendChild(svg);
    container.appendChild(wrap);

    return wrap;
  }

  function addStrokeToGroup(groupEl, strokeIdx) {
    const svg = groupEl.querySelector('svg');
    if (!svg) return;

    const def = STROKE_DEFS[strokeIdx];
    const isCross = strokeIdx === 4;
    const newWidth = isCross ? 52 : GROUP_WIDTHS[strokeIdx + 1];

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('class', 'tally-stroke');
    line.setAttribute('x1', def.x1);
    line.setAttribute('y1', def.y1);
    line.setAttribute('x2', def.x2);
    line.setAttribute('y2', def.y2);
    line.setAttribute('stroke', '#3D6B4F');
    line.setAttribute('stroke-width', '2.5');
    line.setAttribute('stroke-linecap', 'round');

    svg.setAttribute('viewBox', `0 0 ${newWidth} 32`);
    svg.style.width = `${newWidth}px`;

    svg.appendChild(line);

    // Trigger the CSS draw animation by forcing reflow
    line.getBoundingClientRect();
  }

  btn.addEventListener('click', () => {
    votes++;

    // Determine current group element
    let groupEls = document.querySelectorAll('.card-tally .tally-group');
    let currentGroup = groupEls[currentGroupIdx];

    // If this group is full (5 strokes done), start a new one
    if (currentStrokeIdx >= STROKES_PER_GROUP) {
      currentGroup = createNewGroup();
      currentGroupIdx++;
      currentStrokeIdx = 0;
      groupEls = document.querySelectorAll('.card-tally .tally-group');
      currentGroup = groupEls[currentGroupIdx];
    }

    addStrokeToGroup(currentGroup, currentStrokeIdx);
    currentStrokeIdx++;

    // Update vote count
    countEl.textContent = `${votes} votes`;

    // Button micro-feedback
    btn.textContent = 'Vote cast! ✓';
    btn.setAttribute('aria-label', `Voted! Total: ${votes} votes`);
    setTimeout(() => {
      btn.textContent = 'Cast another vote ✓';
      btn.setAttribute('aria-label', 'Cast a demo vote');
    }, 900);
  });
}

/* ============================================================
   SIGN-UP FORM — Full client-side validation
   ============================================================ */
function initSignupForm() {
  // signup.js owns sign-up handling if present
  if (typeof window.initSignupFormLive === 'function') return;
  const form = document.getElementById('signup-form');
  if (!form) return;
}

/* ---- Password show/hide toggle ---------------------------- */
function initPasswordToggle(btnId, inputId, iconId) {
  const btn = document.getElementById(btnId);
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!btn || !input) return;

  const EYE_OPEN = `
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  `;
  const EYE_SLASH = `
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  `;

  btn.addEventListener('click', () => {
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
    if (icon) icon.innerHTML = isHidden ? EYE_SLASH : EYE_OPEN;
  });
}

/* ---- Validation helpers ----------------------------------- */

/**
 * Show or clear an error message on a field.
 * @param {HTMLElement} input      - The input element.
 * @param {string}      errorBoxId - ID of the .field-error div.
 * @param {string}      errorTextId- ID of the span inside the error div.
 * @param {string}      iconId     - ID of the status icon span.
 * @param {string|null} message    - Error message or null for valid state.
 */
function setFieldState(input, errorBoxId, errorTextId, iconId, message) {
  const errorBox = document.getElementById(errorBoxId);
  const errorText = document.getElementById(errorTextId);
  const icon = document.getElementById(iconId);

  if (message) {
    // Error state
    input.classList.remove('is-valid');
    input.classList.add('is-error');
    input.setAttribute('aria-invalid', 'true');
    if (errorBox) errorBox.classList.add('visible');
    if (errorText) errorText.textContent = message;
    if (icon) { icon.textContent = ''; }
  } else {
    // Valid state
    input.classList.remove('is-error');
    input.classList.add('is-valid');
    input.setAttribute('aria-invalid', 'false');
    if (errorBox) errorBox.classList.remove('visible');
    if (errorText) errorText.textContent = '';
    if (icon) { icon.textContent = '✓'; icon.style.color = 'var(--moss)'; }
  }
}

function clearFieldState(input, errorBoxId, errorTextId, iconId) {
  const errorBox = document.getElementById(errorBoxId);
  const errorText = document.getElementById(errorTextId);
  const icon = document.getElementById(iconId);

  input.classList.remove('is-valid', 'is-error');
  input.removeAttribute('aria-invalid');
  if (errorBox) errorBox.classList.remove('visible');
  if (errorText) errorText.textContent = '';
  if (icon) icon.textContent = '';
}

/* ---- Username Validation ---------------------------------- */
function validateUsername(input) {
  const raw = input.value;
  const trimmed = raw.trim();

  // Empty
  if (raw.length === 0 || raw === '') {
    setFieldState(input, 'error-username', 'error-username-text', 'icon-username', 'Enter a username.');
    return false;
  }

  const usernameRegex = /^(?=.{3,30}$)[a-zA-Z0-9]+(?:[._-][a-zA-Z0-9]+)*$/;
  if (!usernameRegex.test(trimmed)) {
    setFieldState(
      input,
      'error-username',
      'error-username-text',
      'icon-username',
      'Username must be 3–30 characters long and may contain letters, numbers, dots (.), underscores (_) and hyphens (-). It cannot start or end with a special character or contain consecutive special characters.'
    );
    return false;
  }

  setFieldState(input, 'error-username', 'error-username-text', 'icon-username', null);
  return true;
}

/* ---- Email Validation ------------------------------------- */
function validateEmail(input) {
  const raw = input.value;
  const trimmed = raw.trim();

  if (raw.length === 0) {
    setFieldState(input, 'error-email', 'error-email-text', 'icon-email', 'Enter your email address.');
    return false;
  }

  const gmailRegex = /^(?=.{6,30}@gmail\.com$)(?!\.)(?!.*\.\.)(?!.*\.@)[A-Za-z0-9.]+@gmail\.com$/;
  if (!gmailRegex.test(trimmed)) {
    setFieldState(input, 'error-email', 'error-email-text', 'icon-email', 'Please enter a valid Gmail address.');
    return false;
  }

  setFieldState(input, 'error-email', 'error-email-text', 'icon-email', null);
  return true;
}

/* ---- Utility: debounce ------------------------------------ */
function debounce(fn, wait) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

/* ============================================================
   EMAIL VERIFICATION — verify-email.html
   ============================================================ */
function initEmailVerification() {
  // Only runs on the verify-email page
  const loadingState = document.getElementById('verify-state-loading');
  if (!loadingState) return;

  const successState = document.getElementById('verify-state-success');
  const errorState = document.getElementById('verify-state-error');
  const errorText = document.getElementById('verify-error-text');

  // Pull the token out of the URL (?token=...)
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  // No token in URL — skip the network call, go straight to error
  if (!token) {
    showVerifyError('No verification token found. Please use the link from your email.');
    return;
  }

  // Call the verify endpoint — same token format used by buddy invite links
  // TODO: wire to backend — POST /api/auth/verify-token (body: { token })
  setTimeout(() => {
    loadingState.style.display = 'none';
    successState.classList.add('visible');
    successState.focus();

    setTimeout(() => {
      window.location.href = `set-password.html?token=${encodeURIComponent(token)}`;
    }, 1500);
  }, 800);

  function showVerifyError(message) {
    loadingState.style.display = 'none';
    errorState.style.display = 'block';
    if (errorText) errorText.textContent = message;
    errorState.focus();
  }
}

/* ============================================================
   SET PASSWORD FORM — set-password.html
   ============================================================ */
function initSetPasswordForm() {
  // Only runs on the set-password page
  const form = document.getElementById('set-password-form');
  if (!form) return;

  const passwordInput = document.getElementById('input-password');
  const confirmInput = document.getElementById('input-password-confirm');
  const submitBtn = document.getElementById('set-password-submit-btn');
  const formBody = document.getElementById('set-password-body');
  const formSuccess = document.getElementById('set-password-success');
  const serverError = document.getElementById('set-password-server-error');
  const serverErrorTxt = document.getElementById('set-password-server-error-text');

  // Pull the signup token from the URL (?token=...)
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  // No token — show the server error banner and disable the form entirely
  if (!token) {
    showServerError('No setup token found. Please use the link from your verification email.');
    submitBtn.disabled = true;
    passwordInput.disabled = true;
    confirmInput.disabled = true;
    return;
  }

  // Wire up the existing show/hide toggles
  initPasswordToggle('toggle-password-btn', 'input-password', 'toggle-password-icon');
  initPasswordToggle('toggle-password-confirm-btn', 'input-password-confirm', 'toggle-password-confirm-icon');

  // Debounced validators
  const debouncedValidatePassword = debounce(() => validatePassword(passwordInput), 350);
  const debouncedValidateConfirm = debounce(() => validatePasswordConfirm(confirmInput, passwordInput), 350);

  // Password field — validate on input/blur, update strength meter on every keystroke
  passwordInput.addEventListener('input', () => {
    updateStrengthMeter(passwordInput.value);
    debouncedValidatePassword();
    // Re-check confirm match if user goes back and edits the password
    if (confirmInput.value.length > 0) debouncedValidateConfirm();
    updateSetPasswordSubmitState();
  });
  passwordInput.addEventListener('blur', () => {
    validatePassword(passwordInput);
    updateSetPasswordSubmitState();
  });

  // Confirm field — validate on input/blur
  confirmInput.addEventListener('input', () => {
    debouncedValidateConfirm();
    updateSetPasswordSubmitState();
  });
  confirmInput.addEventListener('blur', () => {
    validatePasswordConfirm(confirmInput, passwordInput);
    updateSetPasswordSubmitState();
  });

  // Set initial button state
  updateSetPasswordSubmitState();

  // --- Checks both fields are valid before enabling submit -----------------
  function checkSetPasswordValidity() {
    const pw = passwordInput.value;
    const cfm = confirmInput.value;
    const pwOk = pw.length >= 8 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw);
    const cfmOk = cfm.length > 0 && cfm === pw;
    return pwOk && cfmOk;
  }

  function updateSetPasswordSubmitState() {
    submitBtn.disabled = !checkSetPasswordValidity();
  }

  // --- Submit --------------------------------------------------------------
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Re-run all validations synchronously
    const pwOk = validatePassword(passwordInput);
    const cfmOk = validatePasswordConfirm(confirmInput, passwordInput);
    if (!pwOk || !cfmOk) return;

    // Hide any previous server error
    hideServerError();

    submitBtn.disabled = true;
    submitBtn.textContent = 'Setting your password…';

    // TODO: wire to backend — POST /api/auth/set-password
    setTimeout(() => {
      formBody.style.display = 'none';
      formSuccess.classList.add('visible');
      formSuccess.focus();
    }, 800);
  });

  function showServerError(message) {
    if (serverErrorTxt) serverErrorTxt.textContent = message;
    if (serverError) serverError.classList.add('visible');
  }

  function hideServerError() {
    if (serverError) serverError.classList.remove('visible');
    if (serverErrorTxt) serverErrorTxt.textContent = '';
  }
}

/* ---- Password Validation ------------------------------------------ */
function validatePassword(input) {
  const raw = input.value;

  // Empty
  if (raw.length === 0) {
    setFieldState(input, 'error-password', 'error-password-text', null, 'Enter a password.');
    return false;
  }
  // Too short
  if (raw.length < 8) {
    setFieldState(input, 'error-password', 'error-password-text', null, 'Password must be at least 8 characters.');
    return false;
  }
  // Must have at least one letter
  if (!/[a-zA-Z]/.test(raw)) {
    setFieldState(input, 'error-password', 'error-password-text', null, 'Add at least one letter.');
    return false;
  }
  // Must have at least one number
  if (!/[0-9]/.test(raw)) {
    setFieldState(input, 'error-password', 'error-password-text', null, 'Add at least one number.');
    return false;
  }

  setFieldState(input, 'error-password', 'error-password-text', null, null);
  return true;
}

/* ---- Confirm-password match check --------------------------------- */
function validatePasswordConfirm(confirmInput, passwordInput) {
  const cfm = confirmInput.value;
  const pw = passwordInput.value;

  if (cfm.length === 0) {
    setFieldState(confirmInput, 'error-password-confirm', 'error-password-confirm-text', null, 'Please confirm your password.');
    return false;
  }
  if (cfm !== pw) {
    setFieldState(confirmInput, 'error-password-confirm', 'error-password-confirm-text', null, "Passwords don't match.");
    return false;
  }

  setFieldState(confirmInput, 'error-password-confirm', 'error-password-confirm-text', null, null);
  return true;
}

/* ---- Strength meter ----------------------------------------------- */
function updateStrengthMeter(password) {
  const meter = document.getElementById('strength-meter-password');
  const bar1 = document.getElementById('strength-bar-1');
  const bar2 = document.getElementById('strength-bar-2');
  const bar3 = document.getElementById('strength-bar-3');
  const label = document.getElementById('strength-label');
  if (!meter || !bar1 || !bar2 || !bar3 || !label) return;

  // Show meter as soon as user starts typing
  if (password.length === 0) {
    meter.classList.remove('visible');
    return;
  }
  meter.classList.add('visible');

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const meetsMin = password.length >= 8;
  const isLong = password.length >= 12;

  // Determine tier
  let tier = 'weak';
  if (meetsMin && hasLetter && hasNumber) {
    tier = isLong ? 'strong' : 'medium';
  }

  // Reset all bars
  [bar1, bar2, bar3].forEach(b => b.className = 'strength-bar');
  label.className = 'strength-label';

  if (tier === 'weak') {
    bar1.classList.add('weak');
    label.classList.add('weak');
    label.textContent = 'Weak';
  } else if (tier === 'medium') {
    bar1.classList.add('medium');
    bar2.classList.add('medium');
    label.classList.add('medium');
    label.textContent = 'Medium';
  } else {
    bar1.classList.add('strong');
    bar2.classList.add('strong');
    bar3.classList.add('strong');
    label.classList.add('strong');
    label.textContent = 'Strong';
  }
}

/* ============================================================
   TINY HELPERS (defined as function declarations so they are hoisted
   and available to the MOCK_VOTE_LOGS IIFE below)
   ============================================================ */

function localDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// TODO: real implementation must use the user's stored timezone, not the browser's local date.
// Replace this function body when wiring timezone preferences from the backend.
function todayLocalDateStr() { return localDateStr(new Date()); }

function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateStr(d);
}

function randomId() { return Math.random().toString(36).slice(2, 11); }
function randomToken() { return Math.random().toString(36).slice(2, 18) + Math.random().toString(36).slice(2, 18); }
function delay(ms) { return new Promise(res => setTimeout(res, ms)); }

function relativeTime(isoStr) {
  const diffSec = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  const d = Math.floor(diffSec / 86400);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}

function formatDateDisplay(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ============================================================
   MOCK DATA — dashboard.html + identity.html
   All arrays are the source of truth until the backend is wired.
   Each has a TODO marking where the real API call goes.
   ============================================================ */

const CURRENT_USER_ID = 'user_me';
const CURRENT_USER_NAME = 'You';

// Buddy pairings — scoped to Identity (ownerUserId, identityId, buddyUserId).
// TODO: wire to backend — GET /api/buddy
let MOCK_BUDDY_PAIRINGS = [
  {
    id: 'bp_1', identityId: 'id_1', ownerUserId: CURRENT_USER_ID,
    inviteLink: 'https://tally.app/invite/abc123xyz', status: 'active',
    buddyUserId: 'user_priya', buddyName: 'Priya', createdAt: '2026-06-15T00:00:00.000Z',
  },
  // Active pairing where CURRENT_USER_ID is acting as buddy for Sam's Writer identity
  {
    id: 'bp_2', identityId: 'id_partner_1', ownerUserId: 'user_sam', ownerName: 'Sam',
    inviteLink: 'https://tally.app/invite/writer789', status: 'active',
    buddyUserId: CURRENT_USER_ID, buddyName: CURRENT_USER_NAME, createdAt: '2026-07-01T00:00:00.000Z',
  },
];

// Nudges — ONE-DIRECTIONAL ONLY (buddy -> owner). Owner never composes messages.
// TODO: wire to backend — GET /api/buddy/messages/:identityId (owner feed)
// TODO: wire to backend — POST /api/buddy/message/:identityId (buddy sending)
let MOCK_BUDDY_MESSAGES = [
  { id: 'bm_1', pairingId: 'bp_1', senderId: 'user_priya', senderName: 'Priya', text: "Hey! Joined as your Athlete buddy 💪 Let's keep each other on track.", sentAt: '2026-06-15T10:30:00.000Z' },
  { id: 'bm_3', pairingId: 'bp_1', senderId: 'user_priya', senderName: 'Priya', text: "That's the spirit — one missed day is normal. Just don't miss twice!", sentAt: '2026-06-16T09:45:00.000Z' },
  { id: 'bm_4', pairingId: 'bp_2', senderId: CURRENT_USER_ID, senderName: CURRENT_USER_NAME, text: "Keep writing every day! You're crushing it.", sentAt: '2026-07-02T11:00:00.000Z' },
];

// Partner habit data for buddy partner view (buddy-view.html)
// TODO: wire to backend — GET /api/buddy/:identityId
let MOCK_PARTNER_HABIT_DATA = {
  id_partner_1: {
    id: 'id_partner_1',
    name: 'Writer',
    ownerName: 'Sam',
    description: 'Someone who writes daily to refine their thinking.',
    totalVotes: 60,
    avgConsistency: 75,
    habits: [
      {
        id: 'ph_1',
        name: 'Write 500 words',
        frequency: 'Daily',
        trackingType: 'Count',
        totalVotes: 42,
        rollingConsistency: 80,
        missedState: 'missed-one',
      },
      {
        id: 'ph_2',
        name: 'Edit draft chapter',
        frequency: '3×/week',
        trackingType: 'Done/Not done',
        totalVotes: 18,
        rollingConsistency: 70,
        missedState: 'on-track',
      },
    ]
  }
};

// In-app notifications mock (Fix 5: Revocation & Nudge notifications)
// TODO: wire to backend — notification delivery mechanism (realtime via Socket.IO if online, else in-app on next load) to be finalized
let MOCK_NOTIFICATIONS = [
  { id: 'n_1', userId: CURRENT_USER_ID, message: 'Priya sent you a nudge on Athlete!', read: false, createdAt: '2026-06-16T09:45:00.000Z' }
];

/* ============================================================
   STATS — Powered by GET /api/votes/summary aggregate
   ============================================================ */

function computeTotalVotes(habitId) {
  const habit = MOCK_HABITS.find(h => h.id === habitId);
  return habit ? habit.totalVotes : 0;
}

function computeRollingConsistency(habitId) {
  const habit = MOCK_HABITS.find(h => h.id === habitId);
  return habit ? habit.rollingConsistency : 0;
}

function isVotedToday(habitId) {
  const habit = MOCK_HABITS.find(h => h.id === habitId);
  return habit ? habit.votedToday : false;
}

function computeMissedState(habitId) {
  const habit = MOCK_HABITS.find(h => h.id === habitId);
  return habit ? habit.missedState : 'on-track';
}

// TODO: wire to backend — GET /api/votes/summary
function getIdentityStats(identityId) {
  const habits = MOCK_HABITS.filter(h => h.identityId === identityId);
  const totalVotes = habits.reduce((s, h) => s + h.totalVotes, 0);
  const avgConsistency = habits.length
    ? Math.round(habits.reduce((s, h) => s + h.rollingConsistency, 0) / habits.length)
    : 0;
  return { totalVotes, avgConsistency, habitCount: habits.length };
}

function getActiveBuddy(identityId) {
  return MOCK_BUDDY_PAIRINGS.find(p => p.identityId === identityId && p.status === 'active') || null;
}

/* ============================================================
   SHARED MODAL HELPERS
   One generic open/close + focus-trap used by every modal.
   ============================================================ */

function openModal(overlayId, triggerEl, onClose) {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;
  overlay.classList.add('is-open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  const focusable = getFocusableElements(overlay);
  if (focusable.length) focusable[0].focus();

  function onOverlayClick(e) { if (e.target === overlay) close(); }
  function onKeyDown(e) {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') trapFocus(e, overlay);
  }
  overlay.addEventListener('click', onOverlayClick);
  document.addEventListener('keydown', onKeyDown);

  function close() {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    overlay.removeEventListener('click', onOverlayClick);
    document.removeEventListener('keydown', onKeyDown);
    if (triggerEl) triggerEl.focus();
    if (onClose) onClose();
  }
  overlay._close = close;
}

function closeModal(overlayId) {
  const overlay = document.getElementById(overlayId);
  if (overlay && overlay._close) overlay._close();
}

function getFocusableElements(container) {
  return Array.from(container.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
  ));
}

function trapFocus(e, container) {
  const focusable = getFocusableElements(container);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

/* ============================================================
   OVERFLOW MENUS — used on identity cards and habit rows
   ============================================================ */

function initOverflowMenus(root) {
  (root || document).querySelectorAll('.overflow-menu').forEach(menu => {
    const trigger = menu.querySelector('.overflow-menu__trigger');
    const dropdown = menu.querySelector('.overflow-menu__dropdown');
    if (!trigger || !dropdown) return;

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = menu.classList.contains('is-open');
      closeAllOverflowMenus();
      if (!isOpen) {
        menu.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
        const first = dropdown.querySelector('[role="menuitem"]');
        if (first) first.focus();
      }
    });

    dropdown.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeAllOverflowMenus(); trigger.focus(); }
    });
  });

  // Close on outside click
  if (!root) {
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.overflow-menu')) closeAllOverflowMenus();
    });
  }
}

function closeAllOverflowMenus() {
  document.querySelectorAll('.overflow-menu.is-open').forEach(m => {
    m.classList.remove('is-open');
    const t = m.querySelector('.overflow-menu__trigger');
    if (t) t.setAttribute('aria-expanded', 'false');
  });
}
/* ============================================================
   MULTI-SELECT & BULK DELETE HELPERS (Part A)
   ============================================================ */

function initMultiSelect({
  containerEl,
  checkboxSelector,
  actionBarId,
  countId,
  cancelBtnId,
  deleteBtnId,
  archiveBtnId,
  itemNoun,
  onDelete,
  onArchive
}) {
  const bar = document.getElementById(actionBarId);
  const countEl = document.getElementById(countId);
  const cancelBtn = document.getElementById(cancelBtnId);
  const deleteBtn = document.getElementById(deleteBtnId);
  const archiveBtn = archiveBtnId ? document.getElementById(archiveBtnId) : null;
  if (!bar || !countEl || !cancelBtn || !deleteBtn) return;

  let freshArchive = null;

  const freshDelete = deleteBtn.cloneNode(true);
  deleteBtn.parentNode.replaceChild(freshDelete, deleteBtn);

  if (archiveBtn) {
    freshArchive = archiveBtn.cloneNode(true);
    archiveBtn.parentNode.replaceChild(freshArchive, archiveBtn);

    freshArchive.addEventListener('click', async () => {
      const selectedIds = Array.from(containerEl.querySelectorAll(checkboxSelector + ':checked')).map(cb => cb.dataset.id);
      if (selectedIds.length === 0) return;

      freshArchive.disabled = true;
      freshArchive.textContent = 'Archiving…';
      try {
        if (onArchive) await onArchive(selectedIds);
        bar.classList.remove('is-visible');
        containerEl.classList.remove('selection-mode');
        containerEl.querySelectorAll(checkboxSelector + ':checked').forEach(cb => { cb.checked = false; });
      } catch (err) {
        console.error('Bulk archive failed:', err);
      } finally {
        freshArchive.disabled = false;
        freshArchive.textContent = 'Archive Selected';
      }
    });
  }

  function updateBar() {
    const checkboxes = Array.from(containerEl.querySelectorAll(checkboxSelector + ':checked'));
    const count = checkboxes.length;

    // Toggle highlight class on the card
    containerEl.querySelectorAll(checkboxSelector).forEach(cb => {
      const card = cb.closest('.identity-card') || cb.closest('.habit-row') || cb.closest('.card-select-wrap')?.parentNode;
      if (card) {
        card.classList.toggle('is-selected', cb.checked);
      }
    });

    countEl.textContent = `${count} ${count === 1 ? itemNoun : itemNoun + 's'} selected`;
    freshDelete.disabled = (count === 0);
    if (freshArchive) freshArchive.disabled = (count === 0);

    if (count > 0 || containerEl.classList.contains('selection-mode')) {
      bar.classList.add('is-visible');
    } else {
      bar.classList.remove('is-visible');
    }
  }

  containerEl.addEventListener('change', (e) => {
    if (e.target.matches(checkboxSelector)) {
      updateBar();
    }
  });

  cancelBtn.addEventListener('click', () => {
    containerEl.querySelectorAll(checkboxSelector + ':checked').forEach(cb => { cb.checked = false; });
    containerEl.classList.remove('selection-mode');
    // Clear all is-selected highlights
    containerEl.querySelectorAll('.is-selected').forEach(el => el.classList.remove('is-selected'));
    updateBar();
  });

  // Touch long press detection for mobile
  let pressTimer = null;
  let startX = 0;
  let startY = 0;
  let longPressed = false;

  const cardSelector = itemNoun === 'identity' ? '.identity-card' : '.habit-row';

  containerEl.addEventListener('touchstart', (e) => {
    const card = e.target.closest(cardSelector);
    if (!card) return;

    if (containerEl.classList.contains('selection-mode')) return;

    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    longPressed = false;

    pressTimer = setTimeout(() => {
      longPressed = true;
      containerEl.classList.add('selection-mode');
      const cb = card.querySelector(checkboxSelector);
      if (cb) {
        cb.checked = true;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, 600);
  }, { passive: true });

  containerEl.addEventListener('touchmove', (e) => {
    if (pressTimer) {
      const touch = e.touches[0];
      if (Math.abs(touch.clientX - startX) > 10 || Math.abs(touch.clientY - startY) > 10) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    }
  }, { passive: true });

  containerEl.addEventListener('touchend', (e) => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
    if (longPressed) {
      e.preventDefault();
    }
  });

  containerEl.addEventListener('touchcancel', () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  });

  freshDelete.addEventListener('click', () => {
    const selectedIds = Array.from(containerEl.querySelectorAll(checkboxSelector + ':checked')).map(cb => cb.dataset.id);
    if (selectedIds.length === 0) return;

    openConfirmDelete({
      title: `Delete ${selectedIds.length} ${selectedIds.length === 1 ? itemNoun : itemNoun + 's'}?`,
      body: `This will permanently delete ${selectedIds.length} ${selectedIds.length === 1 ? itemNoun : itemNoun + 's'} and associated data. This cannot be undone.`,
      triggerEl: freshDelete,
      onConfirm: async () => {
        await onDelete(selectedIds);
        bar.classList.remove('is-visible');
        containerEl.classList.remove('selection-mode');
      }
    });
  });
}

function handleDeleteIdentities(ids) {
  // TODO: wire to backend — DELETE /api/identity (body: { ids: [...] })
  MOCK_IDENTITIES = MOCK_IDENTITIES.filter(i => !ids.includes(i.id));
  MOCK_HABITS = MOCK_HABITS.filter(h => !ids.includes(h.identityId));
}

function handleDeleteHabits(ids) {
  // TODO: wire to backend — DELETE /api/habits (body: { ids: [...] })
  MOCK_HABITS = MOCK_HABITS.filter(h => !ids.includes(h.id));
}

/* ============================================================
   GENERIC CONFIRM DELETE MODAL
   ============================================================ */

function openConfirmDelete({ title, body, onConfirm, triggerEl }) {
  const titleEl = document.getElementById('confirm-delete-title');
  const bodyEl = document.getElementById('confirm-delete-body');
  const cancelBtn = document.getElementById('confirm-delete-cancel-btn');
  let confirmBtn = document.getElementById('confirm-delete-confirm-btn');

  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.textContent = body;

  // Clone to remove any previous event listener
  const freshConfirm = confirmBtn.cloneNode(true);
  freshConfirm.disabled = false;
  freshConfirm.textContent = 'Delete';
  confirmBtn.parentNode.replaceChild(freshConfirm, confirmBtn);

  freshConfirm.addEventListener('click', async () => {
    freshConfirm.disabled = true;
    freshConfirm.textContent = 'Deleting…';
    if (cancelBtn) cancelBtn.disabled = true;

    try {
      if (onConfirm) await onConfirm();
      closeModal('confirm-delete-overlay');
    } catch (err) {
      console.error('Delete action failed:', err);
    } finally {
      freshConfirm.disabled = false;
      freshConfirm.textContent = 'Delete';
      if (cancelBtn) cancelBtn.disabled = false;
    }
  });

  if (cancelBtn) {
    cancelBtn.onclick = () => closeModal('confirm-delete-overlay');
  }

  openModal('confirm-delete-overlay', triggerEl);
}

/* ============================================================
   DASHBOARD — dashboard.html
   ============================================================ */

function initDashboard() {
  const grid = document.getElementById('identity-grid');
  if (!grid) return;
  if (!requireAuth()) return;

  const emptyState = document.getElementById('identity-empty-state');
  const openBtn = document.getElementById('open-identity-modal-btn');
  const openBtnEmpty = document.getElementById('open-identity-modal-empty-btn');

  // Close overflow menus when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.overflow-menu')) closeAllOverflowMenus();
  });

  function renderGrid() {
    grid.innerHTML = '';

    if (MOCK_IDENTITIES.length === 0) {
      grid.style.display = 'none';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }
    grid.style.display = '';
    if (emptyState) emptyState.style.display = 'none';

    MOCK_IDENTITIES.forEach(identity => grid.appendChild(buildIdentityCard(identity, renderGrid)));
    initOverflowMenus(grid);
  }

  function renderBuddiesSection() {
    const buddiesSection = document.getElementById('buddies-support-section');
    const buddiesGrid = document.getElementById('buddies-grid');
    if (!buddiesSection || !buddiesGrid) return;

    // TODO: wire to backend — GET /api/buddy
    const partnerPairings = MOCK_BUDDY_PAIRINGS.filter(p => p.buddyUserId === CURRENT_USER_ID && p.status === 'active');

    if (partnerPairings.length === 0) {
      buddiesSection.style.display = 'none';
      return;
    }

    buddiesSection.style.display = 'block';
    buddiesGrid.innerHTML = '';

    partnerPairings.forEach(pairing => {
      const partnerData = getMockPartnerIdentityData(pairing.identityId);
      if (!partnerData) return;

      const card = document.createElement('article');
      card.className = 'identity-card reveal-item';
      card.setAttribute('data-color', 'plum');
      card.setAttribute('role', 'listitem');

      card.innerHTML = `
        <div class="identity-card__body js-card-nav" data-href="buddy-view.html?identityId=${encodeURIComponent(pairing.identityId)}">
          <p class="eyebrow" style="margin-bottom:var(--space-1);">${escapeHtml(partnerData.ownerName)}'s Identity</p>
          <p class="identity-card__name">
            <a class="identity-card__name-link"
               href="buddy-view.html?identityId=${encodeURIComponent(pairing.identityId)}"
               aria-label="View buddy details for ${escapeHtml(partnerData.ownerName)}'s ${escapeHtml(partnerData.name)}">
              ${escapeHtml(partnerData.name)}
            </a>
          </p>
          <p class="identity-card__desc">${escapeHtml(partnerData.description || '')}</p>
          <div class="identity-card__stats">
            <div class="identity-card__stat">
              <span class="identity-card__stat-value">${partnerData.totalVotes}</span>
              <span class="identity-card__stat-label">votes cast</span>
            </div>
            <div class="identity-card__stat">
              <span class="identity-card__stat-value">${partnerData.avgConsistency}%</span>
              <span class="identity-card__stat-label">consistent</span>
            </div>
          </div>
          <span class="identity-card__cta" aria-hidden="true">View partner habits →</span>
        </div>
      `;

      card.querySelector('.js-card-nav').addEventListener('click', (e) => {
        if (!e.target.closest('a')) {
          window.location.href = `buddy-view.html?identityId=${encodeURIComponent(pairing.identityId)}`;
        }
      });

      buddiesGrid.appendChild(card);
    });
  }

  renderGrid();
  renderBuddiesSection();

  // Multi-select bulk delete initialization
  initMultiSelect({
    containerEl: grid,
    checkboxSelector: '.js-identity-select',
    actionBarId: 'identity-action-bar',
    countId: 'identity-select-count',
    cancelBtnId: 'identity-cancel-select-btn',
    deleteBtnId: 'identity-delete-selected-btn',
    itemNoun: 'identity',
    onDelete: (ids) => {
      handleDeleteIdentities(ids);
      renderGrid();
    }
  });

  // Wire the "New Identity" button — TODO: wire to backend — POST /api/identity
  initIdentityModal(openBtn, 'create', null, renderGrid);
  if (openBtnEmpty) {
    openBtnEmpty.addEventListener('click', () => openIdentityModalFor('create', null, openBtnEmpty, renderGrid));
  }
}

/* ============================================================
   IDENTITY CARD — dashboard.html
   ============================================================ */

function buildIdentityCard(identity, onUpdate) {
  // TODO: wire to backend — GET /api/votes/summary
  const stats = getIdentityStats(identity.id);

  const article = document.createElement('article');
  article.className = 'identity-card reveal-item';
  article.setAttribute('data-color', identity.color || 'moss');
  article.setAttribute('role', 'listitem');
  article.dataset.id = identity.id;

  article.innerHTML = `
    <div class="card-select-wrap">
      <input type="checkbox" class="card-select-checkbox js-identity-select" data-id="${identity.id}" aria-label="Select ${escapeHtml(identity.name)}" />
    </div>

    <div class="identity-card__body js-card-nav" data-href="identity.html?id=${encodeURIComponent(identity.id)}" style="padding-left: calc(var(--space-4) + 28px);">
      <p class="identity-card__name">
        <a class="identity-card__name-link"
           href="identity.html?id=${encodeURIComponent(identity.id)}"
           aria-label="View habits for ${escapeHtml(identity.name)}">
          ${escapeHtml(identity.name)}
        </a>
      </p>
      ${identity.description ? `<p class="identity-card__desc">${escapeHtml(identity.description)}</p>` : ''}
      <div class="identity-card__stats">
        <div class="identity-card__stat">
          <span class="identity-card__stat-value">${stats.totalVotes}</span>
          <span class="identity-card__stat-label">votes cast</span>
        </div>
        <div class="identity-card__stat">
          <span class="identity-card__stat-value">${stats.avgConsistency}%</span>
          <span class="identity-card__stat-label">consistent</span>
        </div>
        <div class="identity-card__stat">
          <span class="identity-card__stat-value">${stats.habitCount}</span>
          <span class="identity-card__stat-label">${stats.habitCount === 1 ? 'habit' : 'habits'}</span>
        </div>
      </div>
      <span class="identity-card__cta" aria-hidden="true">View habits →</span>
    </div>

    <!-- Overflow menu — positioned on top of the card body, z-index 2 -->
    <div class="overflow-menu" role="none">
      <button class="overflow-menu__trigger"
              aria-label="Options for ${escapeHtml(identity.name)}"
              aria-haspopup="menu"
              aria-expanded="false"
              type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
        </svg>
      </button>
      <ul class="overflow-menu__dropdown" role="menu" aria-label="${escapeHtml(identity.name)} options">
        <li><button class="overflow-menu__item" role="menuitem" data-action="edit">Edit</button></li>
        <li><button class="overflow-menu__item overflow-menu__item--danger" role="menuitem" data-action="delete">Delete</button></li>
      </ul>
    </div>
  `;

  // Whole-body mouse navigation
  article.querySelector('.js-card-nav').addEventListener('click', (e) => {
    if (!e.target.closest('.overflow-menu') && !e.target.closest('.card-select-wrap') && !e.target.closest('a')) {
      window.location.href = `identity.html?id=${encodeURIComponent(identity.id)}`;
    }
  });

  // Overflow menu actions
  const trigger = article.querySelector('.overflow-menu__trigger');
  article.querySelector('[data-action="edit"]').addEventListener('click', () => {
    closeAllOverflowMenus();
    // TODO: wire to backend — PATCH /api/identity/:id
    openIdentityModalFor('edit', identity, trigger, onUpdate);
  });
  article.querySelector('[data-action="delete"]').addEventListener('click', () => {
    closeAllOverflowMenus();
    openConfirmDelete({
      title: `Delete "${identity.name}"?`,
      body: `This will permanently delete the "${identity.name}" identity and all its habits. This cannot be undone.`,
      triggerEl: trigger,
      onConfirm: () => {
        // Single-item delete routes to bulk delete function with single-item array
        // TODO: wire to backend — DELETE /api/identity (body: { ids: [...] })
        handleDeleteIdentities([identity.id]);
        if (onUpdate) onUpdate();
      },
    });
  });

  return article;
}

/* ============================================================
   IDENTITY MODAL — create + edit
   ============================================================ */

function initIdentityModal(triggerBtn, mode, existingIdentity, onSuccess) {
  if (!document.getElementById('identity-modal-overlay')) return;
  if (triggerBtn) {
    triggerBtn.addEventListener('click', () => openIdentityModalFor('create', null, triggerBtn, onSuccess));
  }
  wireIdentityModalForm(onSuccess);
}

function openIdentityModalFor(mode, identity, triggerEl, onSuccess) {
  const overlay = document.getElementById('identity-modal-overlay');
  if (!overlay) return;

  const titleEl = document.getElementById('identity-modal-title');
  const subtitleEl = document.getElementById('identity-modal-subtitle');
  const submitBtn = document.getElementById('identity-submit-btn');
  const nameInput = document.getElementById('input-identity-name');
  const descInput = document.getElementById('input-identity-description');
  const editIdField = document.getElementById('identity-edit-id');

  // Reset form
  document.getElementById('identity-form')?.reset();
  clearFieldState(nameInput, 'error-identity-name', 'error-identity-name-text', 'icon-identity-name');
  updateDescCharCount(0);

  if (mode === 'edit' && identity) {
    if (titleEl) titleEl.textContent = 'Edit Identity';
    if (subtitleEl) subtitleEl.textContent = 'Update the name, description, or color.';
    if (submitBtn) submitBtn.textContent = 'Save Changes';
    if (editIdField) editIdField.value = identity.id;
    if (nameInput) { nameInput.value = identity.name; submitBtn.disabled = false; }
    if (descInput) { descInput.value = identity.description || ''; updateDescCharCount(descInput.value.length); }
    // Pre-select color swatch
    const radio = overlay.querySelector(`input[name="identity-color"][value="${identity.color}"]`);
    if (radio) radio.checked = true;
  } else {
    if (titleEl) titleEl.textContent = 'New Identity';
    if (subtitleEl) subtitleEl.textContent = 'Define who you\'re becoming — you can always rename it later.';
    if (submitBtn) { submitBtn.textContent = 'Create Identity'; submitBtn.disabled = true; }
    if (editIdField) editIdField.value = '';
    // Default color to moss
    const radio = overlay.querySelector('input[name="identity-color"][value="moss"]');
    if (radio) radio.checked = true;
  }

  openModal('identity-modal-overlay', triggerEl);

  // Store callback on the overlay so wireIdentityModalForm can call it
  overlay._onSuccess = onSuccess;
}

function wireIdentityModalForm(onSuccess) {
  const overlay = document.getElementById('identity-modal-overlay');
  if (!overlay || overlay._wired) return;
  overlay._wired = true;

  const closeBtn = document.getElementById('identity-modal-close-btn');
  const form = document.getElementById('identity-form');
  const nameInput = document.getElementById('input-identity-name');
  const descInput = document.getElementById('input-identity-description');
  const submitBtn = document.getElementById('identity-submit-btn');

  if (closeBtn) closeBtn.addEventListener('click', () => closeModal('identity-modal-overlay'));

  // Live char count on description
  if (descInput) {
    descInput.addEventListener('input', () => updateDescCharCount(descInput.value.length));
  }

  // Submit enable/disable
  const debouncedValidate = debounce(() => validateIdentityName(nameInput), 350);
  if (nameInput) {
    nameInput.addEventListener('input', () => {
      debouncedValidate();
      submitBtn.disabled = nameInput.value.trim().length < 2;
    });
    nameInput.addEventListener('blur', () => validateIdentityName(nameInput));
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validateIdentityName(nameInput)) return;

      const name = nameInput.value.trim();
      const description = descInput?.value.trim() || null;
      const color = overlay.querySelector('input[name="identity-color"]:checked')?.value || 'moss';
      const editId = document.getElementById('identity-edit-id')?.value;

      if (editId) {
        // Edit mode — TODO: wire to backend — PATCH /api/identity/:id
        const existing = MOCK_IDENTITIES.find(i => i.id === editId);
        if (existing) { existing.name = name; existing.description = description; existing.color = color; }
      } else {
        // Create mode — TODO: wire to backend — POST /api/identity
        MOCK_IDENTITIES.push({ id: `id_${Date.now()}`, name, description, color, createdAt: new Date().toISOString() });
      }

      const cb = overlay._onSuccess || onSuccess;
      if (cb) cb();
      closeModal('identity-modal-overlay');
    });
  }
}

function updateDescCharCount(len) {
  const el = document.getElementById('desc-char-count');
  if (!el) return;
  el.textContent = `${len} / 120`;
  el.className = 'char-count';
  if (len >= 120) el.classList.add('char-count--at-limit');
  else if (len >= 90) el.classList.add('char-count--near-limit');
}

/* ============================================================
   IDENTITY DETAIL — identity.html
   ============================================================ */

function initIdentityDetail() {
  // Disabled mock handler — live handler initIdentityPage in identity.js manages identity.html
  return;
  const habitList = document.getElementById('habit-list');
  if (!habitList) return;
  if (!requireAuth()) return;

  const params = new URLSearchParams(window.location.search);
  const identityId = params.get('id');

  if (!identityId) {
    document.getElementById('identity-detail-heading').textContent = 'Identity not found';
    return;
  }

  // TODO: wire to backend — GET /api/identity/:id
  const identity = MOCK_IDENTITIES.find(i => i.id === identityId);
  if (!identity) {
    document.getElementById('identity-detail-heading').textContent = 'Identity not found';
    return;
  }

  document.title = `${identity.name} — Tally`;
  renderIdentityHeader(identity);

  // Edit / delete identity from detail page
  const editBtn = document.getElementById('edit-identity-btn');
  const deleteBtn = document.getElementById('delete-identity-btn');
  if (editBtn) {
    editBtn.style.display = '';
    editBtn.addEventListener('click', () => openIdentityEditFromDetail(identity, editBtn));
  }
  if (deleteBtn) {
    deleteBtn.style.display = '';
    deleteBtn.addEventListener('click', () => {
      openConfirmDelete({
        title: `Delete "${identity.name}"?`,
        body: `This will permanently delete the "${identity.name}" identity and all its habits. This cannot be undone.`,
        triggerEl: deleteBtn,
        onConfirm: () => {
          // TODO: wire to backend — DELETE /api/identity (body: { ids: [...] })
          handleDeleteIdentities([identity.id]);
          window.location.href = 'dashboard.html';
        },
      });
    });
  }

  // Close overflow menus on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.overflow-menu')) closeAllOverflowMenus();
  });

  const openBtn = document.getElementById('open-habit-modal-btn');
  const openBtnEmpty = document.getElementById('open-habit-modal-empty-btn');

  function renderHabits() {
    renderIdentityHeader(identity); // keep aggregate stats fresh after votes
    // TODO: wire to backend — GET /api/identity/:identityId/habits
    const habits = MOCK_HABITS.filter(h => h.identityId === identityId);
    habitList.innerHTML = '';

    const emptyState = document.getElementById('habit-empty-state');
    if (habits.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }
    if (emptyState) emptyState.style.display = 'none';

    habits.forEach(habit => {
      const row = buildHabitRow(habit, identityId, renderHabits);
      habitList.appendChild(row);
    });
    initOverflowMenus(habitList);
  }

  renderHabits();

  // Multi-select bulk delete initialization for habits
  initMultiSelect({
    containerEl: habitList,
    checkboxSelector: '.js-habit-select',
    actionBarId: 'habit-action-bar',
    countId: 'habit-select-count',
    cancelBtnId: 'habit-cancel-select-btn',
    deleteBtnId: 'habit-delete-selected-btn',
    itemNoun: 'habit',
    onDelete: (ids) => {
      handleDeleteHabits(ids);
      renderHabits();
    }
  });

  // TODO: wire to backend — POST /api/identity/:identityId/habits
  wireHabitModal(openBtn, identityId, renderHabits);
  if (openBtnEmpty) {
    openBtnEmpty.addEventListener('click', () => openHabitModalFor('create', null, identityId, openBtnEmpty, renderHabits));
  }

  // Buddy section
  initBuddySection(identityId);
}

function renderIdentityHeader(identity) {
  const headingEl = document.getElementById('identity-detail-heading');
  const descEl = document.getElementById('identity-detail-description');
  const eyebrowEl = document.getElementById('identity-detail-eyebrow');
  const votesEl = document.getElementById('identity-stat-votes');
  const consisEl = document.getElementById('identity-stat-consistency');

  if (headingEl) headingEl.textContent = identity.name;
  if (descEl) descEl.textContent = identity.description || '';
  if (eyebrowEl) eyebrowEl.textContent = 'Identity';

  const stats = getIdentityStats(identity.id);
  if (votesEl) votesEl.textContent = stats.totalVotes;
  if (consisEl) consisEl.textContent = `${stats.avgConsistency}%`;
}

// Injects a lightweight edit modal directly into identity.html's DOM
function openIdentityEditFromDetail(identity, triggerEl) {
  // Reuse the confirm-delete overlay infrastructure — inject our own modal if it doesn't exist yet
  let overlay = document.getElementById('identity-edit-inline-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'identity-edit-inline-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'identity-edit-inline-title');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div class="modal-panel">
        <button class="modal-close-btn" id="iei-close" type="button" aria-label="Close dialog">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <h2 class="form-title" id="identity-edit-inline-title">Edit Identity</h2>
        <p class="form-subtitle">Update the name, description, or color.</p>
        <form id="iei-form" novalidate autocomplete="off">
          <div class="field-group">
            <label class="field-label" for="iei-name">Name <span class="field-required" aria-hidden="true">*</span></label>
            <div class="field-input-wrap">
              <input class="field-input" type="text" id="iei-name" maxlength="40" aria-required="true" />
            </div>
          </div>
          <div class="field-group">
            <label class="field-label" for="iei-desc">Description <span class="field-optional">(optional)</span></label>
            <div style="position:relative;">
              <textarea class="field-input field-textarea" id="iei-desc" maxlength="120" rows="2"></textarea>
              <span class="char-count" id="iei-char-count">0 / 120</span>
            </div>
          </div>
          <div class="field-group">
            <p class="field-label" id="iei-color-label">Card color</p>
            <div class="color-picker" role="group" aria-labelledby="iei-color-label">
              ${[['moss', 'var(--moss)', 'Forest green'], ['blue', 'var(--accent-blue)', 'Slate blue'], ['terra', 'var(--accent-terra)', 'Terracotta'], ['plum', 'var(--accent-plum)', 'Plum'], ['teal', 'var(--accent-teal)', 'Teal'], ['amber', 'var(--accent-amber)', 'Amber']].map(([val, bg, label]) => `
              <label class="color-swatch" title="${label}">
                <input type="radio" name="iei-color" value="${val}" />
                <span class="color-swatch__dot" style="background:${bg};" aria-hidden="true"></span>
                <span class="sr-only">${label}</span>
              </label>`).join('')}
            </div>
          </div>
          <div class="form-submit-row">
            <button type="submit" class="btn btn-primary btn-lg btn-submit" id="iei-submit">Save Changes</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(overlay);
  }

  // Pre-fill
  overlay.querySelector('#iei-name').value = identity.name;
  const desc = overlay.querySelector('#iei-desc');
  desc.value = identity.description || '';
  const charCount = overlay.querySelector('#iei-char-count');
  if (charCount) charCount.textContent = `${desc.value.length} / 120`;
  const colorRadio = overlay.querySelector(`input[name="iei-color"][value="${identity.color || 'moss'}"]`);
  if (colorRadio) colorRadio.checked = true;

  overlay.querySelector('#iei-close').onclick = () => closeModal('identity-edit-inline-overlay');
  desc.oninput = () => { if (charCount) charCount.textContent = `${desc.value.length} / 120`; };

  const form = overlay.querySelector('#iei-form');
  // Remove any old submit listener by cloning
  const freshForm = form.cloneNode(true);
  form.parentNode.replaceChild(freshForm, form);
  freshForm.querySelector('#iei-desc').oninput = () => {
    const cnt = freshForm.querySelector('#iei-char-count');
    if (cnt) cnt.textContent = `${freshForm.querySelector('#iei-desc').value.length} / 120`;
  };
  freshForm.querySelector('#iei-close') && (freshForm.querySelector('#iei-close').onclick = () => closeModal('identity-edit-inline-overlay'));
  freshForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = freshForm.querySelector('#iei-name').value.trim();
    if (!name) return;
    // TODO: wire to backend — PATCH /api/identity/:id
    identity.name = name;
    identity.description = freshForm.querySelector('#iei-desc').value.trim() || null;
    identity.color = freshForm.querySelector('input[name="iei-color"]:checked')?.value || identity.color;
    renderIdentityHeader(identity);
    closeModal('identity-edit-inline-overlay');
  });

  openModal('identity-edit-inline-overlay', triggerEl);
}

/* ============================================================
   HABIT ROW — identity.html
   ============================================================ */

const FREQ_LABELS = { daily: 'Daily', weekly_3x: '3×/week', weekly_5x: '5×/week' };
const TRACKING_LABELS = { boolean: 'Done/Not done', count: 'Count', duration: 'Duration' };

function buildHabitRow(habit, identityId, onUpdate) {
  // TODO: wire to backend — GET /api/votes/summary
  const totalVotes = computeTotalVotes(habit.id);
  const consistency = computeRollingConsistency(habit.id);
  const votedToday = isVotedToday(habit.id);
  const missedState = computeMissedState(habit.id);
  const activeBuddy = getActiveBuddy(identityId);

  // Never-miss-twice indicator — tone-conscious per product spec
  let nmtHtml = '';
  if (missedState === 'missed-one') {
    nmtHtml = `<span class="nmt-indicator nmt-indicator--missed-one">Missed yesterday — cast today's vote to keep going</span>`;
  } else if (missedState === 'missed-two') {
    const buddyNote = activeBuddy
      ? ` Your buddy ${escapeHtml(activeBuddy.buddyName)} will be notified.`
      : '';
    nmtHtml = `<span class="nmt-indicator nmt-indicator--missed-two">Two days missed — even the tiny version counts today.${buddyNote}</span>`;
  }

  const row = document.createElement('div');
  row.className = 'habit-row';
  row.setAttribute('role', 'listitem');
  row.dataset.habitId = habit.id;

  row.innerHTML = `
    <!-- Multi-select checkbox -->
    <div class="card-select-wrap" style="position:relative; top:0; left:0; display:flex; align-items:center; margin-right:var(--space-3);">
      <input type="checkbox" class="card-select-checkbox js-habit-select" data-id="${habit.id}" aria-label="Select ${escapeHtml(habit.name)}" />
    </div>

    <!-- Left: name, meta, NMT indicator -->
    <div class="habit-row__content">
      <p class="habit-row__name">${escapeHtml(habit.name)}</p>
      <div class="habit-row__meta">
        <span class="freq-badge">${escapeHtml(FREQ_LABELS[habit.frequency] || habit.frequency)}</span>
        <span class="tracking-badge">${escapeHtml(TRACKING_LABELS[habit.trackingType] || habit.trackingType)}</span>
      </div>
      ${nmtHtml}
    </div>

    <!-- Center: lifetime votes + rolling consistency (neutral — no color coding on value) -->
    <div class="habit-stats" aria-label="Stats for ${escapeHtml(habit.name)}">
      <div class="habit-stat">
        <span class="habit-stat__value">${totalVotes}</span>
        <span class="habit-stat__label">votes</span>
      </div>
      <div class="habit-stats__divider"></div>
      <div class="habit-stat">
        <span class="habit-stat__value habit-stat__value--consistency">${consistency}%</span>
        <span class="habit-stat__label">30-day</span>
      </div>
    </div>

    <!-- Right: VOTE BUTTON -->
    <button
      class="vote-btn ${votedToday ? 'voted' : 'not-voted'}"
      type="button"
      id="vote-btn-${escapeHtml(habit.id)}"
      aria-label="${votedToday ? 'Already voted today for ' + escapeHtml(habit.name) : 'Cast vote for ' + escapeHtml(habit.name)}"
      ${votedToday ? 'disabled aria-disabled="true"' : ''}
    >
      <span class="vote-btn__icon" aria-hidden="true">${votedToday ? '✓' : '🗳'}</span>
      <span class="vote-btn__label">${votedToday ? 'Voted' : 'Cast vote'}</span>
    </button>

    <!-- Overflow menu — edit / delete -->
    <div class="overflow-menu" role="none">
      <button class="overflow-menu__trigger"
              aria-label="Options for ${escapeHtml(habit.name)}"
              aria-haspopup="menu"
              aria-expanded="false"
              type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
        </svg>
      </button>
      <ul class="overflow-menu__dropdown" role="menu" aria-label="${escapeHtml(habit.name)} options">
        <li><button class="overflow-menu__item" role="menuitem" data-action="edit">Edit</button></li>
        <li><button class="overflow-menu__item overflow-menu__item--danger" role="menuitem" data-action="delete">Delete</button></li>
      </ul>
    </div>
  `;

  // Wire the vote button
  if (!votedToday) {
    const voteBtn = row.querySelector('.vote-btn');
    voteBtn.addEventListener('click', () => castVote(habit.id, identityId, voteBtn, onUpdate));
  }

  // Overflow menu actions
  const trigger = row.querySelector('.overflow-menu__trigger');
  row.querySelector('[data-action="edit"]').addEventListener('click', () => {
    closeAllOverflowMenus();
    // TODO: wire to backend — PATCH /api/habits/:id
    // TODO: wire to backend — PATCH /api/votes/:id
    openHabitModalFor('edit', habit, identityId, trigger, onUpdate);
  });
  row.querySelector('[data-action="delete"]').addEventListener('click', () => {
    closeAllOverflowMenus();
    openConfirmDelete({
      title: `Delete "${habit.name}"?`,
      body: `This will permanently remove "${habit.name}" and all its votes. This cannot be undone.`,
      triggerEl: trigger,
      onConfirm: () => {
        // Single habit delete routes to bulk delete function with single-item array
        // TODO: wire to backend — DELETE /api/habits (body: { ids: [...] })
        // TODO: wire to backend — DELETE /api/votes/:id
        handleDeleteHabits([habit.id]);
        if (onUpdate) onUpdate();
      },
    });
  });

  return row;
}

/* ============================================================
   VOTE CASTING
   ============================================================ */

function castVote(habitId, identityId, voteBtn, onUpdate) {
  // TODO: wire to backend — POST /api/votes (body: { habitId, identityId })
  voteBtn.disabled = true;
  voteBtn.classList.add('vote-casting');

  voteBtn.addEventListener('animationend', () => {
    voteBtn.classList.remove('vote-casting');

    const habit = MOCK_HABITS.find(h => h.id === habitId);
    if (habit) {
      habit.totalVotes++;
      habit.votedToday = true;
      habit.missedState = 'on-track';
    }

    voteBtn.classList.replace('not-voted', 'voted');
    voteBtn.setAttribute('aria-label', `Already voted today`);
    voteBtn.setAttribute('aria-disabled', 'true');
    voteBtn.querySelector('.vote-btn__icon').textContent = '✓';
    voteBtn.querySelector('.vote-btn__label').textContent = 'Voted';

    if (onUpdate) onUpdate();
  }, { once: true });
}

/* ============================================================
   HABIT MODAL — create + edit
   ============================================================ */

function wireHabitModal(triggerBtn, identityId, onSuccess) {
  if (!document.getElementById('habit-modal-overlay')) return;
  if (triggerBtn) {
    triggerBtn.addEventListener('click', () => openHabitModalFor('create', null, identityId, triggerBtn, onSuccess));
  }
  wireHabitModalForm(identityId, onSuccess);
}

function openHabitModalFor(mode, habit, identityId, triggerEl, onSuccess) {
  const overlay = document.getElementById('habit-modal-overlay');
  if (!overlay) return;

  const titleEl = document.getElementById('habit-modal-title');
  const subtitleEl = document.getElementById('habit-modal-subtitle');
  const submitBtn = document.getElementById('habit-submit-btn');
  const nameInput = document.getElementById('input-habit-name');
  const editIdField = document.getElementById('habit-edit-id');

  document.getElementById('habit-form')?.reset();
  clearFieldState(nameInput, 'error-habit-name', 'error-habit-name-text', 'icon-habit-name');

  if (mode === 'edit' && habit) {
    if (titleEl) titleEl.textContent = 'Edit Habit';
    if (subtitleEl) subtitleEl.textContent = 'Update the name, frequency, or tracking type.';
    if (submitBtn) submitBtn.textContent = 'Save Changes';
    if (editIdField) editIdField.value = habit.id;
    if (nameInput) { nameInput.value = habit.name; submitBtn.disabled = false; }

    const freqRadio = overlay.querySelector(`input[name="habit-frequency"][value="${habit.frequency}"]`);
    if (freqRadio) freqRadio.checked = true;
    const trackRadio = overlay.querySelector(`input[name="habit-tracking"][value="${habit.trackingType}"]`);
    if (trackRadio) trackRadio.checked = true;
  } else {
    if (titleEl) titleEl.textContent = 'New Habit';
    if (subtitleEl) subtitleEl.textContent = 'Keep it concrete and actionable — something you can do today.';
    if (submitBtn) { submitBtn.textContent = 'Create Habit'; submitBtn.disabled = true; }
    if (editIdField) editIdField.value = '';
  }

  openModal('habit-modal-overlay', triggerEl);
  overlay._onSuccess = onSuccess;
  overlay._identityId = identityId;
}

function wireHabitModalForm(identityId, onSuccess) {
  const overlay = document.getElementById('habit-modal-overlay');
  if (!overlay || overlay._wired) return;
  overlay._wired = true;

  const closeBtn = document.getElementById('habit-modal-close-btn');
  const form = document.getElementById('habit-form');
  const nameInput = document.getElementById('input-habit-name');
  const submitBtn = document.getElementById('habit-submit-btn');

  if (closeBtn) closeBtn.addEventListener('click', () => closeModal('habit-modal-overlay'));

  const debouncedValidate = debounce(() => validateHabitName(nameInput), 350);
  if (nameInput) {
    nameInput.addEventListener('input', () => {
      debouncedValidate();
      submitBtn.disabled = nameInput.value.trim().length < 2;
    });
    nameInput.addEventListener('blur', () => validateHabitName(nameInput));
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validateHabitName(nameInput)) return;

      const name = nameInput.value.trim();
      const frequency = overlay.querySelector('input[name="habit-frequency"]:checked')?.value || 'daily';
      const trackingType = overlay.querySelector('input[name="habit-tracking"]:checked')?.value || 'boolean';
      const editId = document.getElementById('habit-edit-id')?.value;
      const iid = overlay._identityId || identityId;

      if (editId) {
        // Edit mode — TODO: wire to backend — PATCH /api/habits/:id
        const existing = MOCK_HABITS.find(h => h.id === editId);
        if (existing) { existing.name = name; existing.frequency = frequency; existing.trackingType = trackingType; }
      } else {
        // Create mode — TODO: wire to backend — POST /api/identity/:identityId/habits
        MOCK_HABITS.push({
          id: `hab_${Date.now()}`, identityId: iid, name, frequency, trackingType,
          totalVotes: 0, rollingConsistency: 0, votedToday: false, missedState: 'on-track',
          createdAt: new Date().toISOString(),
        });
      }

      const cb = overlay._onSuccess || onSuccess;
      if (cb) cb();
      closeModal('habit-modal-overlay');
    });
  }
}

/* ============================================================
   BUDDY SYSTEM — identity.html (Owner View)
   ============================================================ */

function initBuddySection(identityId) {
  initBuddySectionLive(identityId);
}

async function initBuddySectionLive(identityId) {
  const section = document.getElementById('buddy-section');
  if (!section) return;

  let content = document.getElementById('buddy-section-content') || document.getElementById('buddy-content');
  if (!content) {
    section.innerHTML = `
      <div class="buddy-section__header">
        <h2 class="buddy-section__title" id="buddy-section-title">🤝 Accountability Buddy</h2>
      </div>
      <div id="buddy-section-content"></div>`;
    content = document.getElementById('buddy-section-content');
  }
  if (!content) return;

  content.innerHTML = `
    <div style="display: flex; justify-content: center; padding: var(--space-6) 0;">
      <div class="spinner" aria-label="Loading buddy status…"></div>
    </div>`;

  try {
    const [msgRes, historyRes] = await Promise.all([
      apiRequest(`/buddy/messages/${identityId}`, { method: 'GET' }).catch(() => ({ messages: [] })),
      apiRequest(`/buddy/history/${identityId}`, { method: 'GET' }).catch(() => ({ history: [] }))
    ]);

    const messages = Array.isArray(msgRes?.messages) ? msgRes.messages : [];
    const history = Array.isArray(historyRes?.history) ? historyRes.history : [];
    const activePairing = history.find(h => h.status === 'active');

    renderBuddySectionCompleteLive(identityId, activePairing, messages, history, content);
  } catch (err) {
    renderNoBuddyStateLive(identityId, content);
  }
}

function renderBuddySectionCompleteLive(identityId, activePairing, messages, history, container) {
  // Group messages by senderUsername / senderId
  const senderGroups = {};
  messages.forEach(msg => {
    const key = msg.senderId || msg.senderUsername || 'unknown';
    if (!senderGroups[key]) {
      senderGroups[key] = {
        senderUsername: msg.senderUsername || 'Buddy',
        pairingStatus: msg.pairingStatus || 'revoked',
        messages: []
      };
    }
    senderGroups[key].messages.push(msg);
  });

  const groupKeys = Object.keys(senderGroups);

  container.innerHTML = `
    <div class="buddy-active">
      <!-- Active pairing header or invite CTA -->
      ${activePairing ? `
        <div class="buddy-active__header">
          <div class="buddy-active__info">
            <div class="buddy-avatar" aria-hidden="true">${escapeHtml((activePairing.buddyUsername || 'B').charAt(0).toUpperCase())}</div>
            <div>
              <p class="buddy-active__name">${escapeHtml(activePairing.buddyUsername)}</p>
              <p class="buddy-active__since">Active Accountability Buddy</p>
            </div>
          </div>
          <button class="btn btn-ghost btn-danger-ghost" id="remove-buddy-btn" type="button" style="font-size:0.8125rem;">Remove Buddy</button>
        </div>` : `
        <div class="buddy-invite" style="margin-bottom:var(--space-6);">
          <p class="buddy-invite__eyebrow">Accountability</p>
          <p class="buddy-invite__title">No active buddy</p>
          <p class="buddy-invite__desc">Invite an accountability buddy to send encouraging nudges for this identity.</p>
          <button class="btn btn-primary" id="generate-invite-btn" type="button">Invite a Buddy</button>
        </div>`
      }

      <!-- Nudge Feed: Grouped by Buddy with status badges -->
      <div class="nudge-feed-section" style="margin-top:var(--space-6);">
        <h4 class="nudge-feed-title">Nudges Received</h4>
        ${groupKeys.length === 0
          ? `<p class="nudge-feed-empty">No nudges received yet for this identity.</p>`
          : groupKeys.map(key => {
              const grp = senderGroups[key];
              const isCurrent = grp.pairingStatus === 'active' || (activePairing && (activePairing.buddyUserId === key || activePairing.buddyUsername === grp.senderUsername));
              const badgeStyle = isCurrent
                ? 'background:rgba(61,107,79,0.12); color:var(--moss,#3D6B4F);'
                : 'background:var(--surface-secondary, rgba(0,0,0,0.06)); color:var(--text-muted,#666);';
              const badgeLabel = isCurrent ? 'Current Buddy' : 'Past Buddy';

              return `
                <div class="nudge-group" style="margin-bottom:var(--space-4); padding:var(--space-4); background:var(--surface-primary,#fff); border:1px solid var(--border-color,#e5e7eb); border-radius:var(--radius-lg,#8px);">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-3);">
                    <span style="font-weight:600; font-size:0.9375rem; color:var(--text-main);">${escapeHtml(grp.senderUsername)}</span>
                    <span style="${badgeStyle} font-size:0.75rem; padding:2px 8px; border-radius:12px; font-weight:600;">${badgeLabel}</span>
                  </div>
                  <div class="nudge-feed-list" role="list">
                    ${grp.messages.map(n => `
                      <div class="nudge-item" role="listitem" style="padding:var(--space-2) 0; border-bottom:1px dashed var(--border-light,#f0f0f0);">
                        <div class="nudge-item__header" style="display:flex; justify-content:space-between;">
                          <span class="nudge-item__time" style="font-size:0.75rem; color:var(--text-muted);">${relativeTime(n.createdAt)}</span>
                        </div>
                        <p class="nudge-item__text" style="margin:var(--space-1) 0 0 0; font-size:0.875rem;">${escapeHtml(n.message || n.text)}</p>
                      </div>
                    `).join('')}
                  </div>
                </div>`;
            }).join('')
        }
      </div>

      <!-- Pairing History List -->
      ${history.length > 0 ? `
        <div class="buddy-history-section" style="margin-top:var(--space-6); padding-top:var(--space-4); border-top:1px solid var(--border-color,#e5e7eb);">
          <h4 class="nudge-feed-title" style="margin-bottom:var(--space-3);">Buddy Pairing History</h4>
          <div class="buddy-history-list" role="list">
            ${history.map(item => {
              const isActive = item.status === 'active';
              const isPending = item.status === 'pending';
              const badgeStyle = isActive
                ? 'background:rgba(61,107,79,0.12); color:var(--moss,#3D6B4F);'
                : (isPending ? 'background:rgba(217,119,6,0.12); color:var(--amber,#d97706);' : 'background:var(--surface-secondary, rgba(0,0,0,0.06)); color:var(--text-muted,#666);');
              const badgeText = isActive ? 'Active' : (isPending ? 'Pending Link' : 'Revoked');
              const pairedDate = new Date(item.pairedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              const updatedDate = new Date(item.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

              return `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:var(--space-2) 0; border-bottom:1px solid var(--border-light,#f0f0f0); font-size:0.875rem;">
                  <div>
                    <span style="font-weight:600; color:var(--text-main);">${escapeHtml(item.buddyUsername)}</span>
                    <span style="font-size:0.75rem; color:var(--text-muted); margin-left:var(--space-2);">
                      ${isActive ? `Joined ${pairedDate}` : (isPending ? `Generated ${pairedDate}` : `${pairedDate} – ${updatedDate}`)}
                    </span>
                  </div>
                  <span style="${badgeStyle} font-size:0.75rem; padding:2px 8px; border-radius:12px; font-weight:600;">${badgeText}</span>
                </div>`;
            }).join('')}
          </div>
        </div>` : ''
      }
    </div>`;

  // Wire button handlers
  const removeBtn = document.getElementById('remove-buddy-btn');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      openConfirmDelete({
        title: `Remove ${activePairing.buddyUsername}?`,
        body: `This will end your buddy pairing with ${activePairing.buddyUsername} for this identity. A notification will be sent to your partner. Past messages will be preserved.`,
        triggerEl: removeBtn,
        onConfirm: async () => {
          try {
            await apiRequest(`/buddy/${identityId}`, { method: 'DELETE' });
            initBuddySectionLive(identityId);
          } catch (err) {
            alert(err.message || 'Failed to revoke buddy pairing.');
          }
        },
      });
    });
  }

  const generateBtn = document.getElementById('generate-invite-btn');
  if (generateBtn) {
    generateBtn.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = 'Generating link…';
      try {
        const result = await apiRequest(`/buddy/${identityId}/generate-link`, { method: 'POST' });
        const claimLink = result.claimLink || `${window.location.origin}/buddy-claim.html?token=${result.token}`;

        container.innerHTML = `
          <div class="buddy-invite">
            <p class="buddy-invite__title">Share your invite link</p>
            <div class="invite-link-area">
              <p class="invite-link-area__note">Share this link with a friend or family member. Clicking it will pair them as your buddy.</p>
              <div class="invite-link-row">
                <input class="field-input" type="text" id="invite-link-input" value="${escapeHtml(claimLink)}" readonly aria-label="Invite link" />
                <button class="btn btn-primary" id="copy-invite-btn" type="button">Copy</button>
              </div>
            </div>
          </div>`;

        document.getElementById('copy-invite-btn').addEventListener('click', async () => {
          const copyBtn = document.getElementById('copy-invite-btn');
          try {
            await navigator.clipboard.writeText(claimLink);
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
          } catch (_) {
            document.getElementById('invite-link-input').select();
          }
        });
      } catch (err) {
        btn.disabled = false;
        btn.textContent = 'Invite a Buddy';
        alert(err.message || 'Failed to generate invite link.');
      }
    });
  }
}

/* ============================================================
   BUDDY PARTNER VIEW HELPERS (for buddy-view.js & dashboard)
   ============================================================ */

function getMockPartnerIdentityData(identityId) {
  // TODO: wire to backend — GET /api/buddy/:identityId
  return MOCK_PARTNER_HABIT_DATA[identityId] || null;
}

function sendMockNudgeToOwner(identityId, text) {
  // TODO: wire to backend — POST /api/buddy/message/:identityId
  const pairing = MOCK_BUDDY_PAIRINGS.find(p => p.identityId === identityId && p.buddyUserId === CURRENT_USER_ID);
  const pairingId = pairing ? pairing.id : 'bp_2';
  const ownerUserId = pairing ? pairing.ownerUserId : 'user_sam';

  MOCK_BUDDY_MESSAGES.push({
    id: `bm_${Date.now()}`,
    pairingId: pairingId,
    senderId: CURRENT_USER_ID,
    senderName: CURRENT_USER_NAME,
    text: text,
    sentAt: new Date().toISOString(),
  });

  // Fix 5: Push notification to owner
  pushMockNotification(ownerUserId, `${CURRENT_USER_NAME} sent you an encouraging nudge!`);
}

function removeMockBuddyPairing(identityId, ownerName) {
  // TODO: wire to backend — DELETE /api/buddy/:identityId
  const idx = MOCK_BUDDY_PAIRINGS.findIndex(p => p.identityId === identityId && p.buddyUserId === CURRENT_USER_ID);
  if (idx !== -1) {
    const pairing = MOCK_BUDDY_PAIRINGS[idx];
    MOCK_BUDDY_PAIRINGS.splice(idx, 1);

    // Fix 5: Revocation notification push for owner
    pushMockNotification(pairing.ownerUserId, `Your buddy ${CURRENT_USER_NAME} left the pairing for ${pairing.identityName || 'your identity'}.`);
  }
}

/* ============================================================
   NOTIFICATION HELPERS (Fix 5)
   ============================================================ */

function pushMockNotification(userId, message) {
  // TODO: wire to backend — notification delivery mechanism (realtime via Socket.IO if online, else in-app on next load) to be finalized
  MOCK_NOTIFICATIONS.push({
    id: `n_${Date.now()}`,
    userId: userId,
    message: message,
    read: false,
    createdAt: new Date().toISOString(),
  });
  updateNavNotificationBadge();
}

function updateNavNotificationBadge() {
  const badgeEls = document.querySelectorAll('.nav-badge');
  const unreadCount = MOCK_NOTIFICATIONS.filter(n => n.userId === CURRENT_USER_ID && !n.read).length;

  badgeEls.forEach(badge => {
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  });
}


/* ---- Identity name validation --------------------------------- */
function validateIdentityName(input) {
  const raw = input ? input.value : '';
  const trimmed = raw.trim();
  if (raw.length === 0) {
    setFieldState(input, 'error-identity-name', 'error-identity-name-text', 'icon-identity-name', 'Enter an identity name.');
    return false;
  }
  if (trimmed.length < 2) {
    setFieldState(input, 'error-identity-name', 'error-identity-name-text', 'icon-identity-name', 'Name must be at least 2 characters.');
    return false;
  }
  if (trimmed.length > 40) {
    setFieldState(input, 'error-identity-name', 'error-identity-name-text', 'icon-identity-name', 'Name must be 40 characters or fewer.');
    return false;
  }
  if (trimmed.startsWith('_') || trimmed.startsWith('.')) {
    setFieldState(input, 'error-identity-name', 'error-identity-name-text', 'icon-identity-name', "Name can't start with _ or .");
    return false;
  }
  if (!/[a-zA-Z0-9]/.test(trimmed)) {
    setFieldState(input, 'error-identity-name', 'error-identity-name-text', 'icon-identity-name', 'Name must contain at least one letter or number.');
    return false;
  }
  setFieldState(input, 'error-identity-name', 'error-identity-name-text', 'icon-identity-name', null);
  return true;
}

/* ---- Habit name validation ------------------------------------ */
function validateHabitName(input) {
  const raw = input ? input.value : '';
  const trimmed = raw.trim();
  if (raw.length === 0) {
    setFieldState(input, 'error-habit-name', 'error-habit-name-text', 'icon-habit-name', 'Enter a habit name.');
    return false;
  }
  if (trimmed.length < 2) {
    setFieldState(input, 'error-habit-name', 'error-habit-name-text', 'icon-habit-name', 'Name must be at least 2 characters.');
    return false;
  }
  if (trimmed.length > 50) {
    setFieldState(input, 'error-habit-name', 'error-habit-name-text', 'icon-habit-name', 'Name must be 50 characters or fewer.');
    return false;
  }
  if (trimmed.startsWith('_') || trimmed.startsWith('.')) {
    setFieldState(input, 'error-habit-name', 'error-habit-name-text', 'icon-habit-name', "Name can't start with _ or .");
    return false;
  }
  if (!/[a-zA-Z0-9]/.test(trimmed)) {
    setFieldState(input, 'error-habit-name', 'error-habit-name-text', 'icon-habit-name', 'Name must contain at least one letter or number.');
    return false;
  }
  setFieldState(input, 'error-habit-name', 'error-habit-name-text', 'icon-habit-name', null);
  return true;
}

