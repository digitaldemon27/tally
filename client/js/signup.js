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
  const submitBtn = document.getElementById('signup-submit-btn');
  const formBody = document.getElementById('signup-body');
  const formSuccess = document.getElementById('signup-success');
  let serverErrorEl = document.getElementById('signup-server-error');

  if (!usernameInput || !emailInput || !submitBtn) return;

  // Create server error banner if not present
  if (!serverErrorEl) {
    serverErrorEl = document.createElement('div');
    serverErrorEl.id = 'signup-server-error';
    serverErrorEl.className = 'field-server-error';
    serverErrorEl.setAttribute('role', 'alert');
    serverErrorEl.style.marginBottom = 'var(--space-4)';
    formBody.insertBefore(serverErrorEl, formBody.firstChild);
  }

  function showServerError(msg) {
    serverErrorEl.textContent = msg;
    serverErrorEl.classList.add('visible');
  }

  function hideServerError() {
    serverErrorEl.classList.remove('visible');
    serverErrorEl.textContent = '';
  }

  function checkFormValidity() {
    const usernameVal = usernameInput.value.trim();
    const emailVal = emailInput.value.trim();
    const usernameOk = usernameVal.length >= 2 && !/\s/.test(usernameVal) && !/[A-Z]/.test(usernameVal);
    const emailOk = emailVal.length > 0 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailVal) &&
      (emailVal.match(/@/g) || []).length === 1 &&
      !emailVal.split('@')[1].startsWith('.');
    return usernameOk && emailOk;
  }

  function updateSubmitButtonState() {
    submitBtn.disabled = !checkFormValidity();
  }

  updateSubmitButtonState();
  usernameInput.addEventListener('input', () => { hideServerError(); updateSubmitButtonState(); });
  emailInput.addEventListener('input', () => { hideServerError(); updateSubmitButtonState(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideServerError();

    const usernameOk = validateUsername(usernameInput);
    const emailOk = validateEmail(emailInput);
    if (!usernameOk || !emailOk) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending link…';

    try {
      const username = usernameInput.value.trim();
      const email = emailInput.value.trim();

      const data = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email })
      });

      if (data && (data.success || data.message)) {
        formBody.style.display = 'none';
        formSuccess.classList.add('visible');
        formSuccess.focus();
      } else {
        throw new Error(data.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      showServerError(err.message || 'An error occurred during registration.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Join Tally →';
    }
  });
}
