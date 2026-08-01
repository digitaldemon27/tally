/**
 * Identity Detail & Habit List Page (`identity.html`) Integration
 * Wires Habit CRUD and Votes to live backend endpoints:
 * - GET /api/identity/:id
 * - GET /api/identity/:identityId/habits
 * - POST /api/identity/:identityId/habits
 * - PATCH /api/habits/:id
 * - DELETE /api/habits ({ ids: [...] })
 * - POST /api/votes ({ habitId, identityId, note })
 * - GET /api/votes/summary?habitId=...
 * - PATCH /api/votes/:id
 * - DELETE /api/votes/:id
 *
 * Leaves Buddy System mock-only per specification.
 */

let STATE_IDENTITY_DETAIL = null;
let STATE_HABITS = [];
let STATE_VOTE_SUMMARIES = {}; // habitId -> summary

document.addEventListener('DOMContentLoaded', () => {
  initIdentityPage();
});

async function initIdentityPage() {
  const habitList = document.getElementById('habit-list');
  if (!habitList) return;
  if (!requireAuth()) return;

  const params = new URLSearchParams(window.location.search);
  const identityId = params.get('id');

  if (!identityId) {
    document.getElementById('identity-detail-heading').textContent = 'Identity not found';
    return;
  }

  // Show loading indicator in habit list while loading
  habitList.innerHTML = `
    <div style="display: flex; justify-content: center; padding: var(--space-12) 0;">
      <div class="spinner" aria-label="Loading habits…"></div>
    </div>`;

  try {
    const res = await apiRequest(`/api/identity/${identityId}`, { method: 'GET' });
    STATE_IDENTITY_DETAIL = res?.data || res;
  } catch (err) {
    console.error('Failed to fetch identity detail:', err);
    document.getElementById('identity-detail-heading').textContent = 'Identity not found';
    if (habitList) habitList.innerHTML = '';
    return;
  }

  document.title = `${STATE_IDENTITY_DETAIL.name} — Tally`;
  renderIdentityHeaderLive();

  let SHOW_ARCHIVED = false;

  const editBtn = document.getElementById('edit-identity-btn');
  const deleteBtn = document.getElementById('delete-identity-btn');
  const aiBtn = document.getElementById('ai-insights-btn');

  if (editBtn) {
    editBtn.style.display = '';
    editBtn.addEventListener('click', () => openIdentityEditFromDetailLive(STATE_IDENTITY_DETAIL, editBtn));
  }
  if (deleteBtn) {
    deleteBtn.style.display = '';
    deleteBtn.addEventListener('click', () => {
      openConfirmDelete({
        title: `Delete "${STATE_IDENTITY_DETAIL.name}"?`,
        body: `This will permanently delete the "${STATE_IDENTITY_DETAIL.name}" identity and all its habits. This cannot be undone.`,
        triggerEl: deleteBtn,
        onConfirm: async () => {
          try {
            await apiRequest('/api/identity', {
              method: 'DELETE',
              body: JSON.stringify({ ids: [identityId] })
            });
            window.location.href = 'dashboard.html';
          } catch (err) {
            alert(err.message || 'Failed to delete identity.');
          }
        },
      });
    });
  }

  // Wire AI Insights Button
  if (aiBtn) {
    aiBtn.style.display = 'inline-flex';
    aiBtn.addEventListener('click', () => generateAIInsights(identityId, aiBtn));
  }

  const closeAiBtn = document.getElementById('close-ai-insights-btn');
  if (closeAiBtn) {
    closeAiBtn.addEventListener('click', () => {
      const container = document.getElementById('ai-insights-container');
      if (container) container.style.display = 'none';
    });
  }

  // Wire Show Archived Toggle
  const toggleArchived = document.getElementById('toggle-show-archived');
  if (toggleArchived) {
    toggleArchived.addEventListener('change', (e) => {
      SHOW_ARCHIVED = e.target.checked;
      renderHabits();
    });
  }

  // Close overflow menus on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.overflow-menu')) closeAllOverflowMenus();
  });

  await loadHabits(identityId);
  loadRecentAISuggestions(identityId);

  // Multi-select bulk delete initialization for habits
  initMultiSelect({
    containerEl: habitList,
    checkboxSelector: '.js-habit-select',
    actionBarId: 'habit-action-bar',
    countId: 'habit-select-count',
    cancelBtnId: 'habit-cancel-select-btn',
    deleteBtnId: 'habit-delete-selected-btn',
    itemNoun: 'habit',
    onDelete: async (ids) => {
      try {
        await apiRequest('/api/habits', {
          method: 'DELETE',
          body: JSON.stringify({ ids })
        });
        STATE_HABITS = STATE_HABITS.filter(h => !ids.includes(getItemId(h)));
        renderHabits();
      } catch (err) {
        alert(err.message || 'Failed to delete selected habits.');
      }
    }
  });

  const openBtn = document.getElementById('open-habit-modal-btn');
  const openBtnEmpty = document.getElementById('open-habit-modal-empty-btn');

  wireHabitModalLive(openBtn, identityId, () => loadHabits(identityId));
  if (openBtnEmpty) {
    openBtnEmpty.addEventListener('click', () => openHabitModalForLive('create', null, identityId, openBtnEmpty, () => loadHabits(identityId)));
  }

  // Live Buddy section
  if (typeof initBuddySectionLive === 'function') {
    initBuddySectionLive(identityId);
  }
}

async function loadHabits(identityId) {
  try {
    const res = await apiRequest(`/api/identity/${identityId}/habits`, { method: 'GET' });
    STATE_HABITS = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
  } catch (err) {
    console.error('Failed to load habits:', err);
    STATE_HABITS = [];
  }

  // Pre-fetch vote summaries for each habit
  for (const habit of STATE_HABITS) {
    const hId = getItemId(habit);
    try {
      const summary = await apiRequest(`/api/votes/summary?habitId=${hId}`, { method: 'GET' });
      if (summary) STATE_VOTE_SUMMARIES[hId] = summary;
    } catch (_) {}
  }

  renderHabits();
}

function renderIdentityHeaderLive() {
  const headingEl = document.getElementById('identity-detail-heading');
  const descEl = document.getElementById('identity-detail-description');
  const eyebrowEl = document.getElementById('identity-detail-eyebrow');
  const votesEl = document.getElementById('identity-stat-votes');
  const consisEl = document.getElementById('identity-stat-consistency');

  if (headingEl) headingEl.textContent = STATE_IDENTITY_DETAIL.name;
  if (descEl) descEl.textContent = STATE_IDENTITY_DETAIL.description || '';
  if (eyebrowEl) eyebrowEl.textContent = 'Identity';

  let totalVotes = 0;
  let consistencySum = 0;
  STATE_HABITS.forEach(h => {
    const hId = getItemId(h);
    const s = STATE_VOTE_SUMMARIES[hId];
    if (s) {
      totalVotes += s.totalVotes || 0;
      consistencySum += s.rollingConsistency || 0;
    }
  });
  const avgConsistency = STATE_HABITS.length ? Math.round(consistencySum / STATE_HABITS.length) : 0;

  if (votesEl) votesEl.textContent = totalVotes;
  if (consisEl) consisEl.textContent = `${avgConsistency}%`;
}

function renderHabits() {
  renderIdentityHeaderLive();
  const habitList = document.getElementById('habit-list');
  const emptyState = document.getElementById('habit-empty-state');
  if (!habitList) return;

  habitList.innerHTML = '';

  if (STATE_HABITS.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    return;
  }
  if (emptyState) emptyState.style.display = 'none';

  const identityId = getItemId(STATE_IDENTITY_DETAIL);
  STATE_HABITS.forEach(habit => {
    const row = buildHabitRowLive(habit, identityId, renderHabits);
    habitList.appendChild(row);
  });
  initOverflowMenus(habitList);
}

function buildHabitRowLive(habit, identityId, onUpdate) {
  const hId = getItemId(habit);
  const summary = STATE_VOTE_SUMMARIES[hId] || { totalVotes: 0, rollingConsistency: 0, missedYesterday: false };

  const totalVotes = summary.totalVotes || 0;
  const consistency = summary.rollingConsistency || 0;
  const missedYesterday = summary.missedYesterday || false;
  const activeBuddy = getActiveBuddy(identityId);

  let nmtHtml = '';
  if (missedYesterday) {
    const buddyNote = activeBuddy ? ` Your buddy ${escapeHtml(activeBuddy.buddyName)} will be notified.` : '';
    nmtHtml = `<span class="nmt-indicator nmt-indicator--missed-one">Missed yesterday — cast today's vote to keep going.${buddyNote}</span>`;
  }

  const row = document.createElement('div');
  row.className = 'habit-row';
  row.setAttribute('role', 'listitem');
  row.dataset.habitId = hId;

  // Derive if voted today from summary or local state
  const votedToday = summary.votedToday || false;

  row.innerHTML = `
    <div class="card-select-wrap" style="position:relative; top:0; left:0; display:flex; align-items:center; margin-right:var(--space-3);">
      <input type="checkbox" class="card-select-checkbox js-habit-select" data-id="${hId}" aria-label="Select ${escapeHtml(habit.name)}" />
    </div>

    <div class="habit-row__content">
      <p class="habit-row__name">${escapeHtml(habit.name)}</p>
      <div class="habit-row__meta">
        <span class="freq-badge">${escapeHtml(FREQ_LABELS[habit.frequency] || habit.frequency)}</span>
        <span class="tracking-badge">${escapeHtml(TRACKING_LABELS[habit.trackingType] || habit.trackingType)}</span>
      </div>
      ${nmtHtml}
    </div>

    <div class="habit-stats" aria-label="Stats for ${escapeHtml(habit.name)}">
      <div class="habit-stat">
        <span class="habit-stat__value">${totalVotes}</span>
        <span class="habit-stat__label">votes</span>
      </div>
      <div class="habit-stats__divider"></div>
      <div class="habit-stat">
        <span class="habit-stat__value habit-stat__value--consistency">${consistency}%</span>
        <span class="habit-stat__label">30-day</span>
      </div>
    </div>

    <button
      class="vote-btn ${votedToday ? 'voted' : 'not-voted'}"
      type="button"
      id="vote-btn-${escapeHtml(hId)}"
      aria-label="${votedToday ? 'Already voted today for ' + escapeHtml(habit.name) : 'Cast vote for ' + escapeHtml(habit.name)}"
      ${votedToday ? 'disabled aria-disabled="true"' : ''}
    >
      <span class="vote-btn__icon" aria-hidden="true">${votedToday ? '✓' : '🗳'}</span>
      <span class="vote-btn__label">${votedToday ? 'Voted' : 'Cast vote'}</span>
    </button>

    <div class="overflow-menu" role="none">
      <button class="overflow-menu__trigger"
              aria-label="Options for ${escapeHtml(habit.name)}"
              aria-haspopup="menu"
              aria-expanded="false"
              type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
        </svg>
      </button>
      <ul class="overflow-menu__dropdown" role="menu" aria-label="${escapeHtml(habit.name)} options">
        <li><button class="overflow-menu__item" role="menuitem" data-action="edit">Edit</button></li>
        <li><button class="overflow-menu__item overflow-menu__item--danger" role="menuitem" data-action="delete">Delete</button></li>
      </ul>
    </div>
  `;

  // Wire vote button
  if (!votedToday) {
    const voteBtn = row.querySelector('.vote-btn');
    voteBtn.addEventListener('click', () => castVoteLive(hId, identityId, voteBtn, onUpdate));
  }

  // Overflow menu actions
  const trigger = row.querySelector('.overflow-menu__trigger');
  row.querySelector('[data-action="edit"]').addEventListener('click', () => {
    closeAllOverflowMenus();
    openHabitModalForLive('edit', habit, identityId, trigger, onUpdate);
  });

  row.querySelector('[data-action="delete"]').addEventListener('click', () => {
    closeAllOverflowMenus();
    openConfirmDelete({
      title: `Delete "${habit.name}"?`,
      body: `This will permanently remove "${habit.name}" and all its votes. This cannot be undone.`,
      triggerEl: trigger,
      onConfirm: async () => {
        try {
          await apiRequest('/api/habits', {
            method: 'DELETE',
            body: JSON.stringify({ ids: [hId] })
          });
          STATE_HABITS = STATE_HABITS.filter(h => getItemId(h) !== hId);
          delete STATE_VOTE_SUMMARIES[hId];
          if (onUpdate) onUpdate();
        } catch (err) {
          alert(err.message || 'Failed to delete habit.');
        }
      },
    });
  });

  return row;
}

async function castVoteLive(habitId, identityId, voteBtn, onUpdate) {
  voteBtn.disabled = true;
  voteBtn.classList.add('vote-casting');

  try {
    const res = await apiRequest('/api/votes', {
      method: 'POST',
      body: JSON.stringify({ identityId, habitId })
    });

    voteBtn.classList.remove('vote-casting');
    voteBtn.classList.replace('not-voted', 'voted');
    voteBtn.setAttribute('aria-label', 'Already voted today');
    voteBtn.setAttribute('aria-disabled', 'true');
    voteBtn.querySelector('.vote-btn__icon').textContent = '✓';
    voteBtn.querySelector('.vote-btn__label').textContent = 'Voted';

    // Refresh vote summary for this habit
    try {
      const summary = await apiRequest(`/api/votes/summary?habitId=${habitId}`, { method: 'GET' });
      if (summary) {
        summary.votedToday = true;
        STATE_VOTE_SUMMARIES[habitId] = summary;
      }
    } catch (_) {}

    if (onUpdate) onUpdate();

  } catch (err) {
    voteBtn.classList.remove('vote-casting');
    if (err.status === 409 || (err.message && err.message.toLowerCase().includes('already voted'))) {
      voteBtn.classList.replace('not-voted', 'voted');
      voteBtn.setAttribute('aria-label', 'Already voted today');
      voteBtn.setAttribute('aria-disabled', 'true');
      voteBtn.querySelector('.vote-btn__icon').textContent = '✓';
      voteBtn.querySelector('.vote-btn__label').textContent = 'Voted';
      if (STATE_VOTE_SUMMARIES[habitId]) STATE_VOTE_SUMMARIES[habitId].votedToday = true;
      if (onUpdate) onUpdate();
    } else {
      voteBtn.disabled = false;
      alert(err.message || 'Failed to cast vote.');
    }
  }
}

function wireHabitModalLive(triggerBtn, identityId, onSuccess) {
  if (!document.getElementById('habit-modal-overlay')) return;
  if (triggerBtn) {
    triggerBtn.addEventListener('click', () => openHabitModalForLive('create', null, identityId, triggerBtn, onSuccess));
  }
}

function openHabitModalForLive(mode, habit, identityId, triggerEl, onSuccess) {
  const overlay = document.getElementById('habit-modal-overlay');
  if (!overlay) return;

  const titleEl = document.getElementById('habit-modal-title');
  const submitBtn = document.getElementById('habit-submit-btn');
  const nameInput = document.getElementById('input-habit-name');
  const editIdInput = document.getElementById('habit-edit-id');
  const form = document.getElementById('habit-form');

  if (mode === 'edit' && habit) {
    const hId = getItemId(habit);
    if (titleEl) titleEl.textContent = 'Edit Habit';
    if (submitBtn) submitBtn.textContent = 'Save Changes';
    if (nameInput) nameInput.value = habit.name || '';
    if (editIdInput) editIdInput.value = hId;

    const freqRadio = overlay.querySelector(`input[name="habit-frequency"][value="${habit.frequency || 'daily'}"]`);
    if (freqRadio) freqRadio.checked = true;

    const trackRadio = overlay.querySelector(`input[name="habit-tracking"][value="${habit.trackingType || 'boolean'}"]`);
    if (trackRadio) trackRadio.checked = true;
  } else {
    if (titleEl) titleEl.textContent = 'New Habit';
    if (submitBtn) submitBtn.textContent = 'Create Habit';
    if (form) form.reset();
    if (editIdInput) editIdInput.value = '';

    const defaultFreq = overlay.querySelector('input[name="habit-frequency"][value="daily"]');
    if (defaultFreq) defaultFreq.checked = true;

    const defaultTrack = overlay.querySelector('input[name="habit-tracking"][value="boolean"]');
    if (defaultTrack) defaultTrack.checked = true;
  }

  const closeBtn = document.getElementById('habit-modal-close-btn');
  if (closeBtn) closeBtn.onclick = () => closeModal('habit-modal-overlay');

  if (form && !form._wiredLive) {
    form._wiredLive = true;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = nameInput.value.trim();
      const frequency = overlay.querySelector('input[name="habit-frequency"]:checked')?.value || 'daily';
      const trackingType = overlay.querySelector('input[name="habit-tracking"]:checked')?.value || 'boolean';
      const editId = editIdInput ? editIdInput.value : '';

      submitBtn.disabled = true;

      try {
        if (editId) {
          const updated = await apiRequest(`/api/habits/${editId}`, {
            method: 'PATCH',
            body: JSON.stringify({ name, frequency, trackingType })
          });
          const idx = STATE_HABITS.findIndex(h => getItemId(h) === editId);
          if (idx !== -1) STATE_HABITS[idx] = updated.data || updated;
        } else {
          const created = await apiRequest(`/api/identity/${identityId}/habits`, {
            method: 'POST',
            body: JSON.stringify({ name, frequency, trackingType })
          });
          STATE_HABITS.push(created.data || created);
        }

        closeModal('habit-modal-overlay');
        if (onSuccess) onSuccess();
      } catch (err) {
        alert(err.message || 'Failed to save habit.');
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  openModal('habit-modal-overlay', triggerEl);
}

function openIdentityEditFromDetailLive(identity, triggerEl) {
  const id = getItemId(identity);
  let overlay = document.getElementById('identity-edit-inline-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'identity-edit-inline-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'identity-edit-inline-title');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div class="modal-panel">
        <button class="modal-close-btn" id="iei-close" type="button" aria-label="Close dialog">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <h2 class="form-title" id="identity-edit-inline-title">Edit Identity</h2>
        <p class="form-subtitle">Update the name, description, or color.</p>
        <form id="iei-form" novalidate autocomplete="off">
          <div class="field-group">
            <label class="field-label" for="iei-name">Name <span class="field-required" aria-hidden="true">*</span></label>
            <div class="field-input-wrap">
              <input class="field-input" type="text" id="iei-name" maxlength="40" aria-required="true" />
            </div>
          </div>
          <div class="field-group">
            <label class="field-label" for="iei-desc">Description <span class="field-optional">(optional)</span></label>
            <div style="position:relative;">
              <textarea class="field-input field-textarea" id="iei-desc" maxlength="120" rows="2"></textarea>
              <span class="char-count" id="iei-char-count">0 / 120</span>
            </div>
          </div>
          <div class="field-group">
            <p class="field-label" id="iei-color-label">Card color</p>
            <div class="color-picker" role="group" aria-labelledby="iei-color-label">
              ${[['moss', 'var(--moss)', 'Forest green'], ['blue', 'var(--accent-blue)', 'Slate blue'], ['terra', 'var(--accent-terra)', 'Terracotta'], ['plum', 'var(--accent-plum)', 'Plum'], ['teal', 'var(--accent-teal)', 'Teal'], ['amber', 'var(--accent-amber)', 'Amber']].map(([val, bg, label]) => `
              <label class="color-swatch" title="${label}">
                <input type="radio" name="iei-color" value="${val}" />
                <span class="color-swatch__dot" style="background:${bg};" aria-hidden="true"></span>
                <span class="sr-only">${label}</span>
              </label>`).join('')}
            </div>
          </div>
          <div class="form-submit-row">
            <button type="submit" class="btn btn-primary btn-lg btn-submit" id="iei-submit">Save Changes</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(overlay);
  }

  overlay.querySelector('#iei-name').value = identity.name;
  const desc = overlay.querySelector('#iei-desc');
  desc.value = identity.description || '';
  const charCount = overlay.querySelector('#iei-char-count');
  if (charCount) charCount.textContent = `${desc.value.length} / 120`;
  const colorRadio = overlay.querySelector(`input[name="iei-color"][value="${identity.color || 'moss'}"]`);
  if (colorRadio) colorRadio.checked = true;

  overlay.querySelector('#iei-close').onclick = () => closeModal('identity-edit-inline-overlay');
  desc.oninput = () => { if (charCount) charCount.textContent = `${desc.value.length} / 120`; };

  const form = overlay.querySelector('#iei-form');
  const freshForm = form.cloneNode(true);
  form.parentNode.replaceChild(freshForm, form);

  freshForm.querySelector('#iei-desc').oninput = () => {
    const cnt = freshForm.querySelector('#iei-char-count');
    if (cnt) cnt.textContent = `${freshForm.querySelector('#iei-desc').value.length} / 120`;
  };
  freshForm.querySelector('#iei-close') && (freshForm.querySelector('#iei-close').onclick = () => closeModal('identity-edit-inline-overlay'));

  freshForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = freshForm.querySelector('#iei-name').value.trim();
    if (!name) return;

    const description = freshForm.querySelector('#iei-desc').value.trim() || null;
    const color = freshForm.querySelector('input[name="iei-color"]:checked')?.value || identity.color;

    try {
      const res = await apiRequest(`/api/identity/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, description, color })
      });
      STATE_IDENTITY_DETAIL = res.data || res;
      renderIdentityHeaderLive();
      closeModal('identity-edit-inline-overlay');
    } catch (err) {
      alert(err.message || 'Failed to update identity.');
    }
  });

  openModal('identity-edit-inline-overlay', triggerEl);
}

/* ============================================================
   AI INSIGHTS INTEGRATION
   ============================================================ */

async function generateAIInsights(identityId, aiBtn) {
  const container = document.getElementById('ai-insights-container');
  const content = document.getElementById('ai-insights-content');
  if (!container || !content) return;

  aiBtn.disabled = true;
  aiBtn.textContent = '✨ Generating Insights…';
  container.style.display = 'block';
  content.innerHTML = `
    <div style="display:flex; align-items:center; gap:var(--space-3); padding:var(--space-4) 0;">
      <div class="spinner" aria-label="Generating AI insights…"></div>
      <span style="font-size:0.9375rem; color:var(--text-muted);">Analyzing habit patterns and rolling consistency…</span>
    </div>`;

  try {
    const res = await apiRequest(`/ai-suggestions/${identityId}/generate`, { method: 'POST' });
    const suggestion = res?.suggestion || res?.data || res;

    renderAISuggestionContent(suggestion, content);
  } catch (err) {
    content.innerHTML = `
      <div style="padding:var(--space-3); color:var(--danger, #c53030); font-size:0.875rem;">
        ${escapeHtml(err.message || 'Failed to generate AI insights.')}
      </div>`;
  } finally {
    aiBtn.disabled = false;
    aiBtn.textContent = '✨ Get AI Insights';
  }
}

async function loadRecentAISuggestions(identityId) {
  const container = document.getElementById('ai-insights-container');
  const content = document.getElementById('ai-insights-content');
  if (!container || !content) return;

  try {
    const res = await apiRequest(`/ai-suggestions/${identityId}`, { method: 'GET' });
    const suggestions = Array.isArray(res?.suggestions) ? res.suggestions : (Array.isArray(res) ? res : []);
    if (suggestions.length > 0) {
      container.style.display = 'block';
      renderAISuggestionContent(suggestions[0], content);
    }
  } catch (_) {}
}

function renderAISuggestionContent(suggestion, contentEl) {
  if (!suggestion) return;

  const deepening = suggestion.identityDeepening || '';
  const habitSuggestions = Array.isArray(suggestion.habitSuggestions) ? suggestion.habitSuggestions : [];

  contentEl.innerHTML = `
    ${deepening ? `
      <div style="margin-bottom:var(--space-4); background:var(--surface-secondary, rgba(0,0,0,0.03)); padding:var(--space-3) var(--space-4); border-radius:var(--radius-md);">
        <p style="font-size:0.9375rem; color:var(--text-main); font-style:italic; margin:0;">
          "${escapeHtml(deepening)}"
        </p>
      </div>` : ''}

    ${habitSuggestions.length > 0 ? `
      <div style="display:flex; flex-direction:column; gap:var(--space-3);">
        ${habitSuggestions.map(s => `
          <div style="border-left:3px solid var(--moss); padding-left:var(--space-3);">
            <p style="font-weight:600; font-size:0.875rem; margin:0 0 var(--space-1) 0; color:var(--text-main);">
              ${escapeHtml(s.habitName || 'Habit Suggestion')}
            </p>
            ${s.observation ? `<p style="font-size:0.8125rem; color:var(--text-muted); margin:0 0 var(--space-1) 0;"><strong>Observation:</strong> ${escapeHtml(s.observation)}</p>` : ''}
            ${s.recommendation ? `<p style="font-size:0.8125rem; color:var(--moss); margin:0;"><strong>Recommendation:</strong> ${escapeHtml(s.recommendation)}</p>` : ''}
          </div>
        `).join('')}
      </div>` : ''}
  `;
}
