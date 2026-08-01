/**
 * Buddy Claim Landing Page (`buddy-claim.html`) Integration
 * Wires invite link claiming to POST /api/buddy/claim/:token
 */

document.addEventListener('DOMContentLoaded', () => {
  initBuddyClaimPage();
});

async function initBuddyClaimPage() {
  const loadingState = document.getElementById('claim-state-loading');
  const successState = document.getElementById('claim-state-success');
  const errorState = document.getElementById('claim-state-error');
  const errorText = document.getElementById('claim-error-text');

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  if (!token) {
    showClaimError('No claim token found in URL. Please use the link provided by your friend.');
    return;
  }

  // Auth Guard — redirects to login.html if not authenticated
  if (!requireAuth()) return;

  try {
    const data = await apiRequest(`/buddy/claim/${encodeURIComponent(token)}`, {
      method: 'POST'
    });

    if (data && (data.success || data.pairing)) {
      const pairing = data.pairing || data;
      const identityId = pairing.identityId || data.identityId;

      if (loadingState) loadingState.style.display = 'none';
      if (successState) successState.style.display = 'block';

      setTimeout(() => {
        window.location.href = `buddy-view.html?identityId=${encodeURIComponent(identityId)}`;
      }, 1200);
    } else {
      throw new Error(data.message || 'Failed to claim buddy link.');
    }
  } catch (err) {
    showClaimError(err.message || 'This invite link is invalid, expired, or already claimed.');
  }

  function showClaimError(msg) {
    if (loadingState) loadingState.style.display = 'none';
    if (errorState) errorState.style.display = 'block';
    if (errorText) errorText.textContent = msg;
  }
}
