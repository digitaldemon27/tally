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
  const isResetMode = params.get('reset') === 'true';

  // Customize UI text for Reset Password mode dynamically
  if (isResetMode) {
    const eyebrow = document.querySelector('#set-password .eyebrow');
    if (eyebrow) eyebrow.textContent = 'Security Update';

    const heading = document.getElementById('set-password-heading');
    if (heading) heading.textContent = 'Reset your password';

    const subtitle = document.querySelector('#set-password .section-subtitle');
    if (subtitle) subtitle.textContent = 'Set your new Tally password to secure your account.';

    const formTitle = document.querySelector('#set-password-body .form-title');
    if (formTitle) formTitle.textContent = 'Reset password';

    if (submitBtn) {
      submitBtn.textContent = 'Reset password →';
      submitBtn.setAttribute('aria-label', 'Reset my password');
    }

    const successIcon = document.querySelector('#set-password-success .form-success__icon');
    if (successIcon) successIcon.textContent = '🔒';

    const successTitle = document.querySelector('#set-password-success h2');
    if (successTitle) successTitle.textContent = 'Password reset. You\'re secure.';

    const successDesc = document.querySelector('#set-password-success p');
    if (successDesc) successDesc.textContent = 'Your password has been successfully updated. Redirecting to sign in...';

    const successBtn = document.querySelector('#set-password-success a.btn');
    if (successBtn) {
      successBtn.href = 'login.html';
      successBtn.textContent = 'Go to sign in';
    }
  }

  if (!token) {
    const errorMsg = isResetMode
      ? 'No reset token found. Please use the link from your reset email.'
      : 'No setup token found. Please use the link from your verification email.';
    showServerError(errorMsg);
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
    submitBtn.textContent = isResetMode ? 'Resetting your password…' : 'Setting your password…';

    try {
      const password = passwordInput.value;

      if (isResetMode) {
        await apiRequest('/api/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({
            token,
            password
          })
        });

        formBody.style.display = 'none';
        formSuccess.classList.add('visible');
        formSuccess.focus();

        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1500);

      } else {
        const timezone = getUserTimezone();
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
      }

    } catch (err) {
      showServerError(err.message || 'Failed to update password. Link may have expired.');
      submitBtn.disabled = false;
      submitBtn.textContent = isResetMode ? 'Reset Password →' : 'Set Password →';
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
