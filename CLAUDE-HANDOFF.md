# NTAREI Check-In — development handoff to Claude

Prepared October 31, 2026 (America/Chicago).

## Where development stands

Release 1 is implemented and deployed. Continue development in Claude using the existing
repository; do not rebuild the application or replace the working offline release.

- Repository: https://github.com/mwwhitted/NTAREI-Check-In
- Live app: https://mwwhitted.github.io/NTAREI-Check-In/index.html
- Production branch: `main`; GitHub Pages builds/deploys when main is updated.
- Latest application commit at this handoff: `972683b82792961e9bdb8380be5f9b271b7e3a77`.
- Its GitHub Pages deployment completed successfully.
- Work was developed locally on `release-1-ux` and pushed directly to remote `main`.
  No pull request was created. The local branch name does not imply it exists remotely.
- Codex checkout: `/Users/mwhitted/.codex/.chatgpt-projects/g-p-67f5eacbe3fc8191ae410c9606398cbb/NTAREI-Check-In`.
- The user's original Claude checkout may be elsewhere. Inspect its status and preserve
  uncommitted work before bringing in remote main; do not reset or overwrite it.

The user prefers to keep actual development work in Claude. This document is the
handoff, including completed work and requirements for the next release.

## Completed and deployed this evening

| Change | Current behavior / status |
| --- | --- |
| Scroll guidance | Persistent `MORE QUESTIONS BELOW ↓` / `Swipe up to continue` at the visible bottom of the form; disappears when form end is visible and on other screens. |
| Keyboard fix | Cue is lifted above the keyboard using visual viewport height and offset, and responds to resize and scroll/panning. User subsequently said the app looked pretty good; no exhaustive physical-device acceptance has been reported. |
| Review entry point | Bottom form button reads `REVIEW MY INFORMATION →`; required-field validation runs before review. |
| Review screen | Shows name, email, ZIP, first-time status, and how the attendee learned about the meeting, including Other text. |
| EDIT | Returns to the form without losing answers. Review itself does not save. |
| FINISHED | The only attendee-record save action; saves to IndexedDB, guards repeated clicks, and leaves review available for retry on failure. |
| Completion | `You’re All Done!`, saved confirmation, and `Please hand this tablet to the staff.` |
| Next Attendee | Clears transient answers and closes staff lookup before starting a blank form; stays below the completion message. |
| Staff lookup | `Staff → Meeting Registrations`: searchable by name/email, opens any saved registration for the active meeting read-only, separate from the working attendee draft. Closing Staff clears lookup details. |
| Meeting setup | A missing/blank Meeting Name prompts staff and blocks registration until a name is saved. First use of this release has no stored meeting, so setup appears. |
| Meeting persistence | Active meeting stays selected across reloads, offline restarts, and midnight. No calendar-day reset. |
| Start New Meeting | Staff control opens a blank name prompt. Cancel retains the current meeting. A registration in progress must be finished and NEXT ATTENDEE selected before switching. |
| Meeting IDs | Each start generates a fresh identifier, even for reused names. Saved records carry meeting ID and name. |
| CSV | Original nine columns preserved in order; two meeting columns appended. Export still includes all saved records on this tablet, not just the active meeting. |
| Existing controls | Record count, View Last Entry, CSV export, backup-before-clear, and data clearing retained. |
| Update handling | Versioned changed entry assets; service worker refreshes its app shell using requests with `cache: 'reload'` to avoid mixed cached versions. |
| Review instruction styling | User requested larger/red, then larger/BRIGHT red. Final `.handoff-instruction` is `font-size: 1.5rem` (24 CSS px at the default root size), `color: #ff0000`. Latest change is deployed; final visual approval has not been explicitly reported. |

The review message is:

> Please check every answer below. Press EDIT to correct or add anything.
> When everything is correct, press FINISHED to save your registration.

## Important implementation details

- Static browser PWA; no backend, remote attendee storage, accounts, or synchronization.
- Each tablet remains independent. Staff is the existing expandable panel, not an
  authenticated role. No password/security system was added.
- IndexedDB remains `ntarei-checkin`, version 1, object store `attendees`, keyed by
  `record_id`. No database version bump or destructive migration occurred.
- Active meeting is a small local preference in localStorage under
  `ntarei-active-meeting`: JSON `{ id, name }`. Attendee records remain in IndexedDB.
- Records added with this release carry `meeting_id` and `meeting_name` in addition to
  the original fields. Timestamp remains `created_at` in ISO format.
- Old saved records are untouched. They have no meeting assignment and are excluded
  from the active-meeting list, but remain in all-record CSV exports and eligible for
  View Last Entry. No date-based meeting backfill was performed.
- Clearing attendee records does not clear the active meeting preference. Staff must
  explicitly start a new meeting before a subsequent event.
- There is no current UI to rename a meeting or edit a saved attendee record.
- Staff lookup uses textContent, not HTML interpolation, and does not assign a selected
  record to the working registration.
- Current service-worker cache: `ntarei-checkin-v21`.
- Current entry URLs: `src/app.js?v=19`, `src/styles.css?v=21`;
  app.js imports `export.js?v=19`. Mixed version numbers are intentional: only the
  stylesheet changed after the keyboard fix. Keep APP_SHELL synchronized with URLs.
- App updates must never clear IndexedDB or browser site data to refresh assets.

CSV columns, in order:

```text
record_id,created_at,first_name,last_name,email,zip,first_time,source,source_other,meeting_id,meeting_name
```

Legacy rows export blank meeting fields. Consumers expecting exactly nine columns
will need to accept the appended columns.

## Tests performed and their limits

- `npm test`: 24 checks passed after the keyboard fix.
- `npm run test:browser`: three Playwright/Chrome tests passed after the keyboard fix.
- Last two commits changed only review-instruction CSS and related cache versions;
  diff checks passed, but the automated suites were not rerun after those CSS-only edits.
- Tests exercise validation, all-answer EDIT preservation, exclusion of unsaved drafts
  from exports, duplicate FINISHED clicks, blank next-attendee state, read-only staff
  lookup, literal rendering of markup-like names, meeting filtering, offline reload and
  saving, persistence across reload, downloaded CSV content, missing/blank meeting names,
  meeting persistence over midnight, and separation of new meetings with identical names.
- Keyboard test simulates visual viewport shrinking/panning/restoring in desktop Chrome.
  It is not automation of an actual Android on-screen keyboard.
- Deployment checks confirmed successful GitHub Pages builds. Live Meeting Name setup
  was visually verified during deployment. User tested the app on an Android tablet,
  supplied the keyboard issue photograph, and reviewed subsequent appearance changes.
- A complete physical-tablet acceptance run (offline cold start, sequential attendees,
  lookup, persistence, CSV export, and actual-keyboard behavior) has not been reported.

Run checks:

```bash
npm install
npm test
npx playwright install chromium  # if using the bundled Chromium browser
npm run test:browser
```

Alternatively set `NTAREI_CHROME_PATH` to an installed Chrome executable. Browser config
currently launches `/usr/bin/python3 -m http.server 8080 --bind 127.0.0.1`; adjust for the
Claude machine if needed. Dependencies are development-only (`fake-indexeddb`, `jsdom`,
`@playwright/test`). No runtime dependency was added.

## Next release: agreed scope, NOT implemented

Keep database/Management development on a separate feature branch so the deployed
Release 1 remains usable for the next meeting. No database feature branch was created
in this session. A possible branch name discussed was `feature/attendee-database`.

### 1. Management app: reviewed assignment of legacy meetings

The user explicitly requires a way to add meeting information to existing historical
Check-In records when loading them into the next release's Management app.

Documented behavior to implement:

1. Accept actual historical Check-In CSVs, including the old nine-column format without
   `meeting_id` or `meeting_name`, and the new eleven-column format.
2. For legacy records without an assignment, staff selects or creates the correct meeting
   for the source file/import group. Show an affected-record preview before confirmation.
3. Add the selected meeting assignment while preserving original record IDs, submission
   timestamps, and attendee answers. Preserve the raw source as import evidence.
4. Never silently overwrite an existing meeting assignment. Leave unresolved records
   explicitly unassigned until staff resolves them.
5. Do not infer a meeting solely from a calendar date. Meetings and their processing may
   cross midnight. If a file contains multiple meetings, it needs explicit resolution.
6. Do not mistake a contact-import date for a check-in timestamp or attendance date.

The first five points are the documented handoff design for satisfying the user's
legacy-assignment request; the detailed Management UI/schema remains to be designed.
Source preservation is a recommended implementation safeguard, not an implemented feature.

### 2. Constant Contact imports: contacts only

This is an explicit user correction and must be preserved:

- A Constant Contact export may populate People/contact records.
- Retain the original date added when the export supplies it. Do not invent it if absent.
- Being in Constant Contact NEVER proves attendance and must NEVER create attendance
  history, a first-attendance date, or a previous-attendee classification on its own.
- Actual historical Check-In CSV records are evidence that particular people attended
  particular meetings. Only those actual check-ins establish historical attendance.
- The same person may appear in both sources. Linking contacts to people must not turn
  the Constant Contact row itself into attendance evidence.

### 3. Broader future work discussed, still unimplemented

Persistent People/Meetings/Attendance data, offline prior-attendance lookup on tablets,
monthly tablet preparation, post-meeting import into a Management app, person matching,
and duplicate resolution remain future work. Constant Contact and historical exports
have not been loaded or consolidated in this session. No returning-attendee warning or
previous-attendance date display is implemented in Release 1.

### Open design decisions to resolve in Claude

These are implementation questions, not decisions already made:

- Current meeting IDs are generated independently on each tablet. How will Management
  explicitly map multiple tablet IDs to the same real meeting without merging distinct
  events just because their names match? Existing IDs must remain traceable.
- How will repeat imports be detected and made idempotent so attendance is not duplicated?
- How will ambiguous person matches, duplicate contacts, conflicting assignments, and
  missing timestamps be reviewed rather than silently guessed?
- What source/provenance fields and audit history should be retained for imported data?
- What happens when a source file includes records from several meetings?
- How will future prepared tablet data coexist with the current active-meeting preference
  and existing saved check-ins without data loss?

Suggested acceptance cases for the next release: legacy CSV assignment; both sides of
midnight in one meeting; multiple tablets in one real meeting; identical names for two
different meetings; repeated import; conflicting existing IDs; unresolved rows; mixed
legacy/new CSVs; Constant Contact-only contact with original added date and ZERO attendance;
and a person present in both contact and actual Check-In sources.

## Existing project instructions that need reconciliation

The repository's `CLAUDE.md` still describes the original Phase 1 flow (save first, then
handoff) and excludes attendee lookup. It was not edited in this session. Later explicit
user requests authorized the review-before-save flow, read-only saved-registration lookup,
and meeting identification implemented here. Preserve that delivered behavior. Update
Claude's project instructions deliberately to reflect these later requirements before
using the older text as the specification for further changes.

Continue to preserve the local/offline model, no phone-number collection, no analytics
or transmission of attendee data, safe exports, and separation of future database work
from the stable deployed app unless the user explicitly changes those requirements.

## Commit trail from this evening

| Commit | Change |
| --- | --- |
| `072e6d2` | Review/save/completion flow, searchable staff list, persistent meeting grouping, exports, tests, README and future import requirements |
| `a213c76` | Versioned entry assets and reliable app-shell refresh |
| `ba20304` | Scroll cue above on-screen keyboard; viewport regression coverage |
| `0b92fdd` | Larger dark-red review instructions |
| `972683b` | Final larger bright-red review instructions |

## Suggested first prompt when resuming in Claude

Read CLAUDE-HANDOFF.md and README.md, inspect the current checkout and remote main,
and reconcile CLAUDE.md with the later user-approved Release 1 requirements. Preserve
local work and the deployed release. Start a separate branch for the Management/database
release. First propose the legacy meeting-assignment/import and contact-versus-attendance
data model, including cross-tablet meeting mapping and repeat-import handling. Do not
infer attendance from Constant Contact, and do not deploy database changes over Release 1
without the user's instruction.
