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
let SHOW_ARCHIVED = false;

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
              body: JSON.stringify({ identityIds: [identityId] })
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
  // Multi-select bulk delete and bulk archive initialization for habits
  initMultiSelect({
    containerEl: habitList,
    checkboxSelector: '.js-habit-select',
    actionBarId: 'habit-action-bar',
    countId: 'habit-select-count',
    cancelBtnId: 'habit-cancel-select-btn',
    deleteBtnId: 'habit-delete-selected-btn',
    archiveBtnId: 'habit-archive-selected-btn',
    itemNoun: 'habit',
    onDelete: async (ids) => {
      try {
        await apiRequest('/api/habits', {
          method: 'DELETE',
          body: JSON.stringify({ habitIds: ids })
        });
        STATE_HABITS = STATE_HABITS.filter(h => !ids.includes(getItemId(h)));
        renderHabits();
      } catch (err) {
        alert(err.message || 'Failed to delete selected habits.');
      }
    },
    onArchive: async (ids) => {
      try {
        await apiRequest('/api/habits/archive', {
          method: 'PATCH',
          body: JSON.stringify({ habitIds: ids, isArchived: true })
        });
        STATE_HABITS.forEach(h => {
          if (ids.includes(getItemId(h))) {
            h.isArchived = true;
          }
        });
        renderHabits();
      } catch (err) {
        alert(err.message || 'Failed to archive selected habits.');
      }
    }
  });

  const openBtn = document.getElementById('open-habit-modal-btn');
  const openBtnEmpty = document.getElementById('open-habit-modal-empty-btn');

  wireHabitModalLive(openBtn, identityId, () => renderHabits());
  if (openBtnEmpty) {
    openBtnEmpty.addEventListener('click', () => openHabitModalForLive('create', null, identityId, openBtnEmpty, () => renderHabits()));
  }

  // Live Buddy section
  if (typeof initBuddySectionLive === 'function') {
    initBuddySectionLive(identityId);
  }
}

async function loadHabits(identityId) {
  try {
    const [activeRes, archivedRes] = await Promise.all([
      apiRequest(`/api/identity/${identityId}/habits`, { method: 'GET' }),
      apiRequest(`/api/identity/${identityId}/habits?archived=true`, { method: 'GET' })
    ]);
    const activeList = Array.isArray(activeRes) ? activeRes : (Array.isArray(activeRes?.data) ? activeRes.data : []);
    const archivedList = Array.isArray(archivedRes) ? archivedRes : (Array.isArray(archivedRes?.data) ? archivedRes.data : []);
    STATE_HABITS = [...activeList, ...archivedList];
  } catch (err) {
    console.error('Failed to load habits:', err);
    STATE_HABITS = [];
  }

  // Pre-fetch vote summaries in parallel
  const promises = STATE_HABITS.map(async (habit) => {
    const hId = getItemId(habit);
    try {
      const summary = await apiRequest(`/api/votes/summary?habitId=${hId}`, { method: 'GET' });
      if (summary) STATE_VOTE_SUMMARIES[hId] = summary;
    } catch (_) {}
  });
  await Promise.all(promises);

  renderHabits();
}

function renderIdentityHeaderLive() {
  const headingEl = document.getElementById('identity-detail-heading');
  const descEl = document.getElementById('identity-detail-description');
  const eyebrowEl = document.getElementById('identity-detail-eyebrow');
  const consisEl = document.getElementById('identity-stat-consistency');

  if (headingEl) headingEl.textContent = STATE_IDENTITY_DETAIL.name;
  if (descEl) descEl.textContent = STATE_IDENTITY_DETAIL.description || '';
  if (eyebrowEl) eyebrowEl.textContent = 'Identity';

  let consistencySum = 0;
  STATE_HABITS.forEach(h => {
    const hId = getItemId(h);
    const s = STATE_VOTE_SUMMARIES[hId];
    if (s) {
      consistencySum += s.rollingConsistency || 0;
    }
  });
  const avgConsistency = STATE_HABITS.length ? Math.round(consistencySum / STATE_HABITS.length) : 0;

  if (consisEl) consisEl.textContent = `${avgConsistency}%`;
}

function renderHabits() {
  renderIdentityHeaderLive();
  const habitList = document.getElementById('habit-list');
  const emptyState = document.getElementById('habit-empty-state');
  if (!habitList) return;

  habitList.innerHTML = '';

  const visibleHabits = SHOW_ARCHIVED ? STATE_HABITS : STATE_HABITS.filter(h => !h.isArchived);

  if (visibleHabits.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    return;
  }
  if (emptyState) emptyState.style.display = 'none';

  const identityId = getItemId(STATE_IDENTITY_DETAIL);
  visibleHabits.forEach(habit => {
    const row = buildHabitRowLive(habit, identityId, renderHabits);
    habitList.appendChild(row);
  });
  initOverflowMenus(habitList);
}

function buildHabitRowLive(habit, identityId, onUpdate) {
  const hId = getItemId(habit);
  const summary = STATE_VOTE_SUMMARIES[hId] || { totalVotes: 0, rollingConsistency: 0, weeklyConsistency: 0, missedYesterday: false };

  const totalVotes = summary.totalVotes || 0;
  const consistency = summary.rollingConsistency || 0;
  const weeklyConsistency = summary.weeklyConsistency || 0;
  const missedYesterday = summary.missedYesterday || false;
  const activeBuddy = getActiveBuddy(identityId);

  let nmtHtml = '';
  if (missedYesterday) {
    const buddyNote = activeBuddy ? ` Your buddy ${escapeHtml(activeBuddy.buddyName)} will be notified.` : '';
    nmtHtml = `<span class="nmt-indicator nmt-indicator--missed-one">Missed yesterday — cast today's vote to keep going.${buddyNote}</span>`;
  }

  const row = document.createElement('div');
  row.className = 'habit-row' + (habit.isArchived ? ' habit-row--archived' : '');
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
      ${nmtHtml}
    </div>

    <div class="habit-stats" aria-label="Stats for ${escapeHtml(habit.name)}">
      <div class="habit-stat">
        <span class="habit-stat__value">${totalVotes}</span>
        <span class="habit-stat__label">votes</span>
      </div>
      <div class="habit-stats__divider"></div>
      <div class="habit-stat">
        <span class="habit-stat__value habit-stat__value--consistency">${weeklyConsistency}%</span>
        <span class="habit-stat__label">7-day</span>
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
        <li><button class="overflow-menu__item" role="menuitem" data-action="history">View History</button></li>
        <li><button class="overflow-menu__item" role="menuitem" data-action="edit">Edit</button></li>
        <li><button class="overflow-menu__item" role="menuitem" data-action="archive">${habit.isArchived ? 'Unarchive' : 'Archive'}</button></li>
        <li><button class="overflow-menu__item" role="menuitem" data-action="select">Select</button></li>
        <li><button class="overflow-menu__item overflow-menu__item--danger" role="menuitem" data-action="delete">Delete</button></li>
      </ul>
    </div>
  `;

  // Wire vote button for reversible voting
  const voteBtn = row.querySelector('.vote-btn');
  if (voteBtn) {
    voteBtn.addEventListener('click', () => {
      const isVoted = voteBtn.classList.contains('voted');
      if (isVoted) {
        unvoteLive(hId, voteBtn, onUpdate);
      } else {
        castVoteLive(hId, identityId, voteBtn, onUpdate);
      }
    });
  }

  // Overflow menu actions
  const trigger = row.querySelector('.overflow-menu__trigger');
  row.querySelector('[data-action="edit"]').addEventListener('click', () => {
    closeAllOverflowMenus();
    openHabitModalForLive('edit', habit, identityId, trigger, onUpdate);
  });

  const enterSelectionMode = () => {
    closeAllOverflowMenus();
    const container = document.getElementById('habit-list');
    if (container) {
      container.classList.add('selection-mode');
      const cb = row.querySelector('.js-habit-select');
      if (cb) {
        cb.checked = true;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  };

  row.querySelector('[data-action="history"]')?.addEventListener('click', () => {
    closeAllOverflowMenus();
    openHabitHistory(hId, habit.name);
  });

  row.querySelector('[data-action="archive"]')?.addEventListener('click', async () => {
    closeAllOverflowMenus();
    try {
      const targetState = !habit.isArchived;
      await apiRequest('/api/habits/archive', {
        method: 'PATCH',
        body: JSON.stringify({ habitIds: [hId], isArchived: targetState })
      });
      habit.isArchived = targetState;
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err.message || 'Failed to update habit archive status.');
    }
  });
  row.querySelector('[data-action="select"]')?.addEventListener('click', enterSelectionMode);
  row.querySelector('[data-action="delete"]')?.addEventListener('click', enterSelectionMode);

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

    voteBtn.disabled = false;
    voteBtn.classList.remove('vote-casting');
    voteBtn.classList.replace('not-voted', 'voted');
    voteBtn.setAttribute('aria-label', 'Already voted today — click to undo');
    voteBtn.title = 'Click to undo today\'s vote';
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
      voteBtn.disabled = false;
      voteBtn.classList.replace('not-voted', 'voted');
      voteBtn.setAttribute('aria-label', 'Already voted today — click to undo');
      voteBtn.title = 'Click to undo today\'s vote';
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

async function unvoteLive(habitId, voteBtn, onUpdate) {
  if (voteBtn) voteBtn.disabled = true;
  try {
    await apiRequest(`/api/votes/today?habitId=${habitId}`, { method: 'DELETE' });

    if (STATE_VOTE_SUMMARIES[habitId]) {
      STATE_VOTE_SUMMARIES[habitId].votedToday = false;
      if (STATE_VOTE_SUMMARIES[habitId].totalVotes > 0) {
        STATE_VOTE_SUMMARIES[habitId].totalVotes--;
      }
    }

    if (voteBtn) {
      voteBtn.disabled = false;
      voteBtn.classList.replace('voted', 'not-voted');
      voteBtn.setAttribute('aria-label', 'Cast vote');
      voteBtn.removeAttribute('title');
      const icon = voteBtn.querySelector('.vote-btn__icon');
      const label = voteBtn.querySelector('.vote-btn__label');
      if (icon) icon.textContent = '🗳';
      if (label) label.textContent = 'Cast vote';
    }

    // Refresh vote summary for this habit
    try {
      const summary = await apiRequest(`/api/votes/summary?habitId=${habitId}`, { method: 'GET' });
      if (summary) {
        summary.votedToday = false;
        STATE_VOTE_SUMMARIES[habitId] = summary;
      }
    } catch (_) {}

    if (onUpdate) onUpdate();
  } catch (err) {
    if (voteBtn) voteBtn.disabled = false;
    alert(err.message || 'Failed to remove today\'s vote.');
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

  const form = document.getElementById('habit-form');
  if (!form) return;

  // Clone form to strip old event listeners
  const freshForm = form.cloneNode(true);
  form.parentNode.replaceChild(freshForm, form);

  const titleEl = document.getElementById('habit-modal-title');
  const submitBtn = freshForm.querySelector('#habit-submit-btn');
  const nameInput = freshForm.querySelector('#input-habit-name');
  const editIdInput = freshForm.querySelector('#habit-edit-id');

  if (!nameInput || !submitBtn || !editIdInput) return;

  // Reset form and validation errors
  nameInput.value = '';
  clearFieldState(nameInput, 'error-habit-name', 'error-habit-name-text', 'icon-habit-name');

  const editId = mode === 'edit' && habit ? getItemId(habit) : '';
  const undoVoteBtn = freshForm.querySelector('#habit-undo-vote-btn');
  const isVoted = editId && STATE_VOTE_SUMMARIES[editId]?.votedToday;

  if (undoVoteBtn) {
    if (mode === 'edit' && isVoted) {
      undoVoteBtn.style.display = 'flex';
      undoVoteBtn.onclick = async () => {
        undoVoteBtn.disabled = true;
        await unvoteLive(editId, null, onSuccess);
        closeModal('habit-modal-overlay');
      };
    } else {
      undoVoteBtn.style.display = 'none';
      undoVoteBtn.onclick = null;
    }
  }

  if (mode === 'edit' && habit) {
    if (titleEl) titleEl.textContent = 'Edit Habit';
    if (submitBtn) submitBtn.textContent = 'Save Changes';
    if (nameInput) nameInput.value = habit.name || '';
    if (editIdInput) editIdInput.value = editId;
  } else {
    if (titleEl) titleEl.textContent = 'New Habit';
    if (submitBtn) submitBtn.textContent = 'Create Habit';
    if (editIdInput) editIdInput.value = '';
  }

  const checkValidation = (showError = true) => {
    const nameVal = nameInput.value.trim();

    if (nameVal.length === 0) {
      if (showError) {
        setFieldState(nameInput, 'error-habit-name', 'error-habit-name-text', 'icon-habit-name', 'Habit name is required.');
      } else {
        clearFieldState(nameInput, 'error-habit-name', 'error-habit-name-text', 'icon-habit-name');
      }
      return false;
    }
    if (nameVal.length < 2) {
      if (showError) {
        setFieldState(nameInput, 'error-habit-name', 'error-habit-name-text', 'icon-habit-name', 'Habit name must be at least 2 characters long.');
      }
      return false;
    }
    if (nameVal.length > 50) {
      if (showError) {
        setFieldState(nameInput, 'error-habit-name', 'error-habit-name-text', 'icon-habit-name', 'Habit name must be at most 50 characters long.');
      }
      return false;
    }
    if (nameVal.startsWith('_') || nameVal.startsWith('.')) {
      if (showError) {
        setFieldState(nameInput, 'error-habit-name', 'error-habit-name-text', 'icon-habit-name', 'Habit name cannot start with an underscore (_) or a period (.).');
      }
      return false;
    }
    if (!/[a-zA-Z0-9]/.test(nameVal)) {
      if (showError) {
        setFieldState(nameInput, 'error-habit-name', 'error-habit-name-text', 'icon-habit-name', 'Habit name must contain at least one letter or number.');
      }
      return false;
    }

    setFieldState(nameInput, 'error-habit-name', 'error-habit-name-text', 'icon-habit-name', null);
    return true;
  };

  const updateHabitSubmitState = () => {
    if (submitBtn) {
      submitBtn.disabled = !checkValidation(false);
    }
  };

  updateHabitSubmitState();

  nameInput.oninput = () => {
    const hasError = nameInput.classList.contains('is-error');
    checkValidation(hasError);
    updateHabitSubmitState();
  };
  nameInput.onblur = () => {
    checkValidation(true);
    updateHabitSubmitState();
  };

  const closeBtn = document.getElementById('habit-modal-close-btn');
  if (closeBtn) closeBtn.onclick = () => closeModal('habit-modal-overlay');

  freshForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!checkValidation(true)) {
      updateHabitSubmitState();
      return;
    }

    const name = nameInput.value.trim();
    const editId = editIdInput.value;

    submitBtn.disabled = true;

    try {
      if (editId) {
        const updated = await apiRequest(`/api/habits/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify({ name })
        });
        const updatedObj = updated.data || updated;
        const idx = STATE_HABITS.findIndex(h => getItemId(h) === editId);
        if (idx !== -1) STATE_HABITS[idx] = updatedObj;
      } else {
        const created = await apiRequest(`/api/identity/${identityId}/habits`, {
          method: 'POST',
          body: JSON.stringify({ name })
        });
        const newHabitObj = created.data || created;
        STATE_HABITS.push(newHabitObj);
      }

      closeModal('habit-modal-overlay');
      if (onSuccess) onSuccess();
    } catch (err) {
      setFieldState(nameInput, 'error-habit-name', 'error-habit-name-text', 'icon-habit-name', err.message || 'Failed to save habit.');
    } finally {
      submitBtn.disabled = false;
      updateHabitSubmitState();
    }
  });

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
          <div class="field-group" id="iei-name-group">
            <label class="field-label" for="iei-name">Name <span class="field-required" aria-hidden="true">*</span></label>
            <div class="field-input-wrap">
              <input class="field-input" type="text" id="iei-name" maxlength="50" aria-required="true" />
              <span class="field-status-icon" id="iei-icon-name" aria-hidden="true"></span>
            </div>
            <div class="field-error" id="error-iei-name" role="alert" aria-live="polite">
              <span class="field-error__icon" aria-hidden="true">⚠️</span>
              <span class="field-error__text" id="error-iei-name-text"></span>
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

  const form = overlay.querySelector('#iei-form');
  const freshForm = form.cloneNode(true);
  form.parentNode.replaceChild(freshForm, form);

  const nameInput = freshForm.querySelector('#iei-name');
  const descInput = freshForm.querySelector('#iei-desc');
  const charCount = freshForm.querySelector('#iei-char-count');
  const submitBtn = freshForm.querySelector('#iei-submit');

  if (!nameInput || !descInput || !submitBtn) return;

  nameInput.value = identity.name;
  descInput.value = identity.description || '';
  if (charCount) charCount.textContent = `${descInput.value.length} / 120`;
  const colorRadio = overlay.querySelector(`input[name="iei-color"][value="${identity.color || 'moss'}"]`);
  if (colorRadio) colorRadio.checked = true;

  // Clear previous validation state
  clearFieldState(nameInput, 'error-iei-name', 'error-iei-name-text', 'iei-icon-name');

  freshForm.querySelector('#iei-close') && (freshForm.querySelector('#iei-close').onclick = () => closeModal('identity-edit-inline-overlay'));

  const checkValidation = (showError = false) => {
    const nameVal = nameInput.value.trim();

    if (nameVal.length === 0) {
      if (showError) {
        setFieldState(nameInput, 'error-iei-name', 'error-iei-name-text', 'iei-icon-name', 'Enter an identity name.');
      } else {
        clearFieldState(nameInput, 'error-iei-name', 'error-iei-name-text', 'iei-icon-name');
      }
      return false;
    }
    if (nameVal.length < 2) {
      if (showError) {
        setFieldState(nameInput, 'error-iei-name', 'error-iei-name-text', 'iei-icon-name', 'Name must be at least 2 characters.');
      }
      return false;
    }
    if (nameVal.length > 50) {
      if (showError) {
        setFieldState(nameInput, 'error-iei-name', 'error-iei-name-text', 'iei-icon-name', 'Name must be 50 characters or fewer.');
      }
      return false;
    }
    if (nameVal.startsWith('_') || nameVal.startsWith('.')) {
      if (showError) {
        setFieldState(nameInput, 'error-iei-name', 'error-iei-name-text', 'iei-icon-name', "Name can't start with _ or .");
      }
      return false;
    }
    if (!/[a-zA-Z0-9]/.test(nameVal)) {
      if (showError) {
        setFieldState(nameInput, 'error-iei-name', 'error-iei-name-text', 'iei-icon-name', 'Name must contain at least one letter or number.');
      }
      return false;
    }

    setFieldState(nameInput, 'error-iei-name', 'error-iei-name-text', 'iei-icon-name', null);
    return true;
  };

  const updateState = () => {
    if (submitBtn) {
      submitBtn.disabled = !checkValidation(false);
    }
  };

  updateState();

  nameInput.oninput = () => {
    const hasErrorDisplayed = nameInput.classList.contains('error');
    checkValidation(hasErrorDisplayed);
    updateState();
  };
  nameInput.onblur = () => {
    checkValidation(true);
    updateState();
  };

  descInput.oninput = () => {
    if (charCount) charCount.textContent = `${descInput.value.length} / 120`;
  };

  freshForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!checkValidation(true)) {
      updateState();
      return;
    }

    const name = nameInput.value.trim();
    const description = descInput.value.trim() || null;
    const color = freshForm.querySelector('input[name="iei-color"]:checked')?.value || identity.color;

    submitBtn.disabled = true;

    try {
      const res = await apiRequest(`/api/identity/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, description, color })
      });
      STATE_IDENTITY_DETAIL = res.identity || res.data || res;
      renderIdentityHeaderLive();
      closeModal('identity-edit-inline-overlay');
    } catch (err) {
      if (err.message.includes('exists') || err.message.includes('409') || err.message.includes('duplicate')) {
        setFieldState(nameInput, 'error-iei-name', 'error-iei-name-text', 'iei-icon-name', 'An identity with this name already exists.');
      } else {
        alert(err.message || 'Failed to update identity.');
      }
    } finally {
      submitBtn.disabled = false;
      updateState();
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

/* ============================================================
   HABIT HISTORY PANEL — Vote Graph & Consistency Visualization
   ============================================================ */

let _historyPanelOpen = false;
const _tooltip = () => document.getElementById('vg-tooltip');

function openHabitHistory(habitId, habitName) {
  const overlay = document.getElementById('history-overlay');
  const body    = document.getElementById('history-body');
  const skel    = document.getElementById('history-skeleton');
  const titleEl = document.getElementById('history-panel-title');
  const pill    = document.getElementById('history-trend-pill');
  if (!overlay || !body) return;

  // Reset to loading state
  if (titleEl) titleEl.textContent = habitName;
  if (pill)    { pill.textContent = ''; pill.className = 'trend-pill'; }
  body.innerHTML = '';
  body.appendChild(createSkeleton());

  overlay.classList.add('is-open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  _historyPanelOpen = true;

  // Focus close button for a11y
  setTimeout(() => document.getElementById('history-close-btn')?.focus(), 80);

  // Wire close
  const closeBtn = document.getElementById('history-close-btn');
  const backdrop = document.getElementById('history-backdrop');
  const handleClose = () => closeHistoryPanel();
  closeBtn?.addEventListener('click', handleClose, { once: true });
  backdrop?.addEventListener('click', handleClose, { once: true });

  // Keyboard close
  const escListener = (e) => { if (e.key === 'Escape' && _historyPanelOpen) closeHistoryPanel(); };
  document.addEventListener('keydown', escListener, { once: true });

  // Fetch and render
  apiRequest(`/api/habits/${habitId}/history`, { method: 'GET' })
    .then(res => {
      const data = res?.data || res;
      body.innerHTML = '';
      renderHistoryPanel(body, data);
    })
    .catch(err => {
      body.innerHTML = `
        <div style="padding:var(--space-8); text-align:center;">
          <p style="color:var(--error); font-size:0.9375rem; margin-bottom:var(--space-4);">
            Could not load history. ${escapeHtml(err?.message || 'Please try again.')}
          </p>
          <button class="btn btn-ghost" onclick="openHabitHistory('${habitId}','${escapeHtml(habitName)}')">
            Retry
          </button>
        </div>`;
    });
}

function closeHistoryPanel() {
  const overlay = document.getElementById('history-overlay');
  if (!overlay) return;
  overlay.classList.remove('is-open');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  _historyPanelOpen = false;
  // Hide tooltip
  const tip = _tooltip();
  if (tip) tip.classList.remove('is-visible');
}

function createSkeleton() {
  const sk = document.createElement('div');
  sk.className = 'history-skeleton';
  sk.innerHTML = '<div class="skel skel--row"></div><div class="skel skel--grid"></div><div class="skel skel--bars"></div>';
  return sk;
}

function renderHistoryPanel(container, d) {
  // Update header pill
  const pill = document.getElementById('history-trend-pill');
  if (pill) {
    pill.textContent = d.trend || '';
    pill.className = `trend-pill trend-pill--${(d.trend || 'stable').toLowerCase()}`;
  }

  // ── NMT alert ───────────────────────────────────────────────
  if (d.nearNeverMissTwice) {
    const nmt = document.createElement('div');
    nmt.className = 'history-nmt-alert';
    nmt.innerHTML = `
      <span class="history-nmt-alert__icon" aria-hidden="true">⚡</span>
      <p class="history-nmt-alert__text">
        You missed yesterday. Cast today's vote to keep the momentum going.
        Never miss twice — that's the only rule.
      </p>`;
    container.appendChild(nmt);
  }

  // ── Summary cards ────────────────────────────────────────────
  const summaryRow = document.createElement('div');
  summaryRow.className = 'history-summary-row';

  const todayLabel = d.completedToday ? '✓ Voted' : 'Not yet';
  const todayColor = d.completedToday ? 'var(--moss)' : 'var(--slate)';

  const deltaSign  = d.currentConsistency >= d.previousConsistency ? '+' : '';
  const delta      = d.currentConsistency - d.previousConsistency;
  const deltaText  = d.previousConsistency > 0 ? `${deltaSign}${delta}% vs prev. month` : d.trendDescription;

  const cards = [
    {
      modifier: 'today',
      value: todayLabel,
      label: 'Today',
      sub: d.completedToday ? 'Vote cast ✓' : 'Vote pending',
      valueStyle: `color:${todayColor};`
    },
    {
      modifier: 'votes',
      value: d.totalVotes,
      label: 'Total Votes',
      sub: `${d.monthlyVotes} this month`
    },
    {
      modifier: 'consist',
      value: `${d.currentConsistency}%`,
      label: '30-Day',
      sub: deltaText
    },
    {
      modifier: 'window',
      value: d.currentActiveWindow > 0 ? `${d.currentActiveWindow}d` : '—',
      label: 'Current Run',
      sub: `Best: ${d.longestActiveWindow}d`
    }
  ];

  cards.forEach(({ modifier, value, label, sub, valueStyle }) => {
    const card = document.createElement('div');
    card.className = `history-stat-card history-stat-card--${modifier}`;
    card.innerHTML = `
      <span class="hsc__value" ${valueStyle ? `style="${valueStyle}"` : ''}>${escapeHtml(String(value))}</span>
      <span class="hsc__label">${escapeHtml(label)}</span>
      ${sub ? `<span class="hsc__sub">${escapeHtml(sub)}</span>` : ''}`;
    summaryRow.appendChild(card);
    // Animate bar-top accent with a tiny delay
    requestAnimationFrame(() => setTimeout(() => card.classList.add('is-loaded'), 60));
  });
  container.appendChild(summaryRow);

  // ── Vote Graph ───────────────────────────────────────────────
  const graphSection = document.createElement('div');
  const firstDow = d.firstCellDayOfWeek ?? 0; // 0=Sun

  // Build month label row (one per week column based on 1st day of each week)
  const numWeeks = Math.ceil((d.calendar?.length || 28) / 7);
  const monthLabels = [];
  for (let w = 0; w < numWeeks; w++) {
    const firstCellOfWeek = d.calendar[w * 7];
    monthLabels.push(firstCellOfWeek?.month ?? '');
  }
  // Only show month label when it changes
  const monthLabelsCleaned = monthLabels.map((m, i) => i === 0 || m !== monthLabels[i - 1] ? m : '');

  graphSection.innerHTML = `
    <p class="history-section-title">Monthly Vote Graph</p>
    <div class="vg-wrapper">
      <div class="vg-month-row" aria-hidden="true">
        ${monthLabelsCleaned.map(m => `<span class="vg-month-label">${m}</span>`).join('')}
      </div>
      <div class="vg-day-headers" aria-hidden="true">
        <span class="vg-day-header">S</span>
        <span class="vg-day-header">M</span>
        <span class="vg-day-header">T</span>
        <span class="vg-day-header">W</span>
        <span class="vg-day-header">T</span>
        <span class="vg-day-header">F</span>
        <span class="vg-day-header">S</span>
      </div>
      <div class="vg-grid" role="grid" aria-label="Vote history calendar">
        ${buildCalendarCells(d.calendar, d.firstCellDayOfWeek)}
      </div>
    </div>`;

  container.appendChild(graphSection);

  // Wire tooltip
  initVoteGraphTooltip(graphSection.querySelector('.vg-grid'));

  // ── Weekday pattern ──────────────────────────────────────────
  const patternSection = document.createElement('div');
  patternSection.innerHTML = `<p class="history-section-title">Weekly Pattern</p>`;

  const patternGrid = document.createElement('div');
  patternGrid.className = 'vg-pattern-grid';

  d.weekdayStats.forEach(ws => {
    const fillClass = ws.rate >= 70 ? 'vg-pattern-bar-fill--high'
                    : ws.rate >= 40 ? 'vg-pattern-bar-fill--mid'
                    : 'vg-pattern-bar-fill--low';
    const isWeakest  = ws.day === d.weakestDay;
    const isStrongest = ws.day === d.strongestDay;
    const badge = isWeakest ? ' 🔻' : isStrongest ? ' ⭐' : '';
    const row = document.createElement('div');
    row.className = 'vg-pattern-row';
    row.innerHTML = `
      <span class="vg-pattern-day">${escapeHtml(ws.day)}${badge}</span>
      <div class="vg-pattern-bar-track" role="progressbar" aria-valuenow="${ws.rate}" aria-valuemin="0" aria-valuemax="100" aria-label="${ws.day} completion rate">
        <div class="vg-pattern-bar-fill ${fillClass}" data-rate="${ws.rate}" style="width:0%"></div>
      </div>
      <span class="vg-pattern-pct">${ws.totalCount > 0 ? ws.rate + '%' : '—'}</span>`;
    patternGrid.appendChild(row);
  });

  patternSection.appendChild(patternGrid);
  container.appendChild(patternSection);

  // Animate bars after paint
  requestAnimationFrame(() => {
    patternGrid.querySelectorAll('.vg-pattern-bar-fill').forEach(fill => {
      fill.style.width = fill.dataset.rate + '%';
    });
  });

  // ── Insight card ─────────────────────────────────────────────
  const insightText = buildInsightText(d);
  if (insightText) {
    const insight = document.createElement('div');
    insight.className = 'history-insight';
    insight.innerHTML = insightText;
    container.appendChild(insight);
  }
}

function buildCalendarCells(calendar, firstDayOfWeek) {
  let html = '';
  let isFirst = true;
  calendar.forEach((cell, i) => {
    let cssClass = 'vg-cell ';
    if      (cell.status === 'completed' && cell.isToday) cssClass += 'vg-cell--today-voted';
    else if (cell.status === 'completed')                 cssClass += 'vg-cell--completed';
    else if (cell.status === 'missed')                    cssClass += 'vg-cell--missed';
    else if (cell.status === 'today')                     cssClass += 'vg-cell--today-open';
    else if (cell.status === 'future')                    cssClass += 'vg-cell--future';
    else                                                  cssClass += 'vg-cell--pre-creation';

    // Stagger animation delay per-cell
    const delay = Math.min(i * 4, 400);
    let styleStr = `animation-delay:${delay}ms`;

    const statusLabel = cell.status === 'completed' ? 'Voted' : cell.status === 'missed' ? 'Missed' : cell.status === 'today' ? 'Today' : cell.status === 'future' ? 'Future' : '';

    // First cell: offset to correct weekday column in the 7-col grid
    if (isFirst && firstDayOfWeek > 0) {
      styleStr += `; grid-column-start:${firstDayOfWeek + 1}`;
      isFirst = false;
    } else {
      isFirst = false;
    }

    const attrs = [
      `class="${cssClass.trim()}"`,
      `data-date="${cell.date}"`,
      `data-status="${statusLabel}"`,
      `style="${styleStr}"`,
      `role="gridcell"`,
      `aria-label="${cell.date}: ${statusLabel}"`
    ];
    if (cell.note) attrs.push(`data-note="${escapeHtml(cell.note)}"`);

    html += `<div ${attrs.join(' ')}></div>`;
  });
  return html;
}

function buildInsightText(d) {
  const parts = [];
  if (d.weakestDay && d.strongestDay && d.weakestDay !== d.strongestDay) {
    parts.push(`<strong>${d.strongestDay}s</strong> are your strongest day. <strong>${d.weakestDay}s</strong> are your most common miss — try lowering the bar on ${d.weakestDay}s.`);
  }
  if (d.currentActiveWindow >= 3) {
    parts.push(`You are on a <strong>${d.currentActiveWindow}-day run</strong> right now. Keep going.`);
  }
  if (d.longestActiveWindow > d.currentActiveWindow && d.longestActiveWindow >= 3) {
    parts.push(`Your best run was <strong>${d.longestActiveWindow} consecutive days</strong>.`);
  }
  if (!d.completedToday) {
    parts.push(`Cast today's vote to keep building your identity as someone who does this.`);
  }
  if (parts.length === 0) return null;
  return parts.join(' ');
}

function initVoteGraphTooltip(grid) {
  if (!grid) return;
  const tip = _tooltip();
  if (!tip) return;

  const MONTH_FULL = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  grid.addEventListener('mousemove', (e) => {
    const cell = e.target.closest('.vg-cell[data-date]');
    if (!cell) { tip.classList.remove('is-visible'); return; }
    const ds    = cell.dataset.date;       // YYYY-MM-DD
    const parts = ds.split('-');
    const d     = new Date(ds + 'T00:00:00Z');
    const label = `${MONTH_FULL[d.getUTCMonth()]} ${d.getUTCDate()}, ${parts[0]} · ${cell.dataset.status || ''}`;
    tip.textContent = label;
    tip.classList.add('is-visible');
    // Position above cursor
    tip.style.left = (e.clientX - tip.offsetWidth / 2) + 'px';
    tip.style.top  = (e.clientY - 36) + 'px';
  });

  grid.addEventListener('mouseleave', () => tip.classList.remove('is-visible'));
}
