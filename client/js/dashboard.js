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
          body: JSON.stringify({ ids })
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
  if (openBtnEmpty) {
    openBtnEmpty.addEventListener('click', () => openIdentityModalForLive('create', null, openBtnEmpty, renderGrid));
  }

  function renderGrid() {
    grid.innerHTML = '';

    if (STATE_IDENTITIES.length === 0) {
      grid.style.display = 'none';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }
    grid.style.display = '';
    if (emptyState) emptyState.style.display = 'none';

    STATE_IDENTITIES.forEach(identity => grid.appendChild(buildIdentityCardLive(identity, renderGrid)));
    initOverflowMenus(grid);
  }

  async function renderBuddiesSection() {
    const buddiesSection = document.getElementById('buddies-support-section');
    const buddiesGrid = document.getElementById('buddies-grid');
    if (!buddiesSection || !buddiesGrid) return;

    try {
      const res = await apiRequest('/buddy', { method: 'GET' });
      const pairings = Array.isArray(res?.pairings) ? res.pairings : (Array.isArray(res) ? res : []);

      if (pairings.length === 0) {
        buddiesSection.style.display = 'none';
        return;
      }

      buddiesSection.style.display = 'block';
      buddiesGrid.innerHTML = '';

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
      console.warn('Failed to fetch buddy pairings:', err);
      buddiesSection.style.display = 'none';
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

  // Card click navigation
  article.querySelector('.js-card-nav').addEventListener('click', (e) => {
    if (!e.target.closest('.overflow-menu') && !e.target.closest('.card-select-wrap') && !e.target.closest('a')) {
      window.location.href = `identity.html?id=${encodeURIComponent(id)}`;
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
    openConfirmDelete({
      title: `Delete "${identity.name}"?`,
      body: `This will permanently delete the "${identity.name}" identity and all its habits. This cannot be undone.`,
      triggerEl: trigger,
      onConfirm: async () => {
        try {
          await apiRequest('/api/identity', {
            method: 'DELETE',
            body: JSON.stringify({ ids: [id] })
          });
          STATE_IDENTITIES = STATE_IDENTITIES.filter(i => getItemId(i) !== id);
          if (onUpdate) onUpdate();
        } catch (err) {
          alert(err.message || 'Failed to delete identity.');
        }
      },
    });
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

  const titleEl = document.getElementById('identity-modal-title');
  const submitBtn = document.getElementById('identity-submit-btn');
  const nameInput = document.getElementById('input-identity-name');
  const descInput = document.getElementById('input-identity-desc');
  const editIdInput = document.getElementById('identity-edit-id');
  const form = document.getElementById('identity-form');

  if (mode === 'edit' && identity) {
    const id = getItemId(identity);
    if (titleEl) titleEl.textContent = 'Edit Identity';
    if (submitBtn) submitBtn.textContent = 'Save Changes';
    if (nameInput) nameInput.value = identity.name || '';
    if (descInput) descInput.value = identity.description || '';
    if (editIdInput) editIdInput.value = id;
    const colorRadio = overlay.querySelector(`input[name="identity-color"][value="${identity.color || 'moss'}"]`);
    if (colorRadio) colorRadio.checked = true;
  } else {
    if (titleEl) titleEl.textContent = 'New Identity';
    if (submitBtn) submitBtn.textContent = 'Create Identity';
    if (form) form.reset();
    if (editIdInput) editIdInput.value = '';
    const defaultColor = overlay.querySelector('input[name="identity-color"][value="moss"]');
    if (defaultColor) defaultColor.checked = true;
  }

  updateDescCharCount(descInput ? descInput.value.length : 0);

  const closeBtn = document.getElementById('identity-modal-close-btn');
  if (closeBtn) closeBtn.onclick = () => closeModal('identity-modal-overlay');

  if (form && !form._wiredLive) {
    form._wiredLive = true;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = nameInput.value.trim();
      const description = descInput ? descInput.value.trim() : '';
      const color = overlay.querySelector('input[name="identity-color"]:checked')?.value || 'moss';
      const editId = editIdInput ? editIdInput.value : '';

      submitBtn.disabled = true;

      try {
        if (editId) {
          const res = await apiRequest(`/api/identity/${editId}`, {
            method: 'PATCH',
            body: JSON.stringify({ name, description, color })
          });
          const updated = res?.data || res;
          const idx = STATE_IDENTITIES.findIndex(i => getItemId(i) === editId);
          if (idx !== -1) STATE_IDENTITIES[idx] = updated;
        } else {
          const res = await apiRequest('/api/identity', {
            method: 'POST',
            body: JSON.stringify({ name, description, color })
          });
          const created = res?.data || res;
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
  }

  openModal('identity-modal-overlay', triggerEl);
}
