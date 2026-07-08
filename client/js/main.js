/**
 * main.js — Tally Landing Page
 * Handles: Nav scroll shadow, Scroll reveal, Smooth scroll,
 *          Interactive vote demo, Form validation (name, email,
 *          password strength, confirm password), Password toggles.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initScrollReveal();
  initSmoothScroll();
  initVoteDemo();
  initSignupForm();
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
  const btn       = document.getElementById('cast-vote-btn');
  const countEl   = document.getElementById('hero-vote-count');
  if (!btn || !countEl) return;

  // Current demo vote state
  let votes = 13;

  // All individual tally SVG groups in the hero card
  const tallyGroups = document.querySelectorAll('.card-tally .tally-group');

  // Track which strokes have been "drawn" (we'll add new ones dynamically)
  let currentGroupIdx   = 2; // 0-indexed; group 0 and 1 are full (5 strokes each)
  let currentStrokeIdx  = 3; // group 2 already has 3 strokes (votes 11-13)

  // How many strokes to show in each group before creating a new group
  const STROKES_PER_GROUP = 5;

  // Stroke coords within a group SVG (4 verticals + 1 diagonal)
  const STROKE_DEFS = [
    { x1: 6,  y1: 4,  x2: 6,  y2: 28 }, // vertical 1
    { x1: 16, y1: 4,  x2: 16, y2: 28 }, // vertical 2
    { x1: 26, y1: 4,  x2: 26, y2: 28 }, // vertical 3
    { x1: 36, y1: 4,  x2: 36, y2: 28 }, // vertical 4
    { x1: 2,  y1: 26, x2: 46, y2: 6  }, // diagonal cross
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
  const form          = document.getElementById('signup-form');
  if (!form) return;

  const usernameInput = document.getElementById('input-username');
  const emailInput    = document.getElementById('input-email');
  const submitBtn     = document.getElementById('submit-btn');
  const formBody      = document.getElementById('form-body');
  const formSuccess   = document.getElementById('form-success');

  // --- Debounced validators --------------------------------
  const debouncedValidateUsername = debounce(() => validateUsername(usernameInput), 350);
  const debouncedValidateEmail    = debounce(() => validateEmail(emailInput),   400);

  // Attach listeners
  usernameInput.addEventListener('input', debouncedValidateUsername);
  usernameInput.addEventListener('blur',  () => validateUsername(usernameInput));

  emailInput.addEventListener('input', debouncedValidateEmail);
  emailInput.addEventListener('blur',  () => validateEmail(emailInput));

  // --- Dynamic Submit Button State -------------------------
  function checkFormValidity() {
    const usernameVal = usernameInput.value.trim();
    const emailVal = emailInput.value.trim();

    // Check Username: lowercase only, no spaces, not empty, min 2 chars, max 30 chars
    const usernameOk = usernameVal.length >= 2 &&
                       usernameVal.length <= 30 &&
                       !/\s/.test(usernameVal) &&
                       !/[A-Z]/.test(usernameVal);

    // Check Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const emailOk = emailRegex.test(emailVal) && 
                    (emailVal.match(/@/g) || []).length === 1 && 
                    !emailVal.split('@')[1].startsWith('.');

    return usernameOk && emailOk;
  }

  function updateSubmitButtonState() {
    submitBtn.disabled = !checkFormValidity();
  }

  // Set initial state & add dynamic validation listeners
  updateSubmitButtonState();
  usernameInput.addEventListener('input', updateSubmitButtonState);
  emailInput.addEventListener('input', updateSubmitButtonState);

  // --- Submit ----------------------------------------------
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Run all validations synchronously on submit
    const usernameOk = validateUsername(usernameInput);
    const emailOk    = validateEmail(emailInput);

    if (!usernameOk || !emailOk) {
      // Focus first invalid field
      const firstInvalid = [usernameInput, emailInput]
        .find(el => el.classList.contains('is-error'));
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    // All valid — simulate submission (replace with real API call later)
    submitBtn.disabled = true;
    submitBtn.textContent = 'Casting your vote…';

    // Simulated async — swap in success state after 1.2s
    setTimeout(() => {
      formBody.style.display    = 'none';
      formSuccess.classList.add('visible');
      formSuccess.focus();
    }, 1200);
  });
}

/* ---- Password show/hide toggle ---------------------------- */
function initPasswordToggle(btnId, inputId, iconId) {
  const btn   = document.getElementById(btnId);
  const input = document.getElementById(inputId);
  const icon  = document.getElementById(iconId);
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
  const errorBox  = document.getElementById(errorBoxId);
  const errorText = document.getElementById(errorTextId);
  const icon      = document.getElementById(iconId);

  if (message) {
    // Error state
    input.classList.remove('is-valid');
    input.classList.add('is-error');
    input.setAttribute('aria-invalid', 'true');
    if (errorBox)  errorBox.classList.add('visible');
    if (errorText) errorText.textContent = message;
    if (icon) { icon.textContent = ''; }
  } else {
    // Valid state
    input.classList.remove('is-error');
    input.classList.add('is-valid');
    input.setAttribute('aria-invalid', 'false');
    if (errorBox)  errorBox.classList.remove('visible');
    if (errorText) errorText.textContent = '';
    if (icon) { icon.textContent = '✓'; icon.style.color = 'var(--moss)'; }
  }
}

function clearFieldState(input, errorBoxId, errorTextId, iconId) {
  const errorBox  = document.getElementById(errorBoxId);
  const errorText = document.getElementById(errorTextId);
  const icon      = document.getElementById(iconId);

  input.classList.remove('is-valid', 'is-error');
  input.removeAttribute('aria-invalid');
  if (errorBox)  errorBox.classList.remove('visible');
  if (errorText) errorText.textContent = '';
  if (icon) icon.textContent = '';
}

/* ---- Username Validation ---------------------------------- */
function validateUsername(input) {
  const raw     = input.value;
  const trimmed = raw.trim();

  // Empty
  if (raw.length === 0 || raw === '') {
    setFieldState(input, 'error-username', 'error-username-text', 'icon-username', 'Enter a username.');
    return false;
  }
  // Spaces anywhere
  if (/\s/.test(raw)) {
    setFieldState(input, 'error-username', 'error-username-text', 'icon-username', 'Username cannot contain spaces.');
    return false;
  }
  // Capital letters
  if (/[A-Z]/.test(raw)) {
    setFieldState(input, 'error-username', 'error-username-text', 'icon-username', 'Username must be all lowercase (no capital letters).');
    return false;
  }
  // Too short after trim
  if (trimmed.length < 2) {
    setFieldState(input, 'error-username', 'error-username-text', 'icon-username', 'Username must be at least 2 characters.');
    return false;
  }
  // Too long
  if (trimmed.length > 30) {
    setFieldState(input, 'error-username', 'error-username-text', 'icon-username', 'Username must be under 30 characters.');
    return false;
  }

  setFieldState(input, 'error-username', 'error-username-text', 'icon-username', null);
  return true;
}

/* ---- Email Validation ------------------------------------- */
function validateEmail(input) {
  const raw     = input.value;
  const trimmed = raw.trim();

  if (raw.length === 0) {
    setFieldState(input, 'error-email', 'error-email-text', 'icon-email', 'Enter your email address.');
    return false;
  }
  // Spaces inside
  if (/\s/.test(trimmed)) {
    setFieldState(input, 'error-email', 'error-email-text', 'icon-email', "Email can't contain spaces.");
    return false;
  }
  // Basic format validation
  // Must have exactly one @, a domain part, and a TLD
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    setFieldState(input, 'error-email', 'error-email-text', 'icon-email', 'Enter a valid email address, like name@example.com.');
    return false;
  }
  // Extra: reject double @
  if ((trimmed.match(/@/g) || []).length > 1) {
    setFieldState(input, 'error-email', 'error-email-text', 'icon-email', 'Enter a valid email address, like name@example.com.');
    return false;
  }
  // Reject domain starting with dot (e.g. abc@.com)
  const domainPart = trimmed.split('@')[1];
  if (domainPart && domainPart.startsWith('.')) {
    setFieldState(input, 'error-email', 'error-email-text', 'icon-email', 'Enter a valid email address, like name@example.com.');
    return false;
  }

  setFieldState(input, 'error-email', 'error-email-text', 'icon-email', null);
  return true;
}

/* ---- Utility: debounce ------------------------------------ */
function debounce(fn, wait) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}
