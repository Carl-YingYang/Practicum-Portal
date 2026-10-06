# Verification — connected platform

The latest October 6 results are in [Responsive and workflow polish](RESPONSIVE_POLISH.md#verification). The sections below record earlier passes.

The writing/workflow follow-up starts from `b31510c`. The connected-platform pass starts from `d8d6a7e`; the login follow-up starts from `0ecc986` on `practo/testing-platform`. Commands run against Node 24, the installed Next.js 16.3.8/React 19 application, Prisma 6 with SQLite, and Chromium through Playwright. Only the testing branch is published.

## Automated checks

| Check                      | Result / coverage                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`        | TypeScript passes                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `npm test`                 | 19 tests: writing sample bounds/prompts, nonduplicated attendance coverage, saved cadence/overnight clipping, demo environment guards, attendance totals, clock idempotency, invalid manual times, account lifecycle, provisioning, journal revisions, form ownership/required answers/snapshots, evaluation locks, CSV escaping, color contrast and cadence/overnight carryover                                                                                                   |
| `npm run lint`             | Zero errors; 21 inherited `set-state-in-effect` warnings remain in controlled editor/modal initialization and existing hooks                                                                                                                                                                                                                                                                                                                                                       |
| `npm run build`            | Production build passes, with Node API routes and dynamically loaded workspace screens                                                                                                                                                                                                                                                                                                                                                                                             |
| `npm run test:integration` | Real HTTP credential sign-in, HTTP-only cookies, CSRF, role ownership, scoped reads, concurrent clock-in, saved data across sessions, retry receipts, server-derived journal hours, student submission/supervisor review, required form submission/coordinator review, immutable submitted records, shared preferences, supervisor provisioning/password change, isolated-school checks reset restrictions, production-mode demo/reset restrictions and failed-login rate limiting |
| `npm run test:browser`     | All three roles, automatic hero cycle/reduced motion, immediately visible testing roles, 320/360/390/768px single-screen login in both themes, journal autofill/save/reload, real DOCX/PDF files, themes, attendance reload, supervisor creation, shared schedule/colors, 360px layouts and accessible navigation/journal drawers; no page errors                                                                                                                                  |

Integration and browser checks create independent temporary SQLite databases with generated credentials kept in process memory. Their production servers run on ports 3102 and 3111 respectively; the production-flag check also uses port 3103. Tests remove their temporary data; they do not reset the development database.

The browser test confirms that `practo:prototype:v1` is absent, and reads saved records from `/api/portal`. This replaces the old smoke assertions that checked localStorage.

## Login follow-up

`npm run test:login` runs actual development servers on port 3112 with no testing flags (representing an older local `.env`). All three sample roles sign in successfully and their session role is verified. Reset stays disabled. A second run with `ENABLE_DEMO_LOGIN=false` verifies hidden demo accounts and rejected demo login. The server harness waits for its own child to be ready before polling health, preventing accidental use of a previous server on the same port.

Login browser checks verify a full automatic image cycle, no numbered selectors, reduced-motion pause, direct role buttons, and no vertical or horizontal overflow at 320/360/390/768 × 640 in both themes. A shorter 320 × 568 viewport may scroll naturally; the desktop hero remains hidden and testing controls remain reachable. Screenshots below capture the desktop and 360 × 640 mobile states.

## Visual evidence

Current connected-platform captures:

- [Login heroes](screenshots/login-heroes.png)
- [Mobile login light](screenshots/login-mobile-light.png) and [dark](screenshots/login-mobile-dark.png)
- [Student light](screenshots/student-light.png) and [dark](screenshots/student-dark.png)
- [Drafting Room desktop](screenshots/drafting-room.png)
- [Drafting Room mobile](screenshots/journal-mobile.png)
- [Student mobile](screenshots/student-mobile.png)
- [Coordinator users mobile](screenshots/coordinator-users-mobile.png)
- [Saved secondary colors and schedule](screenshots/secondary-color-preview.png)

The other school-settings/coordinator screenshots in this folder belong to the earlier UI pass. Full-page screenshots can place fixed mobile navigation above later content; browser checks also verify actual viewport overflow and keyboard behavior.

## Scope of evidence

This confirms a local production build with real server/database behavior and desktop Chromium/mobile viewport emulation. It does not certify Safari/iOS, Android devices, concurrent rich-text collaboration, cloud volume durability, email delivery, external service APIs, real billing, backup recovery or production security. Read [remaining work](CONNECTED_PLATFORM.md#remaining-work) before deployment with real student information.

## Writing/workflow follow-up

- `npm run test:workflow` runs a separate Chromium browser against a disposable migrated SQLite database on port 3120. It verifies manual preview/apply and guarded undo, native keyboard-selected passage replacement, bracketed reflection prompts, demo error/retry, and unchanged attendance hours.
- A held real POST verifies that edits made during a slow save reach the server. Failed POSTs verify that sidebar navigation stays in the editor, text is retained, explicit retry succeeds, and a saved draft reopens after navigation/reload.
- The same saved journal travels Student submission → Supervisor revision → Student editing/resubmission → Supervisor approval → Coordinator visibility. Attendance totals remain unchanged after approval.
- Desktop full-contained half-width hero images, form-wizard step/44px close spacing, viewport-height modal scrolling, and the assistant at 320/360/390/768 × 640 in light/dark are checked. Scrollable preview actions remain reachable. The scenario picker switches to an actual zero-hours account; persisted language/detail preferences survive reload and stay isolated between accounts.
- HTTP integration additionally verifies unauthenticated preference rejection, valid persisted writes, another account's defaults, strict field/enum validation and CSRF rejection. Existing account/security tests still pass.
- Baseline browser and development-login checks pass again: direct three-role access, older local environment defaults, explicit demo opt-out, fade/reduced motion, compact login, exports, attendance, provisioning and shared school settings.
- TypeScript and production build pass. ESLint reports zero errors and the same 21 inherited initialization warnings. Unit tests: 19 passed, zero failed. Browser flows report no page errors.

The browser tests now poll asynchronous server snapshots explicitly rather than returning an unresolved Promise from Playwright's synchronous `waitForFunction` predicate. Entrance animations are allowed to finish before measuring drawer bounds. Dialog sizing disables layout transitions so viewport changes fit immediately; only its short fade remains.

New visual evidence (viewport captures):

- [Full contained login hero](screenshots/login-contained-hero.png)
- [Desktop Writing Assistant](screenshots/writing-assistant-desktop.png)
- [Mobile assistant light](screenshots/writing-assistant-mobile-light.png) and [dark](screenshots/writing-assistant-mobile-dark.png)
- [Mobile preview actions light](screenshots/writing-assistant-preview-mobile-light.png) and [dark](screenshots/writing-assistant-preview-mobile-dark.png)
- [320px form wizard close spacing](screenshots/form-wizard-mobile.png)
- [360px testing scenarios](screenshots/testing-scenarios-mobile.png)

This is deterministic demo UI and real local server workflow verification. No OmniRoute/provider request, account linking, live AI accuracy, usage billing, Safari/iOS or physical-device keyboard test is claimed. See [upgrade instructions and exact limitations](WRITING_ASSISTANT.md).

## Account, loading and attendance follow-up — October 6, 2026

Built on Carl's `bbee8f4` update. The fresh production build, TypeScript, all 21 unit tests and all eight integration/browser/export/development suites listed in [the detailed follow-up](ACCOUNT_ATTENDANCE_POLISH.md#verification) pass. ESLint has zero errors and 20 existing initialization warnings. `git diff --check` passes.

The new account/clock browser suite verifies all-role password forms, delayed saves, offline clock-out rollback/reconnect, a 13-hour active-session warning, student request/assigned-supervisor approval, 320–768px intern tabs and mobile account reset. It waits for the reset sheet's animation before capturing its bounds and screenshot. Password/reset success waits for the server; only newly generated temporary credentials are revealed. Screenshots exclude temporary passwords.

Current login source and SVG are unchanged from Carl's update. Earlier exact-height/single-screen mobile claims above describe older revisions; current tests allow natural vertical scrolling, require a single visible sign-in layout and reject horizontal page overflow. The workspace header no longer displays the Practo name/logo. The simple shared loader appears only while actual work is pending.

Full scope, iterations, screenshot links and remaining limits: [ACCOUNT_ATTENDANCE_POLISH.md](ACCOUNT_ATTENDANCE_POLISH.md). Tests use disposable databases; no developer database reset or schema migration is needed. Only `practo/testing-platform` is authorized for publication.
