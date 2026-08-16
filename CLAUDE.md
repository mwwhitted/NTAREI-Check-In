# NTAREI Check-In — Claude Code Project Instructions

## Project purpose

Build **NTAREI Check-In**, a simple Phase 1 progressive web app (PWA) that replaces the paper clipboard used for attendee check-in at NTAREI events.

Optimize for a fast, obvious, reliable check-in experience on shared tablets. Phase 1 is intentionally small. Do not turn it into a broader event-management platform.

## Phase 1 product requirements

- The app must work **offline** after it has been installed or loaded for use.
- The app is **local-only**. Each tablet is an independent device with its own data.
- Store attendee records on the device using **IndexedDB**. Use ordinary local storage only for small, non-record preferences when appropriate.
- Provide an attendee-facing check-in form.
- Do **not** request or store a phone number.
- After submission, show the completed entry in a **read-only staff handoff/review view**.
- Staff must be able to verify the entry without editing it in that handoff view.
- Provide a clear **Next Attendee** action that resets the attendee-facing flow and returns to a fresh blank form.
- Provide a way for staff to export the tablet's locally stored attendee records as a **CSV file**.
- Design primarily for tablet use, with large touch targets, clear states, minimal typing friction, and no accidental exposure of a previous attendee's information during the next check-in.

## Required flow

1. An attendee completes the form on the tablet.
2. The app validates required fields locally.
3. The attendee submits the form.
4. The record is saved locally in IndexedDB.
5. The app displays a read-only summary for staff handoff/review.
6. Staff selects **Next Attendee**.
7. The app clears transient form state and returns to a blank attendee form.

Do not skip the staff handoff step, make the handoff summary editable, or automatically return to the form before staff acknowledges the entry.

## Explicitly out of scope for Phase 1

Do not design, scaffold, partially implement, or add placeholders for any of the following unless the user explicitly changes the scope:

- Phone-number collection
- QR codes or scanning
- Payments, invoicing, or transaction processing
- Preregistration or attendee lookup
- Accounts, authentication, login, roles, or permissions systems
- Cloud storage, a remote database, an API, or a backend
- Cross-device or server synchronization
- Merging data between tablets
- Real-time dashboards or centralized reporting
- Features justified only as preparation for a future phase

Multiple tablets may be used at the same event, but they remain fully independent in Phase 1. CSV files may be handled outside the app; do not build an in-app consolidation workflow.

## Architecture constraints

- Prefer a small, maintainable client-only application.
- The core check-in workflow must not depend on a network connection, remote asset, third-party API, analytics service, or CDN at runtime.
- Cache the application shell and required static assets for offline use through the PWA service worker.
- Treat IndexedDB as the durable source of truth for attendee records on each tablet.
- Do not store attendee records only in component state or `localStorage`.
- Generate CSV exports entirely on-device.
- Keep dependencies minimal and avoid adding infrastructure that Phase 1 does not require.
- Preserve saved records across refreshes, app restarts, and ordinary offline use.

## Privacy and data handling

- Collect only fields that are explicitly required by the product specification or requested by the user.
- Never add a phone-number field.
- Do not transmit attendee data off the tablet.
- Do not add telemetry, analytics, error-reporting services, tracking, or network logging that could disclose attendee data.
- Do not print attendee data to the browser console.
- Clear the prior attendee's visible and transient form data when **Next Attendee** is selected, while retaining the saved IndexedDB record.

## CSV export expectations

- Export all attendee records stored on the current tablet.
- Include a header row and use stable, human-readable column names.
- Escape commas, quotes, and line breaks correctly.
- Use a deterministic column order.
- Include a locally generated submission timestamp unless the user specifies otherwise.
- Do not upload the CSV or its contents anywhere.

## Scope-control rules for Claude Code

- Implement only the requested Phase 1 behavior and the smallest supporting code necessary.
- Before adding a feature, dependency, service, data field, screen, or abstraction, verify that it directly supports a requirement in this file or a later explicit user request.
- If a request conflicts with these instructions, identify the conflict and ask for confirmation before broadening scope.
- Do not infer Phase 2 requirements from possible future needs.
- Do not add speculative extension points, dormant integrations, placeholder buttons, or "coming soon" UI.
- Do not introduce a backend merely to simplify local implementation.
- Prefer straightforward code over generalized frameworks or premature abstractions.
- Keep attendee-facing choices and copy concise. Do not invent business rules, form fields, consent language, or validation rules that have not been specified.
- When requirements are ambiguous, preserve the local-only/offline model and choose the smallest reversible implementation; ask before making a consequential product decision.
- Update this file only when the user explicitly changes the project's requirements or scope.

## Quality bar

- Verify the complete attendee-to-staff-to-next-attendee flow.
- Test offline startup and submission after the app has been prepared for offline use.
- Test persistence after refresh and restart.
- Test multiple sequential attendees without data leaking between sessions.
- Test CSV output with punctuation, quotes, commas, and line breaks in allowed text fields.
- Test empty-state and validation behavior.
- Test the primary flow at common tablet viewport sizes and in the intended orientation(s).
- Keep accessibility fundamentals intact: associated labels, visible focus, usable contrast, touch-friendly controls, and status messages that do not rely on color alone.

## Definition of done for Phase 1

Phase 1 is complete when an attendee can check in on an offline tablet, the record is durably saved only on that tablet, staff can review the submitted entry in a read-only handoff view, staff can start a clean next-attendee flow, and staff can export that tablet's records to a valid CSV—without login, synchronization, preregistration, QR codes, payments, phone-number collection, or any backend service.
