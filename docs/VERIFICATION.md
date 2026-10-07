# Verification — connected platform

The latest October 7 form-workflow results are in [Form workflow and local testing](FORM_WORKFLOW.md#verification-7-october-2026), including the 200-recipient fixture, concurrent saves and upload-policy checks.

The October 6 results are in [Responsive and workflow polish](RESPONSIVE_POLISH.md#verification). The sections below record earlier passes.

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

## Report Builder, forms and sound — October 6, 2026

Base refreshed to Carl’s `7bc2cf9` login/create-account update. Report/form/sound changes preserve that login source and SVG. All integration/browser fixtures use disposable migrated SQLite databases.

- `npm run test:reports`: same-school/role/owner checks, student isolation from combined dossiers, unauthenticated/CSRF rejection, revision conflicts, supervisor read-only writes, ready/revision/reviewed transitions, evidence validation/rotation, immutable exported/reviewed DOCX bytes, ZIP manifest, account preference isolation, starter creation, published-template edit rejection, archival guard and retained response snapshots.
- `npm run test:reports-ui`: Chromium at 320px and desktop; report creation, delayed serialized saves with latest edits retained, preview, Word export history, failed-save retry without lost text, supervisor read-only controls, sound settings/test, starter question preview, named-recipient assignment and confirmed student form submission. Zero page errors.
- `npm run test:reports-doc`: actual editable DOCX XML, headings/TOC/footer/margins, images/tables, clipped/deduplicated exact attendance (524 minutes), long narrative completion and six/seven journal fixture. LibreOffice/PyMuPDF render produces 57 pages with final paragraph and seventh journal intact. Conditional-question visibility/structure and rating bounds, including valid weighted zero, pass. Representative printed journal/header pages were visually inspected.
- Existing connected-server, account/clock HTTP/browser, writing workflow, baseline browser, responsive and PDF suites pass. The responsive sweep covers all three roles, all navigation pages including Report Builder, 320/390/768px in light/dark, scrollable short/landscape navigation, student detail tabs, malformed-response recovery, coordinator account creation and responsive form/PDF controls. PDF fixture: seven pages with complete text/tables in bounds.
- Development-login suite passes with all three seeded accounts under older local environment defaults and explicit demo opt-out, after Carl’s latest login update.
- Unit suite: 21 passed. TypeScript and production build pass. ESLint: zero errors, 22 warnings, chiefly effect-based external store/cache initialization. `git diff --check` passes.

Iterations fixed strict accessible section/text labels, stale Save-status test matching, physically rotated Word images, a tall Word header, partial-export checks, form wizard preview/recipient selection, persisted form-version safeguards and explicit clear/submit confirmations. A responsive test was rerun after an overlapping production rebuild invalidated loaded chunks; the clean sweep passes. Browser tests wait for server-confirmed dialog completion before asserting submitted state.

Screenshots: [Report Builder mobile](screenshots/report-builder-mobile.png) and [desktop](screenshots/report-builder-desktop.png). Only new report screenshots are included; unrelated historical screenshots generated by regression tests are restored to avoid incidental changes.

See [workflow and upgrade guide](REPORT_WORKSPACE.md) for storage limits, evidence types, additive migration, immutable grammarian uploads and exact remaining limits. Browser preview is not Word pagination. Actual Microsoft Word, Safari/iOS and physical devices are not claimed tested. PDFs/other DOCX attachments remain original ZIP files rather than automatically merged pages. No AI, school verification, live push/email or electronic signatures are implemented.

## Professor templates and assignments — October 6, 2026

Base: `46227a8703da0d664af30a0aa85bf477a67e998d`, branch `practo/testing-platform`. The user's current login, hero, subtitle and SVG source are unchanged. Every HTTP/browser fixture uses a disposable migrated SQLite database; the developer database was not reset or migrated during verification.

| Check | Result |
| --- | --- |
| `npm run typecheck` / `npm run build` | Pass; production build includes authenticated template routes and lazy workspaces |
| `npm run lint` / `git diff --check` | Zero errors; 22 existing initialization warnings; clean whitespace |
| `npm test` | 21 passed |
| `npm run test:templates` | Three template unit tests plus real HTTP workflow pass |
| `npm run test:templates-ui` | Coordinator, student and supervisor flows pass at 320px and desktop; zero page errors |
| `npm run test:templates-doc` | Mapped Word inspection and 43-page LibreOffice/PyMuPDF render pass |
| `npm run test:integration` / `npm run test:reports` | Connected-server and existing report HTTP regressions pass |
| `npm run test:browser` / `npm run test:reports-ui` | Testing accounts, login/themes, saved records, provisioning, report recovery, forms and sound pass |
| `npm run test:reports-doc` | Independent Word export regression passes; 53 rendered pages preserve the last narrative paragraph and seventh journal |

Template HTTP checks cover school/role isolation, coordinator-only publication, blank/idempotent assignments, linked recipients, stale revisions, fixed core sections, respondent-specific edits, own-response review rejection, authorized example previews, immutable published bytes, explicit version upgrades, archived answers/evidence, retained exports, duplicate-version guards and explicit testing reset cleanup. Unit checks reject unmapped/duplicate/mixed/table-nested tags and embedded objects, preserve source margins and verify heading/score rules including historical answers and zero scores.

The browser creates and saves a real custom section, publishes and assigns the format, checks student core locks and optional extras, submits an actual numeric evaluation response, and saves a supervisor-owned answer. Opening a linked weekly form from **Sample Student 5**, rather than the supervisor's first intern, selects the requested student and persists the correct `targetStudentId`. The final run includes this regression and reports no browser errors.

The mapped Word fixture contains seven weekly journals with cumulative hours 40 through 240, then 250 (15,000 minutes), 70 long reflection paragraphs, editable native tables, rating headings and evidence images. XML and rendered text checks preserve the source header/footer and Letter geometry, contain no unresolved placeholders or copied mock answers, and retain the final paragraph and seventh journal. Compact journal-cell spacing and repeating headers keep the journal heading with its first table instead of a nearly blank page. The generated example contains only fictional test information.

Iterations corrected JSON-property-order permission comparisons, numeric rating persistence, incomplete weighted summaries, overflowing mobile actions, Word journal spacing/page breaks, and linked-form intern context. Historical screenshots regenerated by baseline tests were restored; only the new template evidence is included.

Evidence: [templates mobile](screenshots/templates-mobile.png), [templates desktop](screenshots/templates-desktop.png), [assigned report mobile](screenshots/assigned-report-mobile.png), [rendered Word journal](screenshots/template-word-page.png), and [fictional mapped DOCX](verification/template-pilot-report.docx).

Read [PROFESSOR_TEMPLATES.md](PROFESSOR_TEMPLATES.md) for non-resetting upgrade instructions and precise version/form-snapshot boundaries. Content previews do not reproduce Word pagination; arbitrary filled documents require explicit mapping. Actual Microsoft Word, Safari/iOS and physical devices remain untested. No live AI, school verification or electronic signatures were added.

## Connected workflow verification — 2026-10-07

The connected update was tested on disposable migrated SQLite databases; development data was not reset. Login/hero/SVG edits are preserved. Research and the implementation boundaries are recorded in `CONNECTED_WORKFLOW_PLAN.md`; usage, migration and compatibility are in `CONNECTED_WORKFLOW.md`.

| Check | Result |
| --- | --- |
| `npm test` | 21 prototype/domain tests pass. |
| `npm run typecheck`, `npm run build` | Pass; production includes authenticated storage and gated guided-demo routes. |
| `npm run lint` | Zero errors; 22 existing warnings remain. No added effect warning in the new hub/template/report deep-link loaders. |
| `npm run test:connected` | Two boundary/selector tests plus real HTTP flow pass. Covers simultaneous/repeat demo setup without account/answer resets; actual three-role completion and final Word; frozen shared rubrics; direct linking with revision conflict rejection; explicit upgrades; distinct report/section/intern responses; retired-context locks and saved-answer/Word retention. |
| Connected storage checks | 4000×3000 JPEG becomes 2000×1500; identical upload is reused; a four-MB quota breach rolls back file/revision writes. Unchanged export is reused. Cleanup retains all Word, newest ZIP and a grammarian-linked ZIP while removing only the eligible older ZIP. |
| `npm run test:connected-ui` | Actual editor linking, guide, guided sample, student answers/save/submit, correct-intern supervisor ratings, coordinator response approval and section reviews, preview and final Word pass at 320×568 and desktop. Testing role buttons are visible. Zero page errors or document-level horizontal overflow. |
| `npm run test:templates` | Three Word/rating/placeholder tests plus template HTTP permissions, immutable versions, assignments and retained-content checks pass. |
| `npm run test:templates-ui` | Professor custom-section/publish/assign flow, locked student format, custom answers, real ratings and correct supervisor intern pass at 320px/desktop with zero page errors. |
| `npm run test:integration` | Existing credential/session, ownership, concurrent clock, receipt, journal, form, cross-school, production-gating and rate-limit checks pass. |
| `npm run test:browser` | Existing all-role login, heroes/themes, direct testing buttons, mobile navigation, persistence, journal Word/PDF and provisioning checks pass with zero page errors. |
| `npm run test:login` | Actual development login with older env setup passes for all roles; explicit demo opt-out still hides/rejects demo access. |
| `npm run test:reports`, `npm run test:reports-ui` | Existing report ownership, combined scope, revisions, evidence, exports, recovery, preferences, confirmed form submission and mobile/desktop workflow pass. |
| `npm run test:templates-doc` | Current mapped output renders to 44 PDF pages; 70 narrative paragraphs, seven journals, 250 completed hours, tables, images and inherited margins remain present. |
| `npm run test:reports-doc` | Existing long Word/PDF reference retains its final narrative, seventh journal, exact minutes, image/table/header structure and form bounds. |
| Guided Word visual check | The new short format renders to one page with black headings, complete answers and readable five-point rating headers/average. Inspected the generated page image; fixed split rating words and duplicate matching form headings before publication. |

Two defects found during iteration were fixed: a long linked-form action could widen a 320px report page, and narrow Word rating columns could split words. Tests now exercise the full export path and keep diagnostic overflow output. Additional fixes retain contextual response IDs during submit, distinguish repeated requirements in inboxes and keep legacy generic submissions compatible.

Browser validation used headless Chromium; document rendering used bundled LibreOffice. These checks do not guarantee identical pagination on every Microsoft Word version or a deployment's database durability. No AI integration or electronic-signature feature was added.
