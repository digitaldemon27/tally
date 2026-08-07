/**
 * scorecard.js — Tally Scorecard feature
 *
 * This file owns everything for scorecard.html:
 *   - Fetching today's and past entries from the backend
 *   - Rendering entry rows and the sidebar date list
 *   - Create / edit / delete via the modal form
 *
 * INTEGRATION PATTERN REFERENCE:
 *   Every API call follows this shape:
 *     1. Show a loading/disabled state on the UI element that triggered it
 *     2. Call apiRequest() from api-client.js (handles auth headers + errors)
 *     3. On success: update todayEntries (local state) and re-render
 *     4. On failure: display error.message in the inline .field-server-error banner
 *   No polling. No re-fetching after mutations — the mutation response IS the
 *   new source of truth (e.g. createEntry returns the saved entry object directly).
 *
 * RESPONSE SHAPE (from backend controllers — verified against actual source):
 *   GET  /scorecard/today       → { success, entries: [...] }
 *   GET  /scorecard/:date       → { success, entries: [...] }
 *   POST /scorecard             → { success, entry: {...} }
 *   PATCH /scorecard/:entryId   → { success, entry: {...} }
 *   DELETE /scorecard/:entryId  → { success, message: "..." }
 *
 * ENTRY SHAPE (from ScorecardEntry schema):
 *   { _id, userId, note, label, date, createdAt, updatedAt }
 *   label is one of: "positive" | "negative" | "neutral"
 *   MongoDB returns _id as a string in JSON — we use entry._id throughout.
 */

'use strict';

/* ============================================================
   STATE
   In-memory array of today's entries. Rebuilt on load, updated
   in-place after every mutation (no full re-fetches after CUD).
   Historical entries are never stored here — they're only
   rendered temporarily and discarded when the user returns to Today.
   ============================================================ */
let todayEntries = [];

// Which date is currently displayed in the main window.
// 'today' or an ISO date string like '2026-07-28'.
let currentViewDate = 'today';

// User's account creation date, returned from /api/scorecard/today
let userAccountCreatedAt = null;

/* ============================================================
   API CALLS — one function per endpoint
   apiRequest is defined in api-client.js, loaded before this file.
   ============================================================ */

/**
 * Loads today's entries on page open.
 * TODO: replace with real call — route: GET /api/scorecard/today
 */
async function fetchTodayEntries() {
  setMainLoading(true);
  try {
    // apiRequest attaches Authorization and X-Timezone headers automatically.
    const data = await apiRequest('/scorecard/today');
    // Backend returns: { success: true, entries: [...], accountCreatedAt: "..." }
    todayEntries = data.entries;
    if (data.accountCreatedAt) {
      userAccountCreatedAt = data.accountCreatedAt;
    }
    currentViewDate = 'today';
    renderTodayEntries();
    updateSidebarActiveDate('today');
  } catch (err) {
    showMainError(err.message);
  } finally {
    setMainLoading(false);
  }
}

/**
 * Loads a historical date's entries (read-only — no add/edit/delete).
 * TODO: replace with real call — route: GET /api/scorecard/:date
 * @param {string} dateString — ISO date string, e.g. '2026-07-28'
 */
async function fetchEntriesForDate(dateString) {
  setMainLoading(true);
  try {
    // Backend validates the date and returns 400 for invalid/out-of-range.
    // The 400 message ('Invalid date' or 'Date out of range') is meaningful
    // and shown directly in the sidebar area — not a generic error.
    const data = await apiRequest(`/scorecard/${dateString}`);
    // Historical view: render read-only (no kebab menus, no add-entry button)
    currentViewDate = dateString;
    renderHistoricalEntries(data.entries, dateString);
    updateSidebarActiveDate(dateString);
  } catch (err) {
    // 400 errors from getByDateController have specific, user-meaningful messages —
    // show them in the sidebar zone next to the date list, not in the main window.
    showSidebarError(err.message);
    setMainLoading(false);
  } finally {
    setMainLoading(false);
  }
}

/**
 * Submits a new entry and splices it into local state without a full re-fetch.
 * TODO: replace with real call — route: POST /api/scorecard
 * Body shape expected by backend Zod validator: { note: string, label: "positive"|"negative"|"neutral" }
 * @param {string} note
 * @param {string} label
 */
async function createEntry(note, label) {
  const data = await apiRequest('/scorecard', {
    method: 'POST',
    body: JSON.stringify({ note, label }),
  });
  // Backend returns: { success: true, entry: { _id, note, label, date, ... } }
  // Append directly — the server's returned entry is the real source of truth,
  // not a locally-constructed placeholder.
  todayEntries.push(data.entry);
  renderTodayEntries();
}

/**
 * Patches an existing entry and syncs local state from the response.
 * TODO: replace with real call — route: PATCH /api/scorecard/:entryId
 * @param {string} entryId — MongoDB _id string
 * @param {string} note
 * @param {string} label
 */
async function editEntry(entryId, note, label) {
  const data = await apiRequest(`/scorecard/${entryId}`, {
    method: 'PATCH',
    body: JSON.stringify({ note, label }),
  });
  // Backend returns: { success: true, entry: { _id, note, label, ... } }
  const idx = todayEntries.findIndex(e => e._id === entryId);
  if (idx !== -1) todayEntries[idx] = data.entry;
  renderTodayEntries();
}

/**
 * Deletes an entry and removes it from local state.
 * TODO: replace with real call — route: DELETE /api/scorecard/:entryId
 * @param {string} entryId — MongoDB _id string
 */
async function deleteEntry(entryId) {
  await apiRequest('/scorecard', {
    method: 'DELETE',
    body: JSON.stringify({ entryIds: [entryId] })
  });
  // Filter from local state — response body has no updated entry to sync.
  todayEntries = todayEntries.filter(e => e._id !== entryId);
  renderTodayEntries();
}

/* ============================================================
   RENDER — TODAY'S ENTRIES (editable)
   ============================================================ */

function renderTodayEntries() {
  const list     = document.getElementById('entry-list');
  const empty    = document.getElementById('entry-empty-state');
  const heading  = document.getElementById('main-heading');
  const subhead  = document.getElementById('main-subheading');
  const addBtn   = document.getElementById('open-entry-modal-btn');

  if (heading)  heading.textContent  = "Today's Scorecard";
  if (subhead)  subhead.textContent  = formatDateLong(new Date());
  if (addBtn)   addBtn.style.display = '';

  if (!list) return;
  list.innerHTML = '';

  if (todayEntries.length === 0) {
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  todayEntries.forEach(entry => {
    list.appendChild(buildEntryRow(entry, /* editable */ true));
  });
}

/* ============================================================
   RENDER — HISTORICAL ENTRIES (read-only)
   ============================================================ */

function renderHistoricalEntries(entries, dateString) {
  const list    = document.getElementById('entry-list');
  const empty   = document.getElementById('entry-empty-state');
  const heading = document.getElementById('main-heading');
  const subhead = document.getElementById('main-subheading');
  const addBtn  = document.getElementById('open-entry-modal-btn');

  // Historical view: hide the add-entry button — mutations are today-only
  if (addBtn) addBtn.style.display = 'none';

  // Hide selection bar if active when switching to history
  const bar = document.getElementById('scorecard-action-bar');
  if (bar) bar.classList.remove('is-visible');
  if (list) list.classList.remove('selection-mode');

  if (heading) heading.textContent = formatDateLong(new Date(dateString + 'T00:00:00'));
  if (subhead) subhead.textContent = 'Read-only — entries can only be added or edited for today.';

  if (!list) return;
  list.innerHTML = '';

  if (!entries || entries.length === 0) {
    if (empty) {
      empty.style.display = 'block';
      const emptyText = empty.querySelector('.empty-state__text');
      if (emptyText) emptyText.textContent = 'No entries were logged for this day.';
    }
    return;
  }
  if (empty) empty.style.display = 'none';

  entries.forEach(entry => {
    list.appendChild(buildEntryRow(entry, /* editable */ false));
  });
}

/* ============================================================
   BUILD ENTRY ROW
   ============================================================ */

/**
 * Builds and returns one <li> element for a scorecard entry.
 * @param {object}  entry    — { _id, note, label, createdAt, ... }
 * @param {boolean} editable — true for today's entries, false for historical
 */
function buildEntryRow(entry, editable) {
  const li = document.createElement('li');
  li.className = `entry-row entry-row--${entry.label}`;
  li.setAttribute('role', 'listitem');
  li.dataset.id = entry._id;

  // Label badge: + / − / = with color per label value
  const labelMeta = LABEL_META[entry.label] || LABEL_META.neutral;

  li.innerHTML = `
    ${editable ? `
    <div class="card-select-wrap" style="position:relative; top:0; left:0; display:flex; align-items:center; margin-right:var(--space-3);">
      <input type="checkbox" class="card-select-checkbox js-entry-select" data-id="${escSC(entry._id)}" aria-label="Select entry" />
    </div>` : ''}
    <span class="entry-label-badge entry-label-badge--${entry.label}"
          aria-label="${escSC(entry.label)}">
      ${labelMeta.symbol}
    </span>
    <span class="entry-note">${escSC(entry.note)}</span>
    ${editable ? `
    <div class="overflow-menu" role="none" data-entry-id="${escSC(entry._id)}">
      <button class="overflow-menu__trigger"
              aria-label="Options for this entry"
              aria-haspopup="menu"
              aria-expanded="false"
              type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5"  r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
        </svg>
      </button>
      <ul class="overflow-menu__dropdown" role="menu" aria-label="Entry options">
        <li>
          <button class="overflow-menu__item" role="menuitem" data-action="edit">Edit</button>
        </li>
        <li>
          <button class="overflow-menu__item overflow-menu__item--danger" role="menuitem" data-action="delete">Delete</button>
        </li>
      </ul>
    </div>` : ''}
  `;

  // Wire overflow menu
  if (editable) {
    const menu = li.querySelector('.overflow-menu');
    wireOverflowMenu(menu);

    menu.querySelector('[data-action="edit"]').addEventListener('click', () => {
      closeAllOverflowMenus();
      openEntryModal('edit', entry);
    });

    menu.querySelector('[data-action="delete"]').addEventListener('click', () => {
      closeAllOverflowMenus();
      const container = document.getElementById('entry-list');
      if (container) {
        container.classList.add('selection-mode');
        const cb = li.querySelector('.js-entry-select');
        if (cb) {
          cb.checked = true;
          cb.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });

  }

  // Allow clicking anywhere on the row to toggle selection (when in selection mode)
  li.addEventListener('click', (e) => {
    const container = document.getElementById('entry-list');
    if (!container || !container.classList.contains('selection-mode')) return;

    // Don't double-trigger if they actually clicked the checkbox itself
    if (e.target.classList.contains('js-entry-select')) return;

    // Ignore clicks on overflow menu buttons (just in case they are visible)
    if (e.target.closest('.overflow-menu')) return;

    const cb = li.querySelector('.js-entry-select');
    if (cb) {
      cb.checked = !cb.checked;
      cb.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  return li;
}

/* ============================================================
   LABEL METADATA — symbols and CSS class suffixes
   Keeps symbol ↔ label mapping in one place.
   ============================================================ */
const LABEL_META = {
  positive: { symbol: '+', label: 'Positive' },
  negative: { symbol: '−', label: 'Negative' },
  neutral:  { symbol: '=', label: 'Neutral'  },
};

/* ============================================================
   SIDEBAR — date list for the last 14 days
   TODO: consider replacing with a real calendar picker widget later.
   ============================================================ */

/* ============================================================
   SIDEBAR — Calendar Widget
   ============================================================ */
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth(); // 0-indexed

function buildSidebar() {
  wireCalendarControls();
  renderCalendar();
}

function wireCalendarControls() {
  const prevBtn = document.getElementById('cal-prev-month');
  const nextBtn = document.getElementById('cal-next-month');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      calendarMonth--;
      if (calendarMonth < 0) {
        calendarMonth = 11;
        calendarYear--;
      }
      renderCalendar();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      calendarMonth++;
      if (calendarMonth > 11) {
        calendarMonth = 0;
        calendarYear++;
      }
      renderCalendar();
    });
  }

  const todayBtn = document.getElementById('cal-go-today');
  if (todayBtn) {
    todayBtn.addEventListener('click', () => {
      // Go to today's date in calendar and fetch entries
      calendarYear = new Date().getFullYear();
      calendarMonth = new Date().getMonth();
      fetchTodayEntries();
    });
  }
}

function renderCalendar() {
  const monthTitle = document.getElementById('cal-month-title');
  const daysGrid = document.getElementById('calendar-days-grid');
  if (!monthTitle || !daysGrid) return;

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  monthTitle.textContent = `${monthNames[calendarMonth]} ${calendarYear}`;
  daysGrid.innerHTML = '';

  const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();
  const lastDay = new Date(calendarYear, calendarMonth + 1, 0).getDate();

  // Padding empty cells
  for (let i = 0; i < firstDayIndex; i++) {
    const emptyCell = document.createElement('div');
    daysGrid.appendChild(emptyCell);
  }

  const today = new Date();
  const todayStr = toISODateString(today);
  const activeVal = currentViewDate === 'today' ? todayStr : currentViewDate;

  for (let day = 1; day <= lastDay; day++) {
    const dObj = new Date(calendarYear, calendarMonth, day);
    const dateStr = toISODateString(dObj);
    const isFuture = dObj > today;
    
    let isBeforeCreation = false;
    if (userAccountCreatedAt) {
      const createdDateStr = toISODateString(new Date(userAccountCreatedAt));
      if (dateStr < createdDateStr) {
        isBeforeCreation = true;
      }
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = day;
    btn.className = 'cal-day-btn';
    btn.dataset.date = dateStr;

    // Calendar day styles
    btn.style.width = '100%';
    btn.style.aspectRatio = '1';
    btn.style.borderRadius = '50%';
    btn.style.fontSize = '0.8125rem';
    btn.style.fontWeight = '600';
    btn.style.border = 'none';
    btn.style.background = 'none';
    btn.style.cursor = 'pointer';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.transition = 'background 0.2s, color 0.2s';

    if (isFuture || isBeforeCreation) {
      btn.style.opacity = '0.25';
      btn.style.cursor = 'not-allowed';
      btn.disabled = true;
      if (isBeforeCreation) {
         // optional: add a title to explain why it's disabled
         btn.title = "Before account creation";
      }
    } else {
      if (dateStr === todayStr) {
        btn.style.border = '1.5px solid var(--moss)';
      }
      if (dateStr === activeVal) {
        btn.style.background = 'var(--moss)';
        btn.style.color = 'var(--white)';
        btn.style.fontWeight = '700';
      } else {
        btn.addEventListener('mouseenter', () => {
          if (btn.style.background === 'none' || btn.style.background === '') {
            btn.style.background = 'var(--stone)';
          }
        });
        btn.addEventListener('mouseleave', () => {
          if (btn.style.background === 'var(--stone)') {
            btn.style.background = 'none';
          }
        });
      }

      btn.addEventListener('click', () => {
        if (dateStr === todayStr) {
          fetchTodayEntries();
        } else {
          fetchEntriesForDate(dateStr);
        }
      });
    }

    daysGrid.appendChild(btn);
  }
}

function updateSidebarActiveDate(dateValue) {
  // Sync calendar month/year viewport to match selected historical date if month changes
  if (dateValue && dateValue !== 'today') {
    const parts = dateValue.split('-');
    if (parts.length === 3) {
      calendarYear = parseInt(parts[0], 10);
      calendarMonth = parseInt(parts[1], 10) - 1;
    }
  } else if (dateValue === 'today') {
    calendarYear = new Date().getFullYear();
    calendarMonth = new Date().getMonth();
  }
  renderCalendar();
}

/* ============================================================
   ADD / EDIT ENTRY MODAL
   ============================================================ */

let _entryModalMode  = 'create'; // 'create' | 'edit'
let _editingEntryId  = null;

/**
 * Opens the entry modal in create or edit mode.
 * @param {'create'|'edit'} mode
 * @param {object|null}     entry  — required for edit mode
 */
function openEntryModal(mode, entry = null) {
  _entryModalMode  = mode;
  _editingEntryId  = entry ? entry._id : null;

  const titleEl   = document.getElementById('entry-modal-title');
  const submitBtn = document.getElementById('entry-submit-btn');
  const noteInput = document.getElementById('input-entry-note');
  const serverErr = document.getElementById('entry-server-error');

  // Reset state
  clearEntryServerError();
  if (serverErr) serverErr.classList.remove('visible');

  if (mode === 'edit' && entry) {
    if (titleEl)   titleEl.textContent   = 'Edit Entry';
    if (submitBtn) submitBtn.textContent = 'Save Changes';
    if (noteInput) noteInput.value       = entry.note;

    // Pre-select the label in the label picker
    const radio = document.querySelector(`input[name="entry-label"][value="${entry.label}"]`);
    if (radio) radio.checked = true;

    if (submitBtn) submitBtn.disabled = false;
  } else {
    if (titleEl)   titleEl.textContent   = 'Add Entry';
    if (submitBtn) submitBtn.textContent = 'Add Entry';
    if (noteInput) noteInput.value       = '';

    // Default label to 'positive'
    const radio = document.querySelector('input[name="entry-label"][value="positive"]');
    if (radio) radio.checked = true;

    if (submitBtn) submitBtn.disabled = false;
  }

  // Open the shared modal — defined in main.js
  openModal('entry-modal-overlay', document.getElementById('open-entry-modal-btn'));
}

function wireEntryModal() {
  const overlay   = document.getElementById('entry-modal-overlay');
  if (!overlay) return;

  const closeBtn  = document.getElementById('entry-modal-close-btn');
  const form      = document.getElementById('entry-form');
  const noteInput = document.getElementById('input-entry-note');
  const submitBtn = document.getElementById('entry-submit-btn');
  const serverErr = document.getElementById('entry-server-error');

  // Close button
  if (closeBtn) closeBtn.addEventListener('click', () => closeModal('entry-modal-overlay'));

  // Removed: Don't disable submit on empty input, allow user to click so they see the error message.

  // Form submit
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearEntryServerError();

      const note  = noteInput.value.trim();
      const label = document.querySelector('input[name="entry-label"]:checked')?.value;

      if (!note)  return showEntryFieldError('Note cannot be empty.');
      if (!label) return showEntryFieldError('Please select a label.');

      submitBtn.disabled   = true;
      submitBtn.textContent = _entryModalMode === 'edit' ? 'Saving…' : 'Adding…';

      try {
        if (_entryModalMode === 'edit') {
          await editEntry(_editingEntryId, note, label);
        } else {
          await createEntry(note, label);
        }
        closeModal('entry-modal-overlay');
      } catch (err) {
        submitBtn.disabled   = false;
        submitBtn.textContent = _entryModalMode === 'edit' ? 'Save Changes' : 'Add Entry';
        showEntryServerError(err.message);
      }
    });
  }

  // Open-modal button
  const openBtn = document.getElementById('open-entry-modal-btn');
  if (openBtn) {
    openBtn.addEventListener('click', () => openEntryModal('create'));
  }
}

function showEntryFieldError(msg) {
  const el = document.getElementById('entry-note-error-text');
  const box = document.getElementById('error-entry-note');
  if (el)  el.textContent  = msg;
  if (box) box.style.display = 'flex';
}

function showEntryServerError(msg) {
  const el = document.getElementById('entry-server-error');
  if (el) {
    el.textContent = msg;
    el.classList.add('visible');
  }
}

function clearEntryServerError() {
  const el = document.getElementById('entry-server-error');
  if (el) el.classList.remove('visible');
  const noteErr = document.getElementById('error-entry-note');
  if (noteErr) noteErr.style.display = 'none';
}

/* ============================================================
   DELETE CONFIRMATION
   ============================================================ */

function openConfirmDeleteEntry(entryId, notePreview) {
  const titleEl  = document.getElementById('confirm-delete-title');
  const bodyEl   = document.getElementById('confirm-delete-body');
  const cancelBtn = document.getElementById('confirm-delete-cancel-btn');
  const confirmBtn = document.getElementById('confirm-delete-confirm-btn');

  if (titleEl) titleEl.textContent = 'Delete this entry?';
  if (bodyEl)  bodyEl.textContent  = `"${notePreview.slice(0, 60)}${notePreview.length > 60 ? '…' : ''}" will be permanently removed. This cannot be undone.`;

  // Remove previous listener by cloning the button
  const newConfirm = confirmBtn.cloneNode(true);
  newConfirm.disabled = false;
  newConfirm.textContent = 'Delete';
  confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);

  newConfirm.addEventListener('click', async () => {
    newConfirm.disabled     = true;
    newConfirm.textContent  = 'Deleting…';
    try {
      await deleteEntry(entryId);
      closeModal('confirm-delete-overlay');
    } catch (err) {
      showMainError(err.message);
      closeModal('confirm-delete-overlay');
    }
  });

  cancelBtn.addEventListener('click', () => closeModal('confirm-delete-overlay'), { once: true });

  openModal('confirm-delete-overlay', document.getElementById('open-entry-modal-btn'));
}

/* ============================================================
   OVERFLOW MENUS — entry kebab menus
   (mirrors the pattern from dashboard/identity pages)
   ============================================================ */

function wireOverflowMenu(menu) {
  if (!menu) return;
  const trigger  = menu.querySelector('.overflow-menu__trigger');
  const dropdown = menu.querySelector('.overflow-menu__dropdown');
  if (!trigger || !dropdown) return;

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = menu.classList.contains('is-open');
    closeAllOverflowMenus();
    if (!isOpen) {
      menu.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      // Focus the first menu item for keyboard users
      const first = dropdown.querySelector('[role="menuitem"]');
      if (first) first.focus();
    }
  });

  // Close on Escape
  dropdown.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllOverflowMenus();
      trigger.focus();
    }
  });
}

function closeAllOverflowMenus() {
  document.querySelectorAll('.overflow-menu.is-open').forEach(m => {
    m.classList.remove('is-open');
    const t = m.querySelector('.overflow-menu__trigger');
    if (t) t.setAttribute('aria-expanded', 'false');
  });
}

/* ============================================================
   LOADING + ERROR STATE HELPERS
   ============================================================ */

function setMainLoading(on) {
  const spinner = document.getElementById('main-loading');
  if (spinner) spinner.style.display = on ? 'flex' : 'none';
}

function showMainError(msg) {
  const el = document.getElementById('main-error');
  if (el) {
    el.textContent = msg;
    el.classList.add('visible');
  }
}

function showSidebarError(msg) {
  const el = document.getElementById('sidebar-error');
  if (el) {
    el.textContent = msg;
    el.classList.add('visible');
    // Auto-clear after 4 seconds — it's informational, not blocking
    setTimeout(() => el.classList.remove('visible'), 4000);
  }
}

/* ============================================================
   DATE UTILITIES
   TODO: all date formatting uses the browser's local timezone.
   When the user's stored timezone preference is wired from the backend,
   replace new Date() usage here with timezone-aware equivalents.
   ============================================================ */

/** Returns "YYYY-MM-DD" for a given Date object in local time */
function toISODateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** "Aug 1, 2026" */
function formatDateLong(date) {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/** "Aug 1" */
function formatDateShort(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Minimal HTML escape — prevents XSS when injecting user content as innerHTML */
function escSC(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ============================================================
   INIT — runs only on scorecard.html
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Guard: only run on scorecard.html (checks for the page's root element)
  if (!document.getElementById('scorecard-page')) return;
  if (!requireAuth()) return;

  // Build the sidebar date list (static structure, no API needed)
  buildSidebar();

  // Wire the modal form (add / edit entry)
  wireEntryModal();

  // Close overflow menus when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.overflow-menu')) closeAllOverflowMenus();
  });

  const entryList = document.getElementById('entry-list');
  if (entryList) {
    initMultiSelect({
      containerEl: entryList,
      checkboxSelector: '.js-entry-select',
      actionBarId: 'scorecard-action-bar',
      countId: 'scorecard-select-count',
      cancelBtnId: 'scorecard-cancel-select-btn',
      deleteBtnId: 'scorecard-delete-selected-btn',
      itemNoun: 'entry',
      onDelete: async (ids) => {
        try {
          await apiRequest('/scorecard', {
            method: 'DELETE',
            body: JSON.stringify({ entryIds: ids })
          });
          todayEntries = todayEntries.filter(e => !ids.includes(e._id));
          renderTodayEntries();
        } catch (err) {
          showMainError(err.message || 'Failed to delete selected entries.');
        }
      }
    });
  }

  // Load today's entries — the initial happy path
  fetchTodayEntries();
});
