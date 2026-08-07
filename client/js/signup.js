/**
 * Sign-up Page (`index.html`) Integration
 * Wires the registration form to POST /api/auth/register
 */

document.addEventListener('DOMContentLoaded', () => {
  initSignupForm();
});

function initSignupForm() {
  const form = document.getElementById('signup-form');
  if (!form) return;

  const usernameInput = document.getElementById('input-username');
  const emailInput = document.getElementById('input-email');
  const submitBtn = document.getElementById('signup-submit-btn') || document.getElementById('submit-btn');
  const formBody = document.getElementById('signup-body') || document.getElementById('form-body');
  const formSuccess = document.getElementById('signup-success') || document.getElementById('form-success');
  let serverErrorEl = document.getElementById('signup-server-error') || document.getElementById('server-error');

  if (!usernameInput || !emailInput || !submitBtn) return;

  function showServerError(msg) {
    if (!serverErrorEl) return;
    const textEl = document.getElementById('server-error-text') || serverErrorEl;
    textEl.textContent = msg;
    serverErrorEl.classList.add('visible');
    serverErrorEl.style.display = 'block';
  }

  function hideServerError() {
    if (!serverErrorEl) return;
    const textEl = document.getElementById('server-error-text') || serverErrorEl;
    textEl.textContent = '';
    serverErrorEl.classList.remove('visible');
    serverErrorEl.style.display = 'none';
  }

  function checkFormValidity() {
    const usernameVal = usernameInput.value.trim();
    const emailVal = emailInput.value.trim();
    const usernameRegex = /^(?=.{3,30}$)[a-zA-Z0-9]+(?:[._-][a-zA-Z0-9]+)*$/;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return usernameRegex.test(usernameVal) && emailRegex.test(emailVal);
  }

  function updateSubmitButtonState() {
    const usernameOk = validateUsername(usernameInput);
    const emailOk = validateEmail(emailInput);
    submitBtn.disabled = !(usernameOk && emailOk);
  }

  // Attach live validation on input and blur
  usernameInput.addEventListener('input', () => { hideServerError(); updateSubmitButtonState(); });
  usernameInput.addEventListener('blur', () => { validateUsername(usernameInput); });

  emailInput.addEventListener('input', () => { hideServerError(); updateSubmitButtonState(); });
  emailInput.addEventListener('blur', () => { validateEmail(emailInput); });

  // --- Resend Verification Flow ---
  const resendBtn = document.getElementById('resend-verification-btn');
  const resendSuccess = document.getElementById('resend-success-msg');
  const resendError = document.getElementById('resend-server-error');

  let countdownInterval = null;

  function startCooldown(durationMs) {
    if (!resendBtn) return;
    const availableAt = Date.now() + durationMs;
    localStorage.setItem('resendAvailableAt', availableAt);
    runTimer(availableAt);
  }

  function runTimer(availableAt) {
    if (!resendBtn) return;
    resendBtn.disabled = true;

    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
      const remainingSecs = Math.max(0, Math.ceil((availableAt - Date.now()) / 1000));
      if (remainingSecs <= 0) {
        clearInterval(countdownInterval);
        resendBtn.disabled = false;
        resendBtn.textContent = 'Resend verification email';
        localStorage.removeItem('resendAvailableAt');
      } else {
        resendBtn.textContent = `Resend in ${remainingSecs}s…`;
      }
    }, 200);
  }

  // Restore cooldown and state on load
  const storedAvailableAt = localStorage.getItem('resendAvailableAt');
  if (storedAvailableAt) {
    const availableAt = parseInt(storedAvailableAt, 10);
    if (availableAt > Date.now()) {
      const pendingUser = localStorage.getItem('tally_pending_user');
      if (pendingUser) {
        if (formBody) formBody.style.display = 'none';
        if (formSuccess) {
          formSuccess.classList.add('visible');
          formSuccess.style.display = 'block';
        }
      }
      runTimer(availableAt);
    } else {
      localStorage.removeItem('resendAvailableAt');
    }
  }

  if (resendBtn) {
    resendBtn.addEventListener('click', async () => {
      if (resendSuccess) resendSuccess.style.display = 'none';
      if (resendError) {
        resendError.textContent = '';
        resendError.style.display = 'none';
      }

      const pendingUserStr = localStorage.getItem('tally_pending_user');
      if (!pendingUserStr) {
        if (resendError) {
          resendError.textContent = 'No registration session found. Please sign up again.';
          resendError.style.display = 'block';
        }
        return;
      }

      const { username, email } = JSON.parse(pendingUserStr);

      resendBtn.disabled = true;
      resendBtn.textContent = 'Sending…';

      try {
        const data = await apiRequest('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ username, email })
        });

        if (data && (data.success || data.message)) {
          if (resendSuccess) resendSuccess.style.display = 'block';
          startCooldown(60 * 1000); // 60s cooldown
        } else {
          throw new Error(data?.message || 'Failed to resend verification.');
        }
      } catch (err) {
        if (resendError) {
          resendError.textContent = err.message || 'An error occurred while resending.';
          resendError.style.display = 'block';
        }
        resendBtn.disabled = false;
        resendBtn.textContent = 'Resend verification email';
      }
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideServerError();

    if (!checkFormValidity()) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending registration email…';

    try {
      const username = usernameInput.value.trim();
      const email = emailInput.value.trim();

      const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email })
      });

      if (data && (data.success || data.message)) {
        localStorage.setItem('tally_pending_user', JSON.stringify({ username, email }));
        startCooldown(60 * 1000); // 60s cooldown
        if (formBody) formBody.style.display = 'none';
        if (formSuccess) {
          formSuccess.classList.add('visible');
          formSuccess.style.display = 'block';
          formSuccess.focus();
        }
      } else {
        throw new Error(data?.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      showServerError(err.message || 'An error occurred during registration.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Cast my first vote →';
    }
  });
}
