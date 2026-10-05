# Verification — connected platform, October 5, 2026

This pass starts from `d8d6a7e` on `practo/testing-platform`. Commands run against Node 24, the installed Next.js 16.3.8/React 19 application, Prisma 6 with SQLite, and Chromium through Playwright. Only the testing branch is published.

## Automated checks

| Check                      | Result / coverage                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`        | TypeScript passes                                                                                                                                                                                                                                                                                                                                                                                              |
| `npm test`                 | 15 domain tests: attendance totals, clock idempotency, invalid manual times, account lifecycle, provisioning, journal revisions, form ownership/required answers/snapshots, evaluation locks, CSV escaping, color contrast and cadence/overnight carryover                                                                                                                                                     |
| `npm run lint`             | Zero errors; 21 inherited `set-state-in-effect` warnings remain in controlled editor/modal initialization and existing hooks                                                                                                                                                                                                                                                                                   |
| `npm run build`            | Production build passes, with Node API routes and dynamically loaded workspace screens                                                                                                                                                                                                                                                                                                                         |
| `npm run test:integration` | Real HTTP credential sign-in, HTTP-only cookies, CSRF, role ownership, scoped reads, concurrent clock-in, saved data across sessions, retry receipts, server-derived journal hours, student submission/supervisor review, required form submission/coordinator review, immutable submitted records, shared preferences, supervisor provisioning/password change, isolated-school checks reset restrictions, production-mode demo/reset restrictions and failed-login rate limiting |
| `npm run test:browser`     | All three roles, heroes 1–3, journal autofill/save/reload, real DOCX/PDF files, themes, attendance reload, supervisor creation, shared schedule/colors, 360px layouts and accessible navigation/journal drawers; no page errors                                                                                                                                                                                |

Integration and browser checks create independent temporary SQLite databases with generated credentials kept in process memory. Their production servers run on ports 3102 and 3101 respectively; the production-flag check also uses port 3103. Tests remove their temporary data; they do not reset the development database.

The browser test confirms that `practo:prototype:v1` is absent, and reads saved records from `/api/portal`. This replaces the old smoke assertions that checked localStorage.

## Visual evidence

Current connected-platform captures:

- [Login heroes](screenshots/login-heroes.png)
- [Student light](screenshots/student-light.png) and [dark](screenshots/student-dark.png)
- [Drafting Room desktop](screenshots/drafting-room.png)
- [Drafting Room mobile](screenshots/journal-mobile.png)
- [Student mobile](screenshots/student-mobile.png)
- [Coordinator users mobile](screenshots/coordinator-users-mobile.png)
- [Saved secondary colors and schedule](screenshots/secondary-color-preview.png)

The other school-settings/coordinator screenshots in this folder belong to the earlier UI pass. Full-page screenshots can place fixed mobile navigation above later content; browser checks also verify actual viewport overflow and keyboard behavior.

## Scope of evidence

This confirms a local production build with real server/database behavior and desktop Chromium/mobile viewport emulation. It does not certify Safari/iOS, Android devices, concurrent rich-text collaboration, cloud volume durability, email delivery, external service APIs, real billing, backup recovery or production security. Read [remaining work](CONNECTED_PLATFORM.md#remaining-work) before deployment with real student information.
