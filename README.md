# NTAREI Check-In — Phase 1

A small offline-first Progressive Web App (PWA) that replaces the paper clipboard for
attendee check-in at NTAREI meetings. Each tablet runs independently: attendees fill out
a sign-in form, review every answer, and press FINISHED to save. The completion screen
asks them to hand the tablet to staff, who reset it for the next person. All data stays on the tablet in IndexedDB until staff explicitly export a CSV.

There is no server, no login, no sync between tablets, and no network calls at runtime.

## Requirements

- A modern browser (Safari on iPadOS, or Chrome on Android/desktop).
- [Node.js](https://nodejs.org/) 18+ — only needed to run a local static file server for
  development and to run the automated test suite. Not required to actually use the app.

## Project structure

```
index.html              Form, review, completion, and staff views
manifest.webmanifest     PWA install metadata
service-worker.js        Caches the app shell for offline use
src/
  app.js                 View logic, validation, wiring
  db.js                  IndexedDB persistence (attendee records)
  export.js               CSV serialization + download
  styles.css              Portrait-first tablet styling
icons/                   App icons (PNG)
tests/                    Automated tests (node:test)
```

## Local development

Service workers and IndexedDB require the page to be served over `http://` or `https://`
(not opened directly as a `file://` URL). Serve the folder with any static file server,
for example:

```bash
npx --yes serve -l 8080 .
```

or the shortcut already wired up in `package.json`:

```bash
npm run serve
```

Then open `http://localhost:8080/` in a desktop browser (or on a tablet on the same
network, using your computer's LAN IP) to try the app before testing on-device.

## Running automated tests

```bash
npm install   # one-time; installs development/test dependencies
npm test
```

Tests cover:

- CSV export: header order, comma/quote/line-break escaping, `first_time` Yes/No mapping,
  empty-record-set output.
- IndexedDB persistence: save-then-read, record counting, upsert-by-`record_id` (no
  duplicate rows when a record is re-saved), persistence across a simulated connection
  close/reopen, and `clearAllRecords` (deletes everything, is a no-op on an empty store,
  and doesn't disturb records saved afterward).

`fake-indexeddb` is a dev-only test dependency — it is never loaded by the app itself and
is not part of the offline runtime.

## Installing on a tablet

### iPad Mini (Safari) — step by step

1. Connect the iPad Mini to Wi-Fi.
2. Open Safari (not Chrome or another browser — "Add to Home Screen" installs a real
   standalone PWA only from Safari on iOS/iPadOS) and go to the app's URL.
3. Wait for the page to fully finish loading before continuing — this is the load that
   lets the service worker download and cache every app-shell file for offline use.
4. Tap the **Share** icon (square with an arrow, in the address bar).
5. Scroll down and tap **Add to Home Screen**, then tap **Add**.
6. Close Safari. From the Home Screen, launch the app by tapping its new **NTAREI
   Check-In** icon — it opens full-screen, with no Safari address bar or tabs.
7. With the app still open, swipe up (or double-click the side button, depending on the
   iPad Mini's iPadOS version) to confirm no other copy of the app/tab is running, so the
   test below is against the standalone Home Screen app, not a leftover browser tab.

### Android tablet (Chrome)

1. While connected to Wi-Fi, open the app's URL in Chrome once.
2. Open Chrome's menu and choose **Add to Home screen** / **Install app**.
3. Launch the app from the Home Screen icon.

## Updating the app after a code change

You do **not** need to redo "Add to Home Screen" after every change — that step only
creates the Home Screen icon once. Content updates (new fields, wording, layout, etc.)
reach an already-installed tablet like this:

1. Deploy the updated files (e.g. push to whatever is hosting the app's URL).
2. On the tablet, connect to Wi-Fi and open the app at least once. In the background,
   the browser fetches the new `service-worker.js`; if it's different from what's
   installed, the new version downloads and caches all the updated app-shell files.
3. Fully close the app (swipe it away in the app switcher) and relaunch it from the
   Home Screen icon. The relaunch is what actually swaps in the new version — simply
   leaving the old page open, or a plain in-app reload, may still show the old version
   until the next full relaunch.
4. Open the **Staff** panel and check the record count is unchanged, to confirm no data
   was affected by the update.

Practical takeaway: before an event, open the app once on Wi-Fi (even if you don't
expect changes) and fully relaunch it, so the tablet is guaranteed to be running the
latest version before it goes offline for the day.

## Testing offline operation

1. Install the app as described above while online, and confirm it opens successfully at
   least once (this lets the service worker cache the app shell).
2. Turn on Airplane Mode (or otherwise disable Wi-Fi and cellular data) on the tablet.
3. Fully close the app and relaunch it from the Home Screen icon.
4. Confirm the sign-in form loads, and that you can complete an attendee record, view the
   handoff screen, and tap **NEXT ATTENDEE** — all without a network connection.
5. Close and reopen the app again (still offline) and confirm previously entered records
   are still counted in the Staff panel.

Reopening the app never destroys existing records: the service worker only ever adds a
fixed, known list of app-shell files to its cache and never touches IndexedDB, and the
app's IndexedDB code only creates its one object store the first time it's needed — it
never deletes or recreates it on a later open. The only way stored records are ever
deleted is the explicit, confirmed **Clear All Data** action described below.

## Exporting attendee records (CSV)

1. Tap **Staff** in the top-right corner of the header to open the staff panel.
2. Confirm the displayed record count matches what you expect.
3. Tap **Export CSV**. The browser will download a file named
   `ntarei-checkin-export.csv` containing every record stored on that tablet.
4. Each tablet's CSV is independent. Combine exports from multiple tablets afterward in a
   spreadsheet if needed — this app does not merge tablets itself.

CSV columns (in order): `record_id, created_at, first_name, last_name, email, zip,
first_time, source, source_other, meeting_id, meeting_name`. Commas, quotes, and line breaks inside a field are
escaped per RFC 4180 so the file opens correctly in Excel or Numbers.

## SAFE procedure: export test data, then clear it before live use

Before handing a tablet to real attendees, export whatever test data is on it and then
wipe it. The app requires an explicit staff action *and* a separate confirmation step
before anything is deleted — there is no one-tap way to lose data. On the confirmation
screen, **Delete all** stays disabled until you've tapped **Download Backup CSV** —
that backup is a required, separate tap rather than an invisible automatic download, so
you can actually confirm it happened instead of having to trust it silently worked.

1. Tap **Staff** in the top-right corner of the header to open the staff panel.
2. Confirm **Records saved** shows the number of test records you expect.
3. Tap **Export CSV** and confirm the download completes (see *Exporting attendee
   records* above). Open the file and spot-check it if this is the final check before
   an event.
4. Tap **Clear All Data…**. The panel switches to a red confirmation screen stating
   exactly how many records will be permanently deleted. **Delete all** is greyed out
   at this point — it isn't tappable yet.
5. Tap **Download Backup CSV**. Confirm the download completes (check your browser's
   downloads for a fresh `ntarei-checkin-backup-<date>_<time>.csv`, separate from
   whatever you exported in step 3). Once it succeeds, a green "Backup downloaded" line
   appears and **Delete all** becomes tappable.
6. Tap **Delete all** to proceed, or **Cancel** to back out without changing anything.
7. After deleting, the panel returns to the default view and **Records saved** should
   read **0**. Close and reopen the staff panel (or the app) to double-check the count
   stuck.

If you back out with **Cancel** and reopen **Clear All Data…** again later, you'll need
to tap **Download Backup CSV** again — the unlock doesn't persist, so a stale backup
from an earlier attempt can't be mistaken for a current one.

This is the only way records are ever deleted — closing the app, reopening it, losing
Wi-Fi, or the service worker updating in the background can never remove a saved record.

If you need a harder reset (e.g. to also clear the installed service worker/cache, not
just attendee records — not normally necessary), use the browser's own site data
controls instead:

- **iPad Safari:** Settings app → Safari → Advanced → Website Data → find the app's site
  → swipe to delete. (Or Settings → Safari → Clear History and Website Data, which clears
  more broadly.)
- **Android Chrome:** Chrome menu → Settings → Site settings → find the app's site →
  Clear & reset.

## Release 1 acceptance checklist

Run on the target iPad Safari and Android Chrome tablets before an event:

1. Prepare the app online, close it, enable Airplane Mode, and relaunch from Home Screen.
2. Confirm **MORE QUESTIONS BELOW ↓ / Swipe up to continue** stays visible until the
   bottom of the form, then disappears. Repeat in both orientations and with the keyboard.
3. Try an incomplete form. Validation must prevent review; the saved count and CSV must
   not include it.
4. Complete every field, including the first-time checkbox and Other text. Tap
   **REVIEW MY INFORMATION**. Verify all answers; the saved count must still be unchanged.
5. Tap **EDIT**. Verify every answer is preserved. Change one and review again.
6. Tap **FINISHED**. Confirm one saved record and the large hand-to-staff message.
7. Staff selects **NEXT ATTENDEE** below the completion message. Verify the form is blank
   and previous staff details are closed.
8. Enter several more attendees. In **Staff → Meeting Registrations**, search by name
   and email and open different entries. They must be read only, with no change to the
   current form or saved records. Closing Staff clears lookup details.
9. Verify **View Last Entry**, record count, CSV download, and backup-before-clear controls.
10. Close and reopen offline. Verify saved records persist and CSV punctuation is correct.
    Use the backup and clear procedure above to remove test data before live use.

### Meeting setup and use across midnight

The first launch of this update asks staff for a **Meeting Name**. A blank or missing
name keeps the setup prompt open and prevents check-in. The name and a generated meeting
identifier are remembered on this tablet across reloads, offline restarts, and midnight.
The active name is displayed above the form. There is no automatic daily reset.

Use **Staff → Start New Meeting** before the next event. It opens a blank name prompt;
Cancel keeps the existing meeting. Finish any current registration and select NEXT
ATTENDEE first to avoid moving a draft to a different meeting. Each new meeting receives
a fresh identifier even if staff reuse the same name. Tablets remain independent.

Meeting Registrations shows all saved entries for the active identifier, regardless of
their calendar dates. Existing records without a meeting identifier remain unchanged and
available through all-record CSV export and View Last Entry; no meeting is inferred from
their dates. CSV retains its original nine columns in order and appends `meeting_id` and
`meeting_name` (blank for legacy records). Consumers expecting exactly nine columns need
to accept the two new columns. Clearing attendee data does not reset the active meeting.
The existing Staff panel remains the staff access boundary; no password or accounts are
introduced.

### Automated browser check

```bash
npx playwright install chromium  # once, if using Playwright’s bundled browser
npm run test:browser
```

For an existing Chrome installation, set `NTAREI_CHROME_PATH` to its executable instead.
The browser check uses a local Python 3 static server on port 8080. It prepares the
service worker, switches offline, reloads, checks review/edit/finish, reload persistence,
read-only staff lookup, last entry, meeting setup, cross-midnight grouping, new-meeting
isolation, and the downloaded CSV at a 768 × 1024 tablet viewport.
`npm test` also checks all-field edit preservation, draft exclusion from exports,
duplicate FINISHED clicks, date filtering, safe text rendering, and lookup isolation.
All test libraries are development-only; the app has no new runtime dependencies.

## Deferred database release

No database schema, historical import, or contact integration changes are included here.
For the later separate database branch: Constant Contact exports populate People/contact
records only, retaining original added dates when present. They never establish attendance.
Only actual historical Check-In CSVs establish meeting attendance.

### Management app: assign meetings to legacy check-ins

The next release must support reviewed assignment of `meeting_id` and `meeting_name`
to existing check-in records that lack them. During import, staff selects or creates the
meeting for each historical Check-In CSV, previews the affected records, and confirms
before assignment. Preserve original record identifiers, submission timestamps, and
attendee answers. Do not overwrite an existing meeting assignment silently or infer a
meeting solely from a calendar date (a meeting can span midnight). An unmapped record
remains explicitly unassigned until staff resolves it. Constant Contact contact imports
must never enter this attendance-assignment process or create attendance history.
