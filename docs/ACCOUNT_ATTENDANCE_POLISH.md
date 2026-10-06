# Account, loading and attendance follow-up — October 6, 2026

Branch: `practo/testing-platform`. Base: Carl's `bbee8f4` update, fetched before implementation. Carl's login screen, `public/logo.svg` and intern-detail layout were retained; the intern detail receives only the correction-review panel/import. Publishing is authorized after the listed checks pass. No other branch is in scope.

## Reviewed scope and implementation

| Area | Result |
| --- | --- |
| Passwords | All three profile pages use `shared/change-password-card.tsx`. Current password, matching confirmation and existing server password requirements are enforced. Saving locks duplicate submissions; failures retain the entered fields and display a real error. Success appears only after persistence. |
| Account control | Coordinators retain provisioning, role management, disabling and reset access. No QR login, old-password viewer, public account registration or periodic password-change requirement was added. Stable profile/User IDs remain; the current sign-in identifier is email. |
| Sessions | Password changes invalidate other sessions and issue a fresh cookie to the current browser. Normal profile changes preserve the current view; invited accounts still pass through first-login activation. A transaction rechecks the account status/hash so a concurrent disable/reset cannot be overridden by a stale password change. |
| Reset UX | Searchable user directory; reset-access wording and confirmation explain replacement of old credentials. Confirmations wait for async persistence and lock repeated presses. Newly generated credentials are revealed only after server confirmation; reset dialogs are correctly labeled. Clipboard failures tell the coordinator to copy manually. |
| Mobile user management | Account action menus are now available inside mobile user cards, using non-button card markup. Keyboard actions inside data-table cards do not trigger parent-row navigation. |
| Loading | Small neutral status and reduced-motion-aware spinner; no logo, giant placeholder blocks, artificial progress percentages or deliberate delays. Both initial session loading and lazy workspace loading use it. Existing session-error/retry handling remains available. |
| Branding | Practo name and logo removed from the authenticated header, and duplicate footer branding removed. Login branding and browser-tab SVG metadata remain intact. School identity and signed-in user information stay available. |
| Clock persistence | Main clock and active-session banner wait for `flushChanges()` before showing success. Controls lock during saves. Failed offline commands restore the last server-confirmed snapshot even when a refresh cannot reach the server. There is no durable offline-write queue. |
| Connection UX | Offline status is explicit; failed refreshes show reconnect feedback. The status row stays below the sticky header, with an accessible reconnect target. Toasts move away from header controls and above the mobile bottom navigation. The session banner no longer overlaps the header/status row. |
| Long sessions | A running session over 12 hours shows a reminder on the time-clock page. This is a warning, not an automatic clock-out or a deduction. Saved clock-in timestamps still determine elapsed time across tab closure. |
| Corrections | Students request an actual clock-out time with a reason. Only the assigned supervisor can approve or reject it, under Intern Details → Logs. A request does not stop an active timer or change hours. Approval updates the end/duration and recalculates attendance hours; rejection leaves them unchanged. |
| Validation/history | Invalid, future, reversed, overlapping and over-24-hour proposed entries are rejected. One pending request per session; repeat review fails. Requests retain original/proposed clock-out, requester, reviewer, timestamps, reason and decision. Student/supervisor deletion of logs with correction history is blocked. Coordinators retain administrative deletion authority. |
| Additional findings | Removed fake profile-password success behavior and obsolete mock-backend comments. Coordinator company totals and account-created date now use actual records. Mobile reset actions and reconnect overlap were concrete findings from review/testing. |
| Code structure | Shared password and correction UI components; existing domain attendance actions, command schema, scoped permissions and client transport extended in their established locations. No new runtime packages or database migration required: correction history is additive data in the existing JSON school aggregate. |

## Research and decisions

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html): require the current password for credential changes and rotate/invalidate affected sessions; separate personal credentials from administrator account control.
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html): preserve hashed-password storage; do not add an old-password retrieval UI.
- [W3C status-message guidance](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA25): expose actual loading/saving status through accessible status text instead of fake numeric progress.
- Installed Next.js `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md`: keep loading fallbacks tied to pending work. This portal uses one route and lazy role workspaces, so it retains its existing shared loader boundaries.

## Verification

| Command | Final result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm run build` | Pass, fresh production build |
| `npm run lint` | Zero errors; 20 existing initialization warnings |
| `npm test` | 21 passed, zero failures |
| `npm run test:integration` | Pass: existing HTTP/auth/ownership/persistence regressions |
| `npm run test:account-clock` | Pass: all-role passwords, session rotation, reset/activation, scoped correction review/history |
| `npm run test:browser` | Pass: testing access, unchanged login/hero, all roles, exports, themes and account creation |
| `npm run test:account-clock-ui` | Pass: actual loading, passwords, delayed/offline clock saves, 13-hour warning, correction approval, mobile reset and pending lock; no page errors |
| `npm run test:workflow` | Pass: journal writing/save/recovery/review, preferences and modal regressions |
| `npm run test:responsive` | Pass: short/landscape navigation; every role page at 320/390/768px in both themes; coordinator creation/forms/PDF preview |
| `npm run test:pdf` | Pass: seven-page long-content PDF, complete content and in-bounds text |
| `npm run test:login` | Pass: development accounts with older environment defaults, explicit demo opt-out and disabled reset |
| `git diff --check` | Pass |

Checks ran using Node 24.19, installed Next.js 16.3.8, Prisma 6/SQLite and Chromium through Playwright. The new HTTP and browser suites use separate ports 3110 and 3126; the development-login suite keeps 3112.

Verification uses disposable databases and fictional accounts; they do not reset the developer database. New tests are `test:account-clock` (HTTP persistence/permissions) and `test:account-clock-ui` (real browser workflows).

Targeted coverage includes all-role password changes, wrong current password, weak/targeted payload rejection, old-password/session invalidation, reset/activation, student request ownership, assigned-supervisor-only review, approval/rejection/history, repeat review, future/overlap limits, delayed saves, offline clock-out rollback, reconnect placement, mobile account actions and narrow intern tabs.

The existing browser smoke check now asserts a single mobile sign-in layout rather than forcing Carl's latest login into an exact 640px height. Natural vertical scrolling with larger text/content remains acceptable; no second visible mobile hero section or horizontal page overflow is accepted. Reduced-motion testing waits for the browser media-query event before advancing its mocked clock; the login implementation itself is unchanged.

## Iterations and fixes from testing

1. A delayed clock save initially exposed premature optimistic feedback. Clock controls now wait for persistence, and a failed offline command restores the last confirmed snapshot.
2. The reconnect row could overlap the sticky header and a toast. It now sits below the header; toasts use bottom placement with mobile navigation clearance.
3. The coordinator's mobile user cards omitted account actions. Their shared action menu is now available without nested buttons or child-keyboard navigation leaking to the parent row. Browser tests complete a real mobile reset, hold its POST, and verify one request and server-confirmed credential reveal.
4. A production browser run served an older mobile-card bundle despite the updated source. Generated build output was cleared and rebuilt; the focused test then passed against the fresh production bundle. This did not change source files or databases.
5. Existing hero checks were updated to Carl's current mobile design and the browser's asynchronous reduced-motion event; no login source or SVG changes were made.

## Visual evidence

- [Minimal loading screen](screenshots/account-loading-mobile.png)
- [Personal password form](screenshots/account-password-mobile.png)
- [Student correction request, dark](screenshots/account-correction-student-dark.png)
- [Supervisor correction review](screenshots/account-correction-supervisor-mobile.png)
- [Reset confirmation](screenshots/account-reset-confirmation-mobile.png)

No temporary passwords are saved in screenshots or test output.

## Limits and next work

Live AI remains deferred. Wet-signature workflows are unchanged. No QR or password-directory feature is introduced. Correction requests change clock-out only; clock-in corrections, unassigned-student escalation and supervisor reassignment/review history policies require a separate agreed flow. Pending requests currently appear in the student's clock page and assigned supervisor's intern details; there are no new email/push notifications.

Offline saving is not supported. An offline/failed request can still have reached the server before the response was lost; reconnect refreshes the authoritative record, and request IDs protect retries against duplicate writes. The last confirmed display is a recovery view, not evidence of a successful offline command. Active sessions have no automatic stop; warnings do not prove attendance. Corrections update attendance totals, not the narrative or previously submitted journal content.

Tests emulate Chromium viewport widths and device timezone; physical phones, Safari/Firefox device testing and institutional deployment approval are separate. Existing prototype security/hosting limitations in [CONNECTED_PLATFORM.md](CONNECTED_PLATFORM.md) still apply. No universal bug-free or production-readiness claim is made.

After pulling, run `npm ci` if needed and restart the dev server. No database reset is required.
