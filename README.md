# NTAREI Check-In — Phase 1

A small offline-first Progressive Web App (PWA) that replaces the paper clipboard for
attendee check-in at NTAREI meetings. Each tablet runs independently: attendees fill out
a sign-in form, staff review it on a read-only handoff screen, then reset for the next
person. All data stays on the tablet in IndexedDB until staff explicitly export a CSV.

There is no server, no login, no sync between tablets, and no network calls at runtime.

## Requirements

- A modern browser (Safari on iPadOS, or Chrome on Android/desktop).
- [Node.js](https://nodejs.org/) 18+ — only needed to run a local static file server for
  development and to run the automated test suite. Not required to actually use the app.

## Project structure

```
index.html              Attendee form + staff handoff screens
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
npm install   # one-time; installs the fake-indexeddb dev/test dependency only
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

CSV columns (in order): `record_id, created_at, first_name, last_name, email, first_time,
source, source_other`. Commas, quotes, and line breaks inside a field are escaped per
RFC 4180 so the file opens correctly in Excel or Numbers.

## SAFE procedure: export test data, then clear it before live use

Before handing a tablet to real attendees, export whatever test data is on it and then
wipe it. The app requires an explicit staff action *and* a separate confirmation step
before anything is deleted — there is no one-tap way to lose data.

1. Tap **Staff** in the top-right corner of the header to open the staff panel.
2. Confirm **Records saved** shows the number of test records you expect.
3. Tap **Export CSV** and confirm the download completes (see *Exporting attendee
   records* above). Open the file and spot-check it if this is the final check before
   an event.
4. Tap **Clear All Data…**. The panel switches to a red confirmation screen stating
   exactly how many records will be permanently deleted and reminding you to export
   first.
5. Tap **Delete all** to proceed, or **Cancel** to back out without changing anything.
6. After deleting, the panel returns to the default view and **Records saved** should
   read **0**. Close and reopen the staff panel (or the app) to double-check the count
   stuck.

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

## iPad Mini acceptance sequence (exact steps)

Run this exact sequence once, start to finish, on the iPad Mini before it's used at a
real event. It covers 30 fake attendees, an app close/reopen, CSV export, and the final
test-data clear.

1. **Install.** Follow *Installing on a tablet → iPad Mini (Safari)* above. Confirm the
   app icon appears on the Home Screen and opens full-screen.
2. **Go offline.** Turn on Airplane Mode. Confirm Wi-Fi and cellular both show off in
   Control Center.
3. **Force-quit and relaunch** the app from the Home Screen icon, so you know this run
   starts from a cold, fully-offline launch — not a paused browser tab.
4. **Enter 30 fake attendees.** For each one:
   - Fill in First name, Last name, and Email (mix in a few with punctuation, e.g.
     `O'Brien`, `Mary-Jane`, and a long name/email, to exercise CSV escaping later).
   - Optionally check "Yes, my first time."
   - Select one "How did you learn about this meeting?" option; for at least 3 of the 30,
     choose **Other** and type a short free-text reason (include a comma and a quote
     character in at least one, e.g. `friend's referral, "loved it"`).
   - Tap **CONTINUE →** and confirm the read-only handoff screen shows exactly what was
     entered, including "RETURN TO STAFF →".
   - Tap **NEXT ATTENDEE** and confirm the form is completely blank before starting the
     next attendee.
   - Every few attendees, open the **Staff** panel and confirm **Records saved** matches
     the count entered so far.
5. **After all 30**, open the **Staff** panel and confirm **Records saved: 30**.
6. **Close and reopen.** Force-quit the app completely (swipe it away in the app
   switcher), relaunch it from the Home Screen — still in Airplane Mode — and open the
   **Staff** panel again. Confirm it still reads **Records saved: 30**.
7. **Export CSV.** Tap **Export CSV**. Open the downloaded file (Files app, or AirDrop it
   to a Mac) and confirm:
   - Exactly 30 data rows, plus one header row.
   - The header reads `record_id,created_at,first_name,last_name,email,first_time,source,source_other`.
   - Names with punctuation and the "Other" free-text entries containing a comma/quote
     appear as single, correctly-formed cells (not split into extra columns).
8. **Clear test data.** Follow *SAFE procedure: export test data, then clear it before
   live use* above: open the **Staff** panel, tap **Clear All Data…**, confirm the
   warning names 30 records, tap **Delete all**.
9. **Verify zero.** Confirm the **Staff** panel now reads **Records saved: 0**. Close and
   reopen the app once more and confirm it still reads **0** — the tablet is now clean
   and ready to hand to the first real attendee.

## Manual test checklist

Run this on both the target iPad (Safari) and an Android tablet (Chrome) before an event.

- [ ] App installs to Home Screen and launches in standalone mode (no browser address bar).
- [ ] With Wi-Fi off, app launches from Home Screen and the sign-in form appears.
- [ ] Required-field validation: submitting with First name, Last name, Email, or a
      "how did you learn" selection missing shows an inline error and does not advance.
- [ ] Selecting "Other" enables the free-text field; selecting any other source disables
      and clears it.
- [ ] CONTINUE shows a read-only handoff screen with the entered name, email, first-time
      status, and source — including "RETURN TO STAFF →".
- [ ] EDIT / BACK returns to the form with all previously entered values intact.
- [ ] NEXT ATTENDEE returns to a **blank** form — no leftover text, checkbox, or radio
      selection from the previous attendee.
- [ ] Enter at least 30 consecutive attendees (mix of short/long names, punctuation in
      names, and "Other" source with free text) without errors or slowdown.
- [ ] Staff panel record count increases as expected and matches the number of attendees
      entered.
- [ ] Fully close the app and reopen it (still offline) — record count is unchanged and
      no data was lost.
- [ ] Export CSV, open it in a spreadsheet app, and confirm the row count matches and
      punctuation/commas/quotes/line breaks in test data render as single, correct cells.
- [ ] Tapping **Clear All Data…** shows a confirmation screen naming the exact record
      count before anything is deleted; **Cancel** leaves all records untouched.
- [ ] Confirming the clear deletes every record, updates the count to 0, and does not
      require any second visit or app restart to take effect.
- [ ] Email field opens the email-optimized keyboard (with `@` and `.` shortcuts).
- [ ] On-screen keyboard does not obscure the field currently being typed into.
- [ ] No horizontal scrolling at any point, in portrait orientation.
- [ ] Two tablets used at once (both offline) keep fully independent record counts.
