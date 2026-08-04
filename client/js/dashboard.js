/**
 * Dashboard Page (`dashboard.html`) Integration
 * Wires Identity CRUD to live backend endpoints:
 * - GET /api/identity
 * - POST /api/identity
 * - PATCH /api/identity/:id
 * - DELETE /api/identity ({ ids: [...] })
 */

let STATE_IDENTITIES = [];
let STATE_HABITS_BY_IDENTITY = {};

document.addEventListener('DOMContentLoaded', () => {
  initDashboardPage();
});

async function initDashboardPage() {
  const grid = document.getElementById('identity-grid');
  if (!grid) return;
  if (!requireAuth()) return;

  const emptyState = document.getElementById('identity-empty-state');
  const openBtn = document.getElementById('open-identity-modal-btn');
  const openBtnEmpty = document.getElementById('open-identity-modal-empty-btn');

  // Wire sign-out link
  const navSignout = document.getElementById('nav-logout-btn') || document.getElementById('nav-signout');
  if (navSignout) {
    navSignout.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await apiRequest('/auth/logout', { method: 'POST' });
      } catch (err) {
        console.warn('Logout error:', err);
      } finally {
        removeAuthToken();
        window.location.href = 'login.html';
      }
    });
  }

  // Wire logout-all link
  const navLogoutAll = document.getElementById('nav-logout-all-btn');
  if (navLogoutAll) {
    navLogoutAll.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await apiRequest('/auth/logout-all', { method: 'POST' });
      } catch (err) {
        console.warn('Logout-all error:', err);
      } finally {
        removeAuthToken();
        window.location.href = 'login.html';
      }
    });
  }

  // Close overflow menus when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.overflow-menu')) closeAllOverflowMenus();
  });

  // Show loading spinner initially
  grid.innerHTML = `
    <div style="grid-column: 1 / -1; display: flex; justify-content: center; padding: var(--space-12) 0;">
      <div class="spinner" aria-label="Loading identities…"></div>
    </div>`;

  try {
    const res = await apiRequest('/api/identity', { method: 'GET' });
    STATE_IDENTITIES = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
  } catch (err) {
    console.error('Failed to load identities:', err);
    STATE_IDENTITIES = [];
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: var(--space-6); text-align: center; color: var(--danger, #c53030);">
        ${escapeHtml(err.message || 'Failed to load identities. Please refresh.')}
      </div>`;
    return;
  }

  renderGrid();
  renderBuddiesSection();

  // Wire manual buddy invite claim form
  const claimForm = document.getElementById('buddy-claim-form');
  const claimInput = document.getElementById('input-buddy-token');
  const claimSubmit = document.getElementById('buddy-claim-submit-btn');
  const claimError = document.getElementById('buddy-claim-error');

  if (claimForm && claimInput) {
    claimForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (claimError) {
        claimError.classList.remove('visible');
        claimError.textContent = '';
      }

      const rawVal = claimInput.value.trim();
      if (!rawVal) return;

      claimSubmit.disabled = true;
      const originalText = claimSubmit.textContent;
      claimSubmit.textContent = 'Claiming...';

      let token = rawVal;
      // Extract token if rawVal is a full URL or contains query parameters
      try {
        if (rawVal.startsWith('http://') || rawVal.startsWith('https://') || rawVal.includes('?')) {
          const urlObj = new URL(rawVal.startsWith('http') ? rawVal : 'http://' + rawVal);
          const urlParams = new URLSearchParams(urlObj.search);
          const urlToken = urlParams.get('token');
          if (urlToken) token = urlToken;
        }
      } catch (err) {
        console.error('Failed to parse pasted URL:', err);
      }

      try {
        await apiRequest(`/api/buddy/claim/${token}`, { method: 'POST' });
        claimInput.value = '';
        renderBuddiesSection();
      } catch (err) {
        if (claimError) {
          claimError.textContent = err.message || 'Failed to claim buddy link.';
          claimError.classList.add('visible');
        }
      } finally {
        claimSubmit.disabled = false;
        claimSubmit.textContent = originalText;
      }
    });
  }

  // Multi-select bulk delete initialization
  initMultiSelect({
    containerEl: grid,
    checkboxSelector: '.js-identity-select',
    actionBarId: 'identity-action-bar',
    countId: 'identity-select-count',
    cancelBtnId: 'identity-cancel-select-btn',
    deleteBtnId: 'identity-delete-selected-btn',
    itemNoun: 'identity',
    onDelete: async (ids) => {
      if (!ids || ids.length === 0) return;
      try {
        await apiRequest('/api/identity', {
          method: 'DELETE',
          body: JSON.stringify({ identityIds: ids })
        });
        STATE_IDENTITIES = STATE_IDENTITIES.filter(i => !ids.includes(getItemId(i)));
        renderGrid();
      } catch (err) {
        alert(err.message || 'Failed to delete selected identities.');
      }
    }
  });

  // Wire the "New Identity" modal triggers
  wireIdentityModal(openBtn, renderGrid);
  wireIdentityModal(openBtnEmpty, renderGrid);

  function renderGrid() {
    grid.innerHTML = '';

    if (STATE_IDENTITIES.length === 0) {
      grid.style.display = 'none';
      if (emptyState) emptyState.style.display = 'block';
      if (openBtn) openBtn.style.display = 'none';
      return;
    }
    grid.style.display = '';
    if (emptyState) emptyState.style.display = 'none';
    if (openBtn) openBtn.style.display = '';

    STATE_IDENTITIES.forEach(identity => grid.appendChild(buildIdentityCardLive(identity, renderGrid)));
    initOverflowMenus(grid);
  }

  async function renderBuddiesSection() {
    const buddiesSection = document.getElementById('buddies-support-section');
    const buddiesGrid = document.getElementById('buddies-grid');
    const emptyState = document.getElementById('buddies-empty-state');
    if (!buddiesSection || !buddiesGrid) return;

    try {
      const res = await apiRequest('/api/buddy', { method: 'GET' });
      const pairings = Array.isArray(res?.pairings) ? res.pairings : (Array.isArray(res) ? res : []);

      buddiesSection.style.display = 'block';
      buddiesGrid.innerHTML = '';

      if (pairings.length === 0) {
        buddiesGrid.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
      }

      buddiesGrid.style.display = 'grid';
      if (emptyState) emptyState.style.display = 'none';

      pairings.forEach(pairing => {
        const identityId = pairing.identityId || pairing._id;
        const ownerName = pairing.ownerName || 'Partner';
        const identityName = pairing.identityName || 'Identity';

        const card = document.createElement('article');
        card.className = 'identity-card reveal-item';
        card.setAttribute('data-color', 'plum');
        card.setAttribute('role', 'listitem');

        card.innerHTML = `
          <div class="identity-card__body js-card-nav" data-href="buddy-view.html?identityId=${encodeURIComponent(identityId)}">
            <p class="eyebrow" style="margin-bottom:var(--space-1);">${escapeHtml(ownerName)}'s Identity</p>
            <p class="identity-card__name">
              <a class="identity-card__name-link"
                 href="buddy-view.html?identityId=${encodeURIComponent(identityId)}"
                 aria-label="View buddy details for ${escapeHtml(ownerName)}'s ${escapeHtml(identityName)}">
                ${escapeHtml(identityName)}
              </a>
            </p>
            <p class="identity-card__desc">You are accountability buddy for this identity.</p>
            <span class="identity-card__cta" aria-hidden="true">View partner habits →</span>
          </div>
        `;

        card.querySelector('.js-card-nav').addEventListener('click', (e) => {
          if (!e.target.closest('a')) {
            window.location.href = `buddy-view.html?identityId=${encodeURIComponent(identityId)}`;
          }
        });

        buddiesGrid.appendChild(card);
      });
    } catch (err) {
      console.error('Failed to load buddy dashboard:', err);
    }
  }
}

function buildIdentityCardLive(identity, onUpdate) {
  const id = getItemId(identity);
  const article = document.createElement('article');
  article.className = 'identity-card reveal-item';
  article.setAttribute('data-color', identity.color || 'moss');
  article.setAttribute('role', 'listitem');
  article.dataset.id = id;

  article.innerHTML = `
    <div class="card-select-wrap">
      <input type="checkbox" class="card-select-checkbox js-identity-select" data-id="${id}" aria-label="Select ${escapeHtml(identity.name)}" />
    </div>

    <div class="identity-card__body js-card-nav" data-href="identity.html?id=${encodeURIComponent(id)}" style="padding-left: calc(var(--space-4) + 28px);">
      <p class="identity-card__name">
        <a class="identity-card__name-link"
           href="identity.html?id=${encodeURIComponent(id)}"
           aria-label="View habits for ${escapeHtml(identity.name)}">
          ${escapeHtml(identity.name)}
        </a>
      </p>
      ${identity.description ? `<p class="identity-card__desc">${escapeHtml(identity.description)}</p>` : ''}
      <div class="identity-card__stats" id="stats-${id}">
        <div class="identity-card__stat">
          <span class="identity-card__stat-value">—</span>
          <span class="identity-card__stat-label">votes cast</span>
        </div>
        <div class="identity-card__stat">
          <span class="identity-card__stat-value">—</span>
          <span class="identity-card__stat-label">consistent</span>
        </div>
        <div class="identity-card__stat">
          <span class="identity-card__stat-value">—</span>
          <span class="identity-card__stat-label">habits</span>
        </div>
      </div>
      <span class="identity-card__cta" aria-hidden="true">View habits →</span>
    </div>

    <div class="overflow-menu" role="none">
      <button class="overflow-menu__trigger"
              aria-label="Options for ${escapeHtml(identity.name)}"
              aria-haspopup="menu"
              aria-expanded="false"
              type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
        </svg>
      </button>
      <ul class="overflow-menu__dropdown" role="menu" aria-label="${escapeHtml(identity.name)} options">
        <li><button class="overflow-menu__item" role="menuitem" data-action="edit">Edit</button></li>
        <li><button class="overflow-menu__item overflow-menu__item--danger" role="menuitem" data-action="delete">Delete</button></li>
      </ul>
    </div>
  `;

  // Fetch live habits & stats for this card
  loadCardStats(identity, article);

  // Card click navigation (toggles checkbox if in selection/delete-selection mode)
  article.querySelector('.js-card-nav').addEventListener('click', (e) => {
    const grid = document.getElementById('identity-grid');
    if (grid && grid.classList.contains('selection-mode')) {
      // Toggle selection in bulk delete mode
      if (!e.target.closest('.overflow-menu') && !e.target.closest('.card-select-wrap') && !e.target.closest('a')) {
        const cb = article.querySelector('.js-identity-select');
        if (cb) {
          cb.checked = !cb.checked;
          cb.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    } else {
      // Normal click navigation
      if (!e.target.closest('.overflow-menu') && !e.target.closest('.card-select-wrap') && !e.target.closest('a')) {
        window.location.href = `identity.html?id=${encodeURIComponent(id)}`;
      }
    }
  });

  // Overflow actions
  const trigger = article.querySelector('.overflow-menu__trigger');
  article.querySelector('[data-action="edit"]').addEventListener('click', () => {
    closeAllOverflowMenus();
    openIdentityModalLive('edit', identity, trigger, onUpdate);
  });

  article.querySelector('[data-action="delete"]').addEventListener('click', () => {
    closeAllOverflowMenus();
    const container = document.getElementById('identity-grid');
    if (container) {
      container.classList.add('selection-mode');
      const cb = article.querySelector('.js-identity-select');
      if (cb) {
        cb.checked = true;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  });

  return article;
}

async function loadCardStats(identity, cardEl) {
  const id = getItemId(identity);
  const statsContainer = cardEl.querySelector(`#stats-${id}`);
  if (!statsContainer) return;

  try {
    const habits = await apiRequest(`/api/identity/${id}/habits`, { method: 'GET' });
    const habitArray = Array.isArray(habits) ? habits : (Array.isArray(habits?.data) ? habits.data : []);

    let totalVotesSum = 0;
    let consistencySum = 0;

    for (const habit of habitArray) {
      const hId = getItemId(habit);
      try {
        const summary = await apiRequest(`/api/votes/summary?habitId=${hId}`, { method: 'GET' });
        if (summary) {
          totalVotesSum += summary.totalVotes || 0;
          consistencySum += summary.rollingConsistency || 0;
        }
      } catch (_) {}
    }

    const avgConsistency = habitArray.length ? Math.round(consistencySum / habitArray.length) : 0;

    statsContainer.innerHTML = `
      <div class="identity-card__stat">
        <span class="identity-card__stat-value">${totalVotesSum}</span>
        <span class="identity-card__stat-label">votes cast</span>
      </div>
      <div class="identity-card__stat">
        <span class="identity-card__stat-value">${avgConsistency}%</span>
        <span class="identity-card__stat-label">consistent</span>
      </div>
      <div class="identity-card__stat">
        <span class="identity-card__stat-value">${habitArray.length}</span>
        <span class="identity-card__stat-label">${habitArray.length === 1 ? 'habit' : 'habits'}</span>
      </div>`;
  } catch (err) {
    console.warn(`Failed to fetch stats for identity ${id}:`, err);
  }
}

function wireIdentityModal(triggerBtn, onSuccess) {
  if (!document.getElementById('identity-modal-overlay')) return;
  if (triggerBtn) {
    triggerBtn.addEventListener('click', () => openIdentityModalLive('create', null, triggerBtn, onSuccess));
  }
}

function openIdentityModalLive(mode, identity, triggerEl, onSuccess) {
  const overlay = document.getElementById('identity-modal-overlay');
  if (!overlay) return;

  const form = document.getElementById('identity-form');
  if (!form) return;

  // Clone to strip old listeners
  const freshForm = form.cloneNode(true);
  form.parentNode.replaceChild(freshForm, form);

  const titleEl = document.getElementById('identity-modal-title');
  const submitBtn = freshForm.querySelector('#identity-submit-btn');
  const nameInput = freshForm.querySelector('#input-identity-name');
  const descInput = freshForm.querySelector('#input-identity-description');
  const editIdInput = freshForm.querySelector('#identity-edit-id');

  if (!nameInput || !descInput || !submitBtn || !editIdInput) return;

  // Reset validation feedback classes and error messages on open
  clearFieldState(nameInput, 'error-identity-name', 'error-identity-name-text', 'icon-identity-name');

  const editId = mode === 'edit' && identity ? getItemId(identity) : '';

  if (mode === 'edit' && identity) {
    if (titleEl) titleEl.textContent = 'Edit Identity';
    if (submitBtn) submitBtn.textContent = 'Save Changes';
    if (nameInput) nameInput.value = identity.name || '';
    if (descInput) descInput.value = identity.description || '';
    if (editIdInput) editIdInput.value = editId;
    const colorRadio = overlay.querySelector(`input[name="identity-color"][value="${identity.color || 'moss'}"]`);
    if (colorRadio) colorRadio.checked = true;
  } else {
    if (titleEl) titleEl.textContent = 'New Identity';
    if (submitBtn) submitBtn.textContent = 'Create Identity';
    if (freshForm) freshForm.reset();
    if (editIdInput) editIdInput.value = '';
    const defaultColor = overlay.querySelector('input[name="identity-color"][value="moss"]');
    if (defaultColor) defaultColor.checked = true;
  }

  updateDescCharCount(descInput ? descInput.value.length : 0);

  const closeBtn = document.getElementById('identity-modal-close-btn');
  if (closeBtn) closeBtn.onclick = () => closeModal('identity-modal-overlay');

  const checkValidation = (showError = false) => {
    const nameVal = nameInput.value.trim();

    if (nameVal.length === 0) {
      if (showError) {
        setFieldState(nameInput, 'error-identity-name', 'error-identity-name-text', 'icon-identity-name', 'Enter an identity name.');
      } else {
        clearFieldState(nameInput, 'error-identity-name', 'error-identity-name-text', 'icon-identity-name');
      }
      return false;
    }
    if (nameVal.length < 2) {
      if (showError) {
        setFieldState(nameInput, 'error-identity-name', 'error-identity-name-text', 'icon-identity-name', 'Name must be at least 2 characters.');
      }
      return false;
    }
    if (nameVal.length > 50) {
      if (showError) {
        setFieldState(nameInput, 'error-identity-name', 'error-identity-name-text', 'icon-identity-name', 'Name must be 50 characters or fewer.');
      }
      return false;
    }
    if (nameVal.startsWith('_') || nameVal.startsWith('.')) {
      if (showError) {
        setFieldState(nameInput, 'error-identity-name', 'error-identity-name-text', 'icon-identity-name', "Name can't start with _ or .");
      }
      return false;
    }
    if (!/[a-zA-Z0-9]/.test(nameVal)) {
      if (showError) {
        setFieldState(nameInput, 'error-identity-name', 'error-identity-name-text', 'icon-identity-name', 'Name must contain at least one letter or number.');
      }
      return false;
    }

    // Duplication Check (avoiding duplicate names per user)
    const isDuplicate = STATE_IDENTITIES.some(
      (i) => i.name.trim().toLowerCase() === nameVal.toLowerCase() && getItemId(i) !== editId
    );
    if (isDuplicate) {
      if (showError) {
        setFieldState(nameInput, 'error-identity-name', 'error-identity-name-text', 'icon-identity-name', 'An identity with this name already exists.');
      }
      return false;
    }

    setFieldState(nameInput, 'error-identity-name', 'error-identity-name-text', 'icon-identity-name', null);
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
    updateDescCharCount(descInput.value.length);
  };

  freshForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!checkValidation(true)) {
      updateState();
      return;
    }

    const name = nameInput.value.trim();
    const description = descInput.value.trim();
    const color = overlay.querySelector('input[name="identity-color"]:checked')?.value || 'moss';

    submitBtn.disabled = true;

    try {
      if (editId) {
        const res = await apiRequest(`/api/identity/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify({ name, description, color })
        });
        const updated = res?.identity || res?.data || res;
        const idx = STATE_IDENTITIES.findIndex(i => getItemId(i) === editId);
        if (idx !== -1) STATE_IDENTITIES[idx] = updated;
      } else {
        const res = await apiRequest('/api/identity', {
          method: 'POST',
          body: JSON.stringify({ name, description, color })
        });
        const created = res?.identity || res?.data || res;
        STATE_IDENTITIES.push(created);
      }

      closeModal('identity-modal-overlay');
      if (onSuccess) onSuccess();
    } catch (err) {
      alert(err.message || 'Failed to save identity.');
    } finally {
      submitBtn.disabled = false;
    }
  });

  openModal('identity-modal-overlay', triggerEl);
}
