/**
 * Verify Email Page (`verify-email.html`) Integration
 * Wires token verification to POST /api/auth/verify-token
 */

document.addEventListener('DOMContentLoaded', () => {
  initEmailVerification();
});

async function initEmailVerification() {
  const loadingState = document.getElementById('verify-state-loading');
  if (!loadingState) return;

  const successState = document.getElementById('verify-state-success');
  const errorState = document.getElementById('verify-state-error');
  const errorText = document.getElementById('verify-error-text');

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  if (!token) {
    showVerifyError('No verification token found. Please use the link from your email.');
    return;
  }

  try {
    const data = await apiRequest('/api/auth/verify-token', {
      method: 'POST',
      body: JSON.stringify({ token })
    });

    if (data && (data.success || data.username)) {
      loadingState.style.display = 'none';
      successState.classList.add('visible');
      successState.focus();

      setTimeout(() => {
        window.location.href = `set-password.html?token=${encodeURIComponent(token)}`;
      }, 1200);
    } else {
      throw new Error(data.message || 'This verification link is invalid or expired.');
    }
  } catch (err) {
    showVerifyError(err.message || 'Verification failed. Link may be expired.');
  }

  function showVerifyError(message) {
    loadingState.style.display = 'none';
    if (errorState) errorState.style.display = 'block';
    if (errorText) errorText.textContent = message;
    if (errorState) errorState.focus();
  }
}
