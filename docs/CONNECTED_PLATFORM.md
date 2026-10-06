# Connected testing platform — October 5, 2026

Branch: `practo/testing-platform`. Base for this pass: `d8d6a7e52a003a9e7bfda990b001ae9b9ee9e1c1`. Other branches are outside this change. This document supersedes earlier descriptions of browser-only persistence and fixture-only APIs.

## Implementation scope

The approved work connects the existing portal workflows to a shared test backend, supplies mock information, polishes the login and Drafting Room, restores discoverable supervisor provisioning, adds reporting preferences and mobile fixes, introduces useful lazy loading, and cleans the code structure. Existing secondary school colors and white/charcoal surfaces are retained. No external time-tracking server or paid service was added.

## Architecture and storage

| Layer           | Location                        | Responsibility                                                                                                      |
| --------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Shared domain   | `src/domain/portal/`            | Typed account, attendance, journal, form, settings and navigation actions; deterministic IDs for command replay     |
| Journal periods | `src/domain/journal-period.ts`  | Philippine calendar periods, completed attendance overlap, cumulative hours and next eligible period                |
| Client          | `src/client/portal-client.ts`   | Bootstrap, real authentication, serial optimistic command queue, retries and reconciliation                         |
| React binding   | `src/store/use-app-store.ts`    | Thin Zustand hook; existing screens keep their typed action interface                                               |
| Server          | `src/server/`                   | Prisma access, credential hashing, cookies, authorization, command transactions, scoped reads and fictional seeding |
| HTTP routes     | `src/app/api/`                  | Request/response handling, JSON validation and same-origin checks                                                   |
| Shared UI       | `src/components/portal/shared/` | Accessible account fields, compact journal editor, loading placeholders and responsive action bars                  |
| Setup and tests | `scripts/`, `tests/`            | Repeatable migration/seed setup, domain regressions and isolated HTTP/browser tests                                 |

SQLite stores each school's versioned domain aggregate in `PortalSchool.stateJson`. This deliberately keeps evolving form blocks and responses flexible during prototyping. Accounts, email uniqueness, password hashes, sessions, login attempts and retry receipts are separate constrained tables. This is a shared server database, **not a fully normalized practicum schema**.

A transaction takes the school's SQLite write lock before reading its aggregate, authorizes the actor, replays a validated action against current data, updates account lifecycle/hashes, writes the new aggregate and records the request ID. Commands serialize across sessions. The client serializes its own queue and retries the same request ID after a lost reply, preventing duplicate writes. Completed attendance is the credited-hours source; journal approvals never increment it.

The browser saves only presentation preferences such as theme/sidebar collapse. Portal records and sessions are not persisted in browser localStorage. Server snapshots omit plaintext passwords and hashes. The client briefly holds a newly generated temporary password for provisioning; a credentials dialog appears after a confirmed save. Existing temporary passwords cannot be recovered from the database—reset credentials to issue a new one. The former credentials CSV that depended on readable passwords was removed.

## Authentication and permissions

- Email/password login checks salted scrypt hashes. Unknown, wrong-password and disabled-account failures use a generic message. Repeated failures per email are rate limited.
- Random session tokens are stored as hashes. Cookies are HTTP-only, SameSite Strict, expire after 12 hours, and are secure in production by default.
- Mutations require the portal origin and server-resolved account. The API does not trust the client's role, school or currentUser object.
- Coordinators manage their own school's records. Students write their own journals, attendance and assigned form responses. Supervisors evaluate assigned interns and review their journals; attendance changes are scoped to their own clock.
- Students see their own student/journal/attendance records and submitted evaluations. Supervisors see their assigned roster. Coordinator-only billing invoice details are omitted from non-coordinator snapshots.
- Invited accounts must replace their temporary password before using workspace APIs. Password replacement revokes old sessions and rotates the current session. Disabling or resetting an account invalidates its sessions.
- Deployed demo sign-in requires both `APP_ENV=testing` and `ENABLE_DEMO_LOGIN=true`. Local development (`NODE_ENV=development`) defaults to demo sign-in only when `APP_ENV` is unset, so an older local `.env` does not silently hide testing accounts. `ENABLE_DEMO_LOGIN=false` disables it; an explicit non-testing `APP_ENV` always blocks it. Demo login still permits only eligible seeded accounts in the main test school. New accounts and the isolated school cannot use that bypass. Database reset remains explicitly testing-only.
- Shared reset requires testing mode and a coordinator. It resets accounts, records and settings and signs out all sessions. Normal seed setup preserves existing records.

These controls were tested; they are not a claim of a production security audit.

## Connected endpoints

| Endpoint                                                                 | Behavior                                                                                     |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `GET /api/health`                                                        | Public service status; no account/database payload                                           |
| `GET /api/auth/session`                                                  | Session bootstrap and gated public sample previews                                           |
| `POST /api/auth/login`                                                   | Real credential sign-in                                                                      |
| `POST /api/auth/demo`                                                    | Testing-only allowlisted sample session                                                      |
| `POST /api/auth/password`                                                | Verify current password, hash replacement and rotate session                                 |
| `POST /api/auth/logout`                                                  | Revoke current session                                                                       |
| `GET /api/portal`                                                        | Role/school-scoped authoritative snapshot                                                    |
| `POST /api/portal`                                                       | Validated authorized command with `action`, `args`, generated `ids` and a unique `requestId` |
| `GET /api/students`, `/api/supervisors`, `/api/forms`, `/api/timesheets` | Scoped reads from the same saved data                                                        |
| `GET /api/timesheets/:studentId`                                         | Attendance for a student the actor is allowed to see                                         |
| `POST /api/test/reset`                                                   | Coordinator-only shared test reset                                                           |

All mutation requests send JSON and the browser's same-origin header. Session cookies supply authentication; no API key is needed inside the portal. `APP_ORIGIN` pins the origin for reverse-proxy deployment.

## Sample data

Setup generates 10 student accounts, six supervisors, one coordinator and a separate isolated coordinator. Names, contacts, company details and email addresses are fictional. Passwords are independently generated and hashed; the CLI writes the initial credentials only to an ignored local file. No fixed initial password table is published.

Attendance and journal dates are generated relative to the Philippine date at seed time. Samples include approved, pending, rejected and draft journals, recent completed attendance, assigned forms and evaluations. Existing template layouts are reused. Test reset replaces edited samples; it is intentionally destructive only within an explicitly enabled test environment. UI reset keeps sample passwords private; use the demo previews afterward, or run the CLI test reset to generate a fresh local credentials file.

## Login, accounts and mobile UI

All `public/login-hero-1.png` through `login-hero-3.png` cycle automatically every six seconds with a one-second opacity crossfade. Three role-focused subtitles follow the same hero state and timing, with stacked grid cells reserving text height. Inactive subtitles are hidden from assistive technology. Numbered controls are removed. Carl's October 6 login update uses 35% background opacity in light mode and 25% in dark mode, a single theme toggle, and full-width desktop halves with centered cover images. The first image has priority. Reduced-motion preferences stop automatic playback and transitions; hidden tabs do not advance images or text. See [Login subtitle rotation](LOGIN_SUBTITLE_ROTATION.md) for copy and verification.

Mobile and tablet login use one compact form over a subdued background; the desktop marketing panel is hidden below 1024px instead of appearing as a second section. Testing accounts appear immediately as three compact role buttons, with no collapsed menu. Fields and actions have 44px touch targets. Short devices and zoom can scroll naturally without hiding access controls. Real network state disables duplicate sign-in and surfaces errors. Supervisor creation is a visible button in both User Management and Supervisors. Single account provisioning waits for server confirmation before showing the temporary password. Shared account fields associate labels with inputs and select triggers. Account status filtering now uses the account lifecycle status rather than placement/employment status.

The form action bar wraps controls, keeps touch targets at least 44px and matches mobile page gutters. The journal list uses a focus-managed Sheet with Escape support. Account, journal and navigation screens are verified at 360px viewport width.

## Drafting Room and reporting preferences

- The former disabled Docs menu/formatting toolbar was removed. The editor is an honest plain-text journal with working reference and Word download controls.
- Smaller gutters, a 224px desktop journal rail, four-row resizable writing fields and compact metadata replace the oversized document canvas.
- Student name, number, course, company and supervisor are filled from the signed-in profile.
- Period hours come from completed attendance; they are read-only in the UI and recalculated by the server. A running clock contributes only after clock-out.
- Cumulative hours through the selected period are displayed against required hours. They are not calculated by adding journal hours.
- The initial period is the earliest attendance period without a pending/approved journal, or today if no eligible period exists. Previously unfinished entries remain available in the journal rail.
- School Settings includes daily, weekly or twice-weekly cadence. Weekly periods run Monday–Sunday. Twice-weekly periods run Monday–Wednesday and Thursday–Sunday. All use Philippine time.
- Entries capture cadence when created, so future preference changes do not relabel old entries. Eligible periods skip previously submitted intervals across cadence changes. Overnight attendance is clipped at period boundaries, and next-period selection includes its carryover date.
- Empty attendance periods can save drafts, but cannot submit. Tasks and learnings are required for submission. A submitted entry overlapping an existing submitted period is rejected, including overlaps after a cadence change.
- Autosave waits 750ms after typing, then saves to the shared server. Explicit save/submit waits for confirmation. The page warns before unloading unsaved or pending changes. Navigation within the editor saves edited content first.

## Loading, exports and feedback

Role workspaces and their individual screens load dynamically. Initial loaders use static placeholders rather than unnecessary animation. PDF generation libraries load on export; journal Word generation loads when requested. Both exports were checked as real files.

Optimistic mutations display a shared save status. On failure, the client reconciles with authoritative data and shows an error. Journal text stays available in the editor for retry. Focus and a five-second visible-session poll refresh shared state while preserving unchanged settings references, so polling does not discard an unsaved branding draft.

## Remaining work

Before real student deployment: normalize the practicum aggregate where reporting/scale requires it; replace SQLite with a managed database for ephemeral hosting; add backups, recovery drills and retention rules; provide secure email delivery/recovery of invitations; implement production audit logs and distributed rate limiting; replace base64 prototype image fields with controlled object storage; and test supported browsers/devices with the institution's actual account/term policies.

Billing screens remain illustrative and do not charge money. External tool URLs are not API integrations. Reviews appear in the portal; no email or push notification is sent. Concurrent editing of one text field is last-write-wins, not collaborative merge. Bulk provisioning consists of individually committed commands; an interrupted batch can require checking saved accounts and reissuing credentials before retry. Command receipts and expired sessions need scheduled retention cleanup before long-running production use. Failed login throttling is per email in this prototype, not a complete abuse defense. Demo login and reset must be disabled for real accounts.

## Writing and workflow follow-up

See [the writing/workflow guide](WRITING_ASSISTANT.md) for the optional demo assistant, own-account language/detail preferences, explicit preview/apply/undo, serialized autosave and exit guards, saved-draft recovery, attendance-based journal coverage and scenario picker. `/api/preferences/writing` is an authenticated, same-origin validated GET/POST route. The additive migration preserves existing records; run `npm run db:setup` after pulling. No external AI connection or provider login is enabled.
