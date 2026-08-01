/**
 * js/buddy-view.js — Tally Buddy Partner View Integration
 * Wires partner habit viewing, nudge sending, and leaving pairing to live endpoints:
 * - GET /api/buddy/:identityId
 * - POST /api/buddy/message/:identityId
 * - DELETE /api/buddy/:identityId
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('buddy-view-page')) return;
  initBuddyViewPage();
});

async function initBuddyViewPage() {
  if (!requireAuth()) return;

  const logoutBtn = document.getElementById('nav-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await apiRequest('/auth/logout', { method: 'POST' });
      } catch (_) {}
      removeAuthToken();
      window.location.href = 'login.html';
    });
  }

  const params = new URLSearchParams(window.location.search);
  const identityId = params.get('identityId');

  if (!identityId) {
    document.getElementById('partner-identity-heading').textContent = 'Partner Identity Not Found';
    return;
  }

  const listEl = document.getElementById('partner-habit-list');
  if (listEl) {
    listEl.innerHTML = `
      <div style="display: flex; justify-content: center; padding: var(--space-8) 0;">
        <div class="spinner" aria-label="Loading partner data…"></div>
      </div>`;
  }

  try {
    const res = await apiRequest(`/buddy/${identityId}`, { method: 'GET' });

    if (!res || !res.habits) {
      throw new Error(res?.message || 'Failed to load partner habit data.');
    }

    document.title = `Partner Identity — Tally Buddy View`;

    renderPartnerHeaderLive(res);
    renderPartnerHabitsLive(res.habits);
    wireNudgeFormLive(identityId);
    wireLeavePairingBtnLive(identityId);
  } catch (err) {
    console.error('Failed to load partner view:', err);
    document.getElementById('partner-identity-heading').textContent = 'Partner Identity Not Found';
    if (listEl) {
      listEl.innerHTML = `
        <div style="padding: var(--space-6); text-align: center; color: var(--danger, #c53030);">
          ${escapeHtml(err.message || 'Unable to access partner identity. The pairing may have ended.')}
        </div>`;
    }
  }
}

function renderPartnerHeaderLive(data) {
  const headingEl = document.getElementById('partner-identity-heading');
  const subEl = document.getElementById('partner-identity-sub');
  const votesEl = document.getElementById('partner-stat-votes');
  const consisEl = document.getElementById('partner-stat-consistency');

  if (headingEl) headingEl.textContent = `Partner Identity`;
  if (subEl) subEl.textContent = `You are accountability buddy for this identity.`;

  let totalVotes = 0;
  let consistencySum = 0;
  (data.habits || []).forEach(h => {
    totalVotes += h.totalVotes || 0;
    consistencySum += h.rollingConsistency || 0;
  });
  const avgConsistency = data.habits && data.habits.length ? Math.round(consistencySum / data.habits.length) : 0;

  if (votesEl) votesEl.textContent = totalVotes;
  if (consisEl) consisEl.textContent = `${avgConsistency}%`;
}

function renderPartnerHabitsLive(habits) {
  const listEl = document.getElementById('partner-habit-list');
  if (!listEl) return;

  listEl.innerHTML = '';

  if (habits.length === 0) {
    listEl.innerHTML = `<p class="text-slate" style="padding: var(--space-4);">Your partner has not added any habits to this identity yet.</p>`;
    return;
  }

  habits.forEach(habit => {
    const row = document.createElement('div');
    row.className = 'habit-row';
    row.setAttribute('role', 'listitem');

    let nmtHtml = '';
    if (habit.missedYesterday) {
      nmtHtml = `<span class="nmt-indicator nmt-indicator--missed-one">Missed yesterday — vote pending today</span>`;
    }

    row.innerHTML = `
      <div class="habit-row__content">
        <p class="habit-row__name">${escapeHtml(habit.habitName || habit.name)}</p>
        <div class="habit-row__meta">
          <span class="freq-badge">${escapeHtml(habit.frequency || 'Daily')}</span>
          <span class="tracking-badge">${escapeHtml(habit.trackingType || 'Boolean')}</span>
        </div>
        ${nmtHtml}
      </div>

      <div class="habit-stats" aria-label="Stats for ${escapeHtml(habit.habitName || habit.name)}">
        <div class="habit-stat">
          <span class="habit-stat__value">${habit.totalVotes || 0}</span>
          <span class="habit-stat__label">votes</span>
        </div>
        <div class="habit-stats__divider"></div>
        <div class="habit-stat">
          <span class="habit-stat__value habit-stat__value--consistency">${habit.rollingConsistency || 0}%</span>
          <span class="habit-stat__label">30-day</span>
        </div>
      </div>
    `;

    listEl.appendChild(row);
  });
}

function wireNudgeFormLive(identityId) {
  const form = document.getElementById('nudge-form');
  const input = document.getElementById('input-nudge-text');
  const submitBtn = document.getElementById('nudge-submit-btn');
  const success = document.getElementById('nudge-success-msg');

  if (!form || !input || !submitBtn) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    try {
      await apiRequest(`/buddy/message/${identityId}`, {
        method: 'POST',
        body: JSON.stringify({ message: text })
      });

      input.value = '';
      if (success) {
        success.style.display = 'block';
        setTimeout(() => { success.style.display = 'none'; }, 3000);
      }
    } catch (err) {
      alert(err.message || 'Failed to send nudge message.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Nudge';
    }
  });
}

function wireLeavePairingBtnLive(identityId) {
  const leaveBtn = document.getElementById('leave-pairing-btn');
  if (!leaveBtn) return;

  leaveBtn.addEventListener('click', () => {
    openConfirmDelete({
      title: `Leave Buddy Pairing?`,
      body: `You will no longer be an accountability buddy for this identity. A notification will be sent to your partner.`,
      triggerEl: leaveBtn,
      onConfirm: async () => {
        try {
          await apiRequest(`/buddy/${identityId}`, { method: 'DELETE' });
          window.location.href = 'dashboard.html';
        } catch (err) {
          alert(err.message || 'Failed to leave pairing.');
        }
      },
    });
  });
}
