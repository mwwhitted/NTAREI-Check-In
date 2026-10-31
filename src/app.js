import { putRecord, getAllRecords, countRecords, clearAllRecords } from './db.js';
import { downloadCsv, timestampForFilename } from './export.js';
import { isValidEmail } from './validation.js';

const attendeeView = document.getElementById('attendee-view');
const handoffView = document.getElementById('handoff-view');
const completionView = document.getElementById('completion-view');
const finishedBtn = document.getElementById('finished-btn');
let phase = 'setup';
let activeMeeting = null;
const meetingKey = 'ntarei-active-meeting';
let saving = false;
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
const clearDataBackupBtn = document.getElementById('clear-data-backup-btn');
const clearDataBackupStatus = document.getElementById('clear-data-backup-status');
const clearDataBackupPending = document.getElementById('clear-data-backup-pending');

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
  } else if (!isValidEmail(data.email)) {
    setFieldError('email', 'Please enter a valid email, like name@domain.com.');
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
  phase = 'form';
  completionView.hidden = true;
  handoffView.hidden = true;
  attendeeView.hidden = false;
  requestAnimationFrame(updateScrollCue);
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

  phase = 'review';
  attendeeView.hidden = true;
  handoffView.hidden = false;
  updateScrollCue();
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

  if (phase !== 'form' || !activeMeeting) return;
  working = { ...working, ...data };
  announce('');
  showHandoff(working);
});

finishedBtn.addEventListener('click', async () => {
  if (phase !== 'review' || saving || !activeMeeting) return;
  saving = true;
  finishedBtn.disabled = true;
  editBtn.disabled = true;
  try {
    const completed = { ...working, meeting_id: activeMeeting.id, meeting_name: activeMeeting.name, created_at: new Date().toISOString() };
    await putRecord(completed);
    working = completed;
    phase = 'complete';
    handoffView.hidden = true;
    completionView.hidden = false;
    announce('');
    window.scrollTo(0, 0);
    document.getElementById('completion-title').focus({ preventScroll: true });
    refreshRecordCount();
    hideTonight();
  } catch {
    announce('Could not save this record. Please press FINISHED to try again.');
  } finally {
    saving = false;
    finishedBtn.disabled = false;
    editBtn.disabled = false;
  }
});

editBtn.addEventListener('click', () => {
  if (phase !== 'review' || saving || !activeMeeting) return;
  populateFormUI(working);
  showForm();
});

nextAttendeeBtn.addEventListener('click', () => {
  staffPanel.open = false;
  hideLastEntry();
  hideTonight();
  announce('');
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

function resetClearDataBackupState() {
  clearDataBackupStatus.hidden = true;
  clearDataBackupPending.hidden = false;
  clearDataConfirmBtn.disabled = true;
}

function showStaffDefault() {
  clearDataConfirm.hidden = true;
  staffPanelDefault.hidden = false;
  resetClearDataBackupState();
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
    hideTonight();
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
  resetClearDataBackupState();
  staffPanelDefault.hidden = true;
  clearDataConfirm.hidden = false;
  clearDataBackupBtn.focus();
});

clearDataCancelBtn.addEventListener('click', () => {
  showStaffDefault();
});

// Backup is its own explicit, required tap rather than a side effect chained
// onto Delete all. Two reasons: staff can actually see it happened (a silent
// background download is unverifiable), and a lone dedicated click is the
// most reliable way to avoid a browser treating it as an unsolicited
// "automatic" download and quietly blocking it.
clearDataBackupBtn.addEventListener('click', async () => {
  let records = [];
  try {
    records = await getAllRecords();
  } catch (err) {
    announce('Could not read records to back up. Please try again.');
    return;
  }

  if (records.length === 0) {
    announce('There are no records to back up.');
    return;
  }

  try {
    downloadCsv(records, `ntarei-checkin-backup-${timestampForFilename()}.csv`);
  } catch (err) {
    announce('Could not create a backup. Please try again.');
    return;
  }

  clearDataBackupPending.hidden = true;
  clearDataBackupStatus.hidden = false;
  clearDataConfirmBtn.disabled = false;
  clearDataConfirmBtn.focus();
});

clearDataConfirmBtn.addEventListener('click', async () => {
  if (clearDataConfirmBtn.disabled) return;
  try {
    await clearAllRecords();
  } catch (err) {
    announce('Could not clear records. Please try again.');
    return;
  }
  showStaffDefault();
  hideLastEntry();
  hideTonight();
  await refreshRecordCount();
  announce('Backed up and cleared all records from this tablet.');
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

// The cue tracks the form end, not the document end (which includes staff UI).
function updateScrollCue() {
  const viewportBottom = window.visualViewport
    ? window.visualViewport.offsetTop + window.visualViewport.height
    : window.innerHeight;
  document.getElementById('scroll-cue').hidden =
    phase !== 'form' || !activeMeeting || form.getBoundingClientRect().bottom <= viewportBottom + 2;
}
window.addEventListener('scroll', updateScrollCue, { passive: true });
window.addEventListener('resize', updateScrollCue);
window.visualViewport?.addEventListener('resize', updateScrollCue);
window.visualViewport?.addEventListener('scroll', updateScrollCue);
new ResizeObserver(updateScrollCue).observe(form);
requestAnimationFrame(updateScrollCue);

const tonightPanel = document.getElementById('tonight-panel');
const tonightList = document.getElementById('tonight-list');
const tonightDetails = document.getElementById('tonight-details');
const searchInput = document.getElementById('registration-search');
let tonightRecords = [];
let lookupGeneration = 0;
function hideTonight() {
  lookupGeneration++;
  tonightPanel.hidden = true;
  tonightRecords = [];
  tonightList.replaceChildren();
  tonightDetails.replaceChildren();
  tonightDetails.hidden = true;
  searchInput.value = '';
}
function renderTonight() {
  tonightList.replaceChildren();
  tonightDetails.hidden = true;
  tonightDetails.replaceChildren();
  const query = searchInput.value.trim().toLocaleLowerCase();
  const matches = tonightRecords.filter(r =>
    `${r.first_name} ${r.last_name} ${r.email}`.toLocaleLowerCase().includes(query));
  document.getElementById('tonight-status').textContent = matches.length
    ? `${matches.length} registration(s)` : 'No matching registrations for this meeting.';
  for (const record of matches) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn--secondary';
    button.textContent = `${record.first_name} ${record.last_name} — ${record.email}`;
    button.addEventListener('click', () => {
      tonightDetails.replaceChildren();
      const answers = {
        'Name': `${record.first_name} ${record.last_name}`,
        'Email': record.email, 'ZIP code': record.zip,
        'First NTAREI Main Meeting': record.first_time ? 'YES' : 'No',
        'How learned': record.source === 'Other' ? `Other — ${record.source_other || ''}` : record.source,
        'Submitted': new Date(record.created_at).toLocaleString(),
      };
      for (const [label, value] of Object.entries(answers)) {
        const row = document.createElement('div');
        row.className = 'handoff-row';
        const dt = document.createElement('dt');
        const dd = document.createElement('dd');
        dt.textContent = label;
        dd.textContent = value;
        row.append(dt, dd);
        tonightDetails.append(row);
      }
      tonightDetails.hidden = false;
    });
    item.append(button);
    tonightList.append(item);
  }
}
document.getElementById('tonight-btn').addEventListener('click', async () => {
  if (!tonightPanel.hidden) { hideTonight(); return; }
  const generation = ++lookupGeneration;
  try {
    const records = await getAllRecords();
    if (generation !== lookupGeneration || !staffPanel.open) return;
    tonightRecords = records.filter(r => activeMeeting && r.meeting_id === activeMeeting.id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    tonightPanel.hidden = false;
    renderTonight();
    searchInput.focus();
  } catch { announce('Could not load this meeting’s registrations. Please try again.'); }
});
searchInput.addEventListener('input', renderTonight);


const meetingSetup = document.getElementById('meeting-setup');
const meetingName = document.getElementById('meeting-name');
const meetingCancel = document.getElementById('meeting-cancel');
function showMeetingSetup() {
  phase = 'setup';
  attendeeView.hidden = handoffView.hidden = completionView.hidden = true;
  meetingSetup.hidden = false;
  meetingName.value = '';
  meetingCancel.hidden = !activeMeeting;
  document.getElementById('meeting-error').textContent = '';
  staffPanel.open = false;
  hideTonight();
  updateScrollCue();
  window.scrollTo(0, 0);
  meetingName.focus();
}
function displayMeeting() {
  document.getElementById('current-meeting').textContent = `Meeting: ${activeMeeting.name}`;
  meetingSetup.hidden = true;
  showForm();
}
document.getElementById('meeting-form').addEventListener('submit', event => {
  event.preventDefault();
  const name = meetingName.value.trim();
  if (!name) {
    document.getElementById('meeting-error').textContent = 'Please enter the Meeting Name.';
    meetingName.focus();
    return;
  }
  const meeting = { id: generateRecordId(), name };
  try {
    window.localStorage.setItem(meetingKey, JSON.stringify(meeting));
  } catch {
    document.getElementById('meeting-error').textContent = 'Could not remember this meeting on this tablet. Please enable local storage and try again.';
    return;
  }
  activeMeeting = meeting;
  working = newWorkingRecord();
  resetFormUI();
  hideLastEntry();
  hideTonight();
  announce('');
  displayMeeting();
});
meetingCancel.addEventListener('click', () => { if (activeMeeting) displayMeeting(); });
document.getElementById('new-meeting-btn').addEventListener('click', () => {
  const data = collectFormData();
  if (saving || phase === 'review' || phase === 'complete' ||
      Object.values(data).some(value => value !== '' && value !== false)) {
    announce('Please finish this registration and select NEXT ATTENDEE before starting a new meeting.');
    return;
  }
  showMeetingSetup();
});
try {
  const stored = JSON.parse(window.localStorage.getItem(meetingKey));
  if (stored && typeof stored.id === 'string' && stored.id.trim() &&
      typeof stored.name === 'string' && stored.name.trim()) activeMeeting = stored;
} catch { /* Missing, unreadable, or invalid preferences require meeting setup. */ }
if (activeMeeting) displayMeeting();
else showMeetingSetup();
