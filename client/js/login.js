/**
 * Login Page (`login.html`) Integration
 * Wires authentication to POST /api/auth/login
 */

document.addEventListener('DOMContentLoaded', () => {
  if (getAuthToken()) {
    window.location.href = 'dashboard.html';
    return;
  }
  initLoginForm();
});

function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  const emailInput = document.getElementById('input-email');
  const passwordInput = document.getElementById('input-password');
  const submitBtn = document.getElementById('login-submit-btn');
  const serverError = document.getElementById('login-server-error');

  if (!emailInput || !passwordInput || !submitBtn) return;

  let emailBlurred = false;
  let passwordBlurred = false;

  // Password toggle
  initPasswordToggle('toggle-password-btn', 'input-password', 'toggle-password-icon');

  function showServerError(msg) {
    if (serverError) {
      serverError.textContent = msg;
      serverError.classList.add('visible');
      serverError.style.display = 'block';
    }
  }

  function hideServerError() {
    if (serverError) {
      serverError.classList.remove('visible');
      serverError.textContent = '';
      serverError.style.display = 'none';
    }
  }

  function validateLoginEmail(showError = true) {
    const raw = emailInput.value;
    const trimmed = raw.trim();

    if (trimmed.length === 0) {
      if (showError) {
        setFieldState(emailInput, 'error-email', 'error-email-text', 'icon-email', 'Username or email is required.');
      }
      return false;
    }

    if (trimmed.includes('@')) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(trimmed)) {
        if (showError) {
          setFieldState(emailInput, 'error-email', 'error-email-text', 'icon-email', 'Please enter a valid email address.');
        }
        return false;
      }
    } else {
      const usernameRegex = /^(?=.{3,30}$)[a-zA-Z0-9]+(?:[._-][a-zA-Z0-9]+)*$/;
      if (!usernameRegex.test(trimmed)) {
        if (showError) {
          setFieldState(emailInput, 'error-email', 'error-email-text', 'icon-email', 'Username can only contain letters, numbers, dots (.), underscores (_) and hyphens (-).');
        }
        return false;
      }
    }

    setFieldState(emailInput, 'error-email', 'error-email-text', 'icon-email', null);
    return true;
  }

  function validateLoginPassword(showError = true) {
    const raw = passwordInput.value;
    if (raw.length === 0) {
      if (showError) {
        setFieldState(passwordInput, 'error-password', 'error-password-text', null, 'Password is required.');
      }
      return false;
    }
    setFieldState(passwordInput, 'error-password', 'error-password-text', null, null);
    return true;
  }

  function updateSubmitState() {
    const emailOk = validateLoginEmail(false);
    const pwOk = validateLoginPassword(false);
    submitBtn.disabled = !(emailOk && pwOk);
  }

  // Initial state
  updateSubmitState();

  emailInput.addEventListener('input', () => {
    hideServerError();
    validateLoginEmail(emailBlurred);
    updateSubmitState();
  });
  emailInput.addEventListener('blur', () => {
    emailBlurred = true;
    validateLoginEmail(true);
    updateSubmitState();
  });

  passwordInput.addEventListener('input', () => {
    hideServerError();
    validateLoginPassword(passwordBlurred);
    updateSubmitState();
  });
  passwordInput.addEventListener('blur', () => {
    passwordBlurred = true;
    validateLoginPassword(true);
    updateSubmitState();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('[login] submit handler triggered');
    hideServerError();

    // Mark both as blurred to force errors to show if they click submit immediately
    emailBlurred = true;
    passwordBlurred = true;

    const emailOk = validateLoginEmail(true);
    const pwOk = validateLoginPassword(true);

    if (!emailOk || !pwOk) {
      updateSubmitState();
      return;
    }

    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Signing in…';

    try {
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (data && data.accessToken) {
        setAuthToken(data.accessToken);
        window.location.href = 'dashboard.html';
      } else {
        throw new Error(data.message || 'Incorrect username/email or password.');
      }
    } catch (err) {
      console.error('[login] error during login request', err);

      let displayError = 'Incorrect username/email or password.';
      // Check if network issue or 5xx server error
      if (
        err.message.includes('Network error') ||
        err.message.includes('500') ||
        err.message.includes('502') ||
        err.message.includes('503') ||
        err.message.includes('504')
      ) {
        displayError = 'Something went wrong. Please try again.';
      }

      showServerError(displayError);
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      updateSubmitState();
    }
  });

  // Debug: log click events on the submit button to ensure it's interactive
  submitBtn.addEventListener('click', (ev) => {
    console.log('[login] submit button clicked — disabled=', submitBtn.disabled);
  });
}
