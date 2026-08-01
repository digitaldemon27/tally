/**
 * Set Password Page (`set-password.html`) Integration
 * Wires password setup to POST /api/auth/set-password
 */

document.addEventListener('DOMContentLoaded', () => {
  initSetPasswordForm();
});

function initSetPasswordForm() {
  const form = document.getElementById('set-password-form');
  if (!form) return;

  const passwordInput = document.getElementById('input-password');
  const confirmInput = document.getElementById('input-password-confirm');
  const submitBtn = document.getElementById('set-password-submit-btn');
  const formBody = document.getElementById('set-password-body');
  const formSuccess = document.getElementById('set-password-success');
  const serverError = document.getElementById('set-password-server-error');
  const serverErrorTxt = document.getElementById('set-password-server-error-text');

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  if (!token) {
    showServerError('No setup token found. Please use the link from your verification email.');
    submitBtn.disabled = true;
    passwordInput.disabled = true;
    confirmInput.disabled = true;
    return;
  }

  initPasswordToggle('toggle-password-btn', 'input-password', 'toggle-password-icon');
  initPasswordToggle('toggle-password-confirm-btn', 'input-password-confirm', 'toggle-password-confirm-icon');

  const debouncedValidatePassword = debounce(() => validatePassword(passwordInput), 350);
  const debouncedValidateConfirm = debounce(() => validatePasswordConfirm(confirmInput, passwordInput), 350);

  passwordInput.addEventListener('input', () => {
    updateStrengthMeter(passwordInput.value);
    debouncedValidatePassword();
    if (confirmInput.value.length > 0) debouncedValidateConfirm();
    updateSetPasswordSubmitState();
  });
  passwordInput.addEventListener('blur', () => {
    validatePassword(passwordInput);
    updateSetPasswordSubmitState();
  });

  confirmInput.addEventListener('input', () => {
    debouncedValidateConfirm();
    updateSetPasswordSubmitState();
  });
  confirmInput.addEventListener('blur', () => {
    validatePasswordConfirm(confirmInput, passwordInput);
    updateSetPasswordSubmitState();
  });

  updateSetPasswordSubmitState();

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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const pwOk = validatePassword(passwordInput);
    const cfmOk = validatePasswordConfirm(confirmInput, passwordInput);
    if (!pwOk || !cfmOk) return;

    hideServerError();

    submitBtn.disabled = true;
    submitBtn.textContent = 'Setting your password…';

    try {
      const timezone = getUserTimezone();
      const password = passwordInput.value;

      const data = await apiRequest('/api/auth/set-password', {
        method: 'POST',
        body: JSON.stringify({
          signupToken: token,
          password,
          timezone
        })
      });

      if (data && data.accessToken) {
        setAuthToken(data.accessToken);
      }

      formBody.style.display = 'none';
      formSuccess.classList.add('visible');
      formSuccess.focus();

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1500);

    } catch (err) {
      showServerError(err.message || 'Failed to set password. Token may have expired.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Set Password →';
    }
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
