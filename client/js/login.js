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

  // Password toggle
  initPasswordToggle('toggle-password-btn', 'input-password', 'toggle-password-icon');

  function showServerError(msg) {
    if (serverError) {
      serverError.textContent = msg;
      serverError.classList.add('visible');
    }
  }

  function hideServerError() {
    if (serverError) {
      serverError.classList.remove('visible');
      serverError.textContent = '';
    }
  }

  function checkLoginValidity() {
    const emailVal = emailInput.value.trim();
    const pwVal = passwordInput.value;
    const emailOk = emailVal.length > 0 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailVal) &&
      !emailVal.split('@')[1].startsWith('.');
    const pwOk = pwVal.length > 0;
    return emailOk && pwOk;
  }

  function updateSubmitState() {
    submitBtn.disabled = !checkLoginValidity();
  }

  updateSubmitState();
  emailInput.addEventListener('input', () => { hideServerError(); updateSubmitState(); });
  passwordInput.addEventListener('input', () => { hideServerError(); updateSubmitState(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideServerError();

    const emailOk = validateEmail(emailInput);
    if (!emailOk) return;

    if (passwordInput.value.length === 0) {
      setFieldState(passwordInput, 'error-password', 'error-password-text', null, 'Enter your password.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in…';

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
        throw new Error(data.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      showServerError(err.message || 'Invalid email or password.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log in →';
    }
  });
}
