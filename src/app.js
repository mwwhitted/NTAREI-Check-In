import { putRecord, getAllRecords, countRecords, clearAllRecords } from './db.js';
import { downloadCsv } from './export.js';

const attendeeView = document.getElementById('attendee-view');
const handoffView = document.getElementById('handoff-view');
const form = document.getElementById('attendee-form');

const firstNameInput = document.getElementById('first-name');
const lastNameInput = document.getElementById('last-name');
const emailInput = document.getElementById('email');
const zipInput = document.getElementById('zip');
const firstTimeInput = document.getElementById('first-time');
const sourceOtherInput = document.getElementById('source-other-text');
const statusMessage = document.getElementById('status-message');

const editBtn = document.getElementById('edit-btn');
const nextAttendeeBtn = document.getElementById('next-attendee-btn');
const exportBtn = document.getElementById('export-csv-btn');
const recordCountEl = document.getElementById('record-count');
const staffPanel = document.getElementById('staff-panel');

const staffPanelDefault = document.getElementById('staff-panel-default');
const clearDataBtn = document.getElementById('clear-data-btn');
const clearDataConfirm = document.getElementById('clear-data-confirm');
const clearDataWarning = document.getElementById('clear-data-warning');
const clearDataCancelBtn = document.getElementById('clear-data-cancel-btn');
const clearDataConfirmBtn = document.getElementById('clear-data-confirm-btn');

const lastEntryBtn = document.getElementById('last-entry-btn');
const lastEntryDetails = document.getElementById('last-entry-details');
const lastEntryEmpty = document.getElementById('last-entry-empty');

function generateRecordId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `rec_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function newWorkingRecord() {
  return {
    record_id: generateRecordId(),
    created_at: null,
    first_name: '',
    last_name: '',
    email: '',
    zip: '',
    first_time: false,
    source: '',
    source_other: '',
  };
}

let working = newWorkingRecord();

function setFieldError(fieldId, message) {
  const errorEl = document.getElementById(`${fieldId}-error`);
  if (!errorEl) return;
  if (message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  } else {
    errorEl.hidden = true;
  }
}

function clearAllErrors() {
  setFieldError('first-name', '');
  setFieldError('last-name', '');
  setFieldError('email', '');
  setFieldError('zip', '');
  setFieldError('source', '');
}

function collectFormData() {
  const sourceRadio = form.querySelector('input[name="source"]:checked');
  return {
    first_name: firstNameInput.value.trim(),
    last_name: lastNameInput.value.trim(),
    email: emailInput.value.trim(),
    zip: zipInput.value.trim(),
    first_time: firstTimeInput.checked,
    source: sourceRadio ? sourceRadio.value : '',
    source_other: sourceRadio && sourceRadio.value === 'Other' ? sourceOtherInput.value.trim() : '',
  };
}

function validate(data) {
  clearAllErrors();
  let valid = true;
  let firstInvalidEl = null;

  if (!data.first_name) {
    setFieldError('first-name', 'First name is required.');
    valid = false;
    firstInvalidEl = firstInvalidEl || firstNameInput;
  }
  if (!data.last_name) {
    setFieldError('last-name', 'Last name is required.');
    valid = false;
    firstInvalidEl = firstInvalidEl || lastNameInput;
  }
  if (!data.email) {
    setFieldError('email', 'Email is required.');
    valid = false;
    firstInvalidEl = firstInvalidEl || emailInput;
  }
  if (!data.zip) {
    setFieldError('zip', 'ZIP code is required.');
    valid = false;
    firstInvalidEl = firstInvalidEl || zipInput;
  }
  if (!data.source) {
    setFieldError('source', 'Please choose one option.');
    valid = false;
    firstInvalidEl = firstInvalidEl || form.querySelector('input[name="source"]');
  }

  return { valid, firstInvalidEl };
}

function resetFormUI() {
  form.reset();
  sourceOtherInput.disabled = true;
  sourceOtherInput.value = '';
  clearAllErrors();
}

function populateFormUI(record) {
  firstNameInput.value = record.first_name;
  lastNameInput.value = record.last_name;
  emailInput.value = record.email;
  zipInput.value = record.zip;
  firstTimeInput.checked = record.first_time;

  const radios = form.querySelectorAll('input[name="source"]');
  radios.forEach((radio) => {
    radio.checked = radio.value === record.source;
  });

  const isOther = record.source === 'Other';
  sourceOtherInput.disabled = !isOther;
  sourceOtherInput.value = isOther ? record.source_other : '';

  clearAllErrors();
}

function showForm() {
  handoffView.hidden = true;
  attendeeView.hidden = false;
  window.scrollTo(0, 0);
  firstNameInput.focus({ preventScroll: true });
}

function showHandoff(record) {
  document.getElementById('handoff-name').textContent = `${record.first_name} ${record.last_name}`;
  document.getElementById('handoff-email').textContent = record.email;
  document.getElementById('handoff-zip').textContent = record.zip;
  document.getElementById('handoff-first-time').textContent = record.first_time ? 'YES' : 'No';

  const sourceText =
    record.source === 'Other' && record.source_other ? `Other — ${record.source_other}` : record.source;
  document.getElementById('handoff-source').textContent = sourceText;

  attendeeView.hidden = true;
  handoffView.hidden = false;
  window.scrollTo(0, 0);
  // preventScroll: focusing EDIT would otherwise scroll it into view, undoing
  // the scrollTo above and reopening the handoff screen mid-page instead of
  // at the top.
  editBtn.focus({ preventScroll: true });
}

async function refreshRecordCount() {
  try {
    const count = await countRecords();
    recordCountEl.textContent = String(count);
  } catch (err) {
    recordCountEl.textContent = '—';
  }
}

function announce(message) {
  statusMessage.textContent = message;
}

form.querySelectorAll('input[name="source"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    const isOther = radio.value === 'Other' && radio.checked;
    sourceOtherInput.disabled = !isOther;
    if (!isOther) sourceOtherInput.value = '';
  });
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const data = collectFormData();
  const { valid, firstInvalidEl } = validate(data);
  if (!valid) {
    if (firstInvalidEl) firstInvalidEl.focus();
    announce('Please complete the required fields.');
    return;
  }

  working = {
    ...working,
    ...data,
    created_at: working.created_at || new Date().toISOString(),
  };

  try {
    await putRecord(working);
  } catch (err) {
    announce('Could not save this record. Please try again.');
    return;
  }

  announce('');
  showHandoff(working);
  refreshRecordCount();
});

editBtn.addEventListener('click', () => {
  populateFormUI(working);
  showForm();
});

nextAttendeeBtn.addEventListener('click', () => {
  working = newWorkingRecord();
  resetFormUI();
  showForm();
});

exportBtn.addEventListener('click', async () => {
  try {
    const records = await getAllRecords();
    downloadCsv(records);
  } catch (err) {
    announce('Could not export records.');
  }
});

function showStaffDefault() {
  clearDataConfirm.hidden = true;
  staffPanelDefault.hidden = false;
}

function hideLastEntry() {
  lastEntryDetails.hidden = true;
  lastEntryEmpty.hidden = true;
}

staffPanel.addEventListener('toggle', () => {
  if (staffPanel.open) {
    refreshRecordCount();
  } else {
    // Always land back on the default staff view next time the panel opens,
    // so a cancelled or completed clear never leaves the confirmation showing,
    // and so "View Last Entry" always requires a fresh tap rather than
    // showing stale data from before.
    showStaffDefault();
    hideLastEntry();
  }
});

function findMostRecentRecord(records) {
  return records.reduce((latest, r) => (!latest || r.created_at > latest.created_at ? r : latest), null);
}

lastEntryBtn.addEventListener('click', async () => {
  const isShowing = !lastEntryDetails.hidden || !lastEntryEmpty.hidden;
  if (isShowing) {
    hideLastEntry();
    return;
  }

  let records = [];
  try {
    records = await getAllRecords();
  } catch (err) {
    announce('Could not load the last entry.');
    return;
  }

  const record = findMostRecentRecord(records);
  if (!record) {
    lastEntryEmpty.hidden = false;
    return;
  }

  document.getElementById('last-entry-name').textContent = `${record.first_name} ${record.last_name}`;
  document.getElementById('last-entry-email').textContent = record.email;
  document.getElementById('last-entry-zip').textContent = record.zip;
  document.getElementById('last-entry-first-time').textContent = record.first_time ? 'YES' : 'No';
  const sourceText =
    record.source === 'Other' && record.source_other ? `Other — ${record.source_other}` : record.source;
  document.getElementById('last-entry-source').textContent = sourceText;
  document.getElementById('last-entry-submitted').textContent = record.created_at
    ? new Date(record.created_at).toLocaleString()
    : '';

  lastEntryDetails.hidden = false;
});

clearDataBtn.addEventListener('click', async () => {
  const count = await countRecords().catch(() => 0);
  if (count === 0) {
    announce('There are no records to clear.');
    return;
  }
  const noun = count === 1 ? 'record' : 'records';
  clearDataWarning.textContent = `Permanently delete all ${count} attendee ${noun} on this tablet?`;
  staffPanelDefault.hidden = true;
  clearDataConfirm.hidden = false;
  clearDataCancelBtn.focus();
});

clearDataCancelBtn.addEventListener('click', () => {
  showStaffDefault();
});

clearDataConfirmBtn.addEventListener('click', async () => {
  try {
    await clearAllRecords();
  } catch (err) {
    announce('Could not clear records. Please try again.');
    return;
  }
  showStaffDefault();
  await refreshRecordCount();
  announce('All records cleared from this tablet.');
});

// If the browser restores this page from the back/forward cache (e.g. staff
// navigated away in a non-standalone browser tab and hit Back), force a
// fresh load rather than showing a paused view that could still contain a
// previous attendee's data.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {
      // Offline-first app still works without the service worker on this load;
      // it will retry registration on a future online visit.
    });
  });
}

resetFormUI();
refreshRecordCount();
