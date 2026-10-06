# Change inventory — connected platform

Base: `d8d6a7e`; branch: `practo/testing-platform`. See [implementation details](CONNECTED_PLATFORM.md) for behavior and [verification](VERIFICATION.md) for results.

## Main changes

| Area | Improvements |
| ---- | ------------ |

| Database and setup | Real school aggregates, account/session constraints, migrations, fictional seed data and private generated credentials |

| API and permissions | Cookie auth, password hashing, strict command schemas, transactions, role/school ownership, retry receipts and connected read endpoints |

| Login and accounts | Subdued hero PNGs, mobile-first sign-in, visible supervisor creation, server-confirmed credential dialogs and accessible shared fields |

| Journals | Compact writing UI, attendance-derived hours, cumulative progress, Philippine periods, cadence preferences, revisions and real saves |

| UX | Lazy screens/PDF/Word exports, static placeholders, responsive controls, mobile drawer focus and save/error feedback |

| Structure | Domain action modules, client transport, server services, shared UI, setup scripts and isolated integration/browser harness |

| Documentation | Current setup, architecture, test evidence, deployment limits and historical changelog |

## Files

Status: A = added; M = changed; D = removed.

| File | Status |
| ---- | ------ |

| `.env.example` | M |

| `.gitignore` | M |

| `README.md` | M |

| `docs/CONNECTED_PLATFORM.md` | A |

| `docs/TESTING_PLATFORM.md` | M |

| `docs/VERIFICATION.md` | M |

| `docs/screenshots/coordinator-users-mobile.png` | A |

| `docs/screenshots/drafting-room.png` | A |

| `docs/screenshots/journal-mobile.png` | A |

| `docs/screenshots/login-heroes.png` | A |

| `docs/screenshots/secondary-color-preview.png` | A |

| `docs/screenshots/student-dark.png` | M |

| `docs/screenshots/student-light.png` | M |

| `docs/screenshots/student-mobile.png` | A |

| `eslint.config.mjs` | M |

| `package-lock.json` | M |

| `package.json` | M |

| `prisma/migrations/20261005000000_connected_portal/migration.sql` | A |

| `prisma/migrations/migration_lock.toml` | A |

| `prisma/schema.prisma` | M |

| `scripts/load-ts.cjs` | A |

| `scripts/seed.cjs` | A |

| `scripts/setup-database.cjs` | A |

| `src/app/api/auth/[operation]/route.ts` | A |

| `src/app/api/forms/route.ts` | M |

| `src/app/api/health/route.ts` | M |

| `src/app/api/portal/route.ts` | A |

| `src/app/api/route.ts` | M |

| `src/app/api/students/route.ts` | M |

| `src/app/api/supervisors/route.ts` | M |

| `src/app/api/test/reset/route.ts` | A |

| `src/app/api/timesheets/[studentId]/route.ts` | M |

| `src/app/api/timesheets/route.ts` | M |

| `src/client/portal-client.ts` | A |

| `src/components/portal/auth/first-login-password.tsx` | M |

| `src/components/portal/auth/login-screen.tsx` | M |

| `src/components/portal/coordinator/bulk-create-users.tsx` | M |

| `src/components/portal/coordinator/coordinator-form.tsx` | M |

| `src/components/portal/coordinator/coordinator-workspace.tsx` | M |

| `src/components/portal/coordinator/import-users-sheet.tsx` | M |

| `src/components/portal/coordinator/student-form.tsx` | M |

| `src/components/portal/coordinator/supervisor-form.tsx` | M |

| `src/components/portal/coordinator/supervisors-list.tsx` | M |

| `src/components/portal/coordinator/user-management.tsx` | M |

| `src/components/portal/layout/app-shell.tsx` | M |

| `src/components/portal/layout/page-actions.tsx` | M |

| `src/components/portal/portal-app.tsx` | M |

| `src/components/portal/settings/school-identity-settings.tsx` | M |

| `src/components/portal/shared/action-bar.tsx` | M |

| `src/components/portal/shared/form-field.tsx` | A |

| `src/components/portal/shared/google-doc-editor.tsx` | D |

| `src/components/portal/shared/journal-editor.tsx` | A |

| `src/components/portal/shared/submission-review-slide-over.tsx` | M |

| `src/components/portal/shared/time-clock-view.tsx` | M |

| `src/components/portal/shared/workspace-loader.tsx` | A |

| `src/components/portal/student/journal-detail.tsx` | M |

| `src/components/portal/student/journal-form.tsx` | M |

| `src/components/portal/student/journals-list.tsx` | M |

| `src/components/portal/student/student-form-workspace.tsx` | M |

| `src/components/portal/student/student-workspace.tsx` | M |

| `src/components/portal/supervisor/evaluation-form.tsx` | M |

| `src/components/portal/supervisor/journal-review.tsx` | M |

| `src/components/portal/supervisor/supervisor-form-workspace.tsx` | M |

| `src/components/portal/supervisor/supervisor-workspace.tsx` | M |

| `src/domain/journal-period.ts` | A |

| `src/domain/portal/actions/accounts.ts` | A |

| `src/domain/portal/actions/attendance.ts` | A |

| `src/domain/portal/actions/forms.ts` | A |

| `src/domain/portal/actions/journals.ts` | A |

| `src/domain/portal/actions/navigation.ts` | A |

| `src/domain/portal/actions/settings.ts` | A |

| `src/domain/portal/engine.ts` | A |

| `src/domain/portal/helpers.ts` | A |

| `src/domain/portal/snapshot.ts` | A |

| `src/domain/portal/types.ts` | A |

| `src/lib/client-pdf.ts` | M |

| `src/lib/db.ts` | M |

| `src/lib/docx-export.ts` | M |

| `src/lib/pdf-renderer.ts` | A |

| `src/lib/prototype.ts` | M |

| `src/lib/types.ts` | M |

| `src/server/command-schema.ts` | A |

| `src/server/database.ts` | A |

| `src/server/permissions.ts` | A |

| `src/server/portal-service.ts` | A |

| `src/server/read-api.ts` | A |

| `src/server/security.ts` | A |

| `src/server/seed.ts` | A |

| `src/store/use-app-store.ts` | M |

| `tests/browser-smoke.cjs` | M |

| `tests/load-ts.cjs` | M |

| `tests/prototype.test.cjs` | M |

| `tests/server-harness.cjs` | A |

| `tests/server-integration.cjs` | A |

## Login follow-up — October 5, 2026

Starting from `0ecc986`, this follow-up restores direct testing-role access for existing local development environments, replaces manual hero selection with a subtle automatic crossfade, and removes the second stacked mobile hero section. Other role workspaces are unchanged.

| File                                                                                   | Improvement                                                                                                                                       |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/portal/auth/login-screen.tsx`                                          | Visible testing-role buttons; automatic 6-second hero cycle/1-second fade; reduced-motion support; compact mobile/tablet layout and 44px controls |
| `src/server/runtime-mode.ts`                                                           | Development-only demo default with explicit environment/disable guards                                                                            |
| `src/server/security.ts`                                                               | Uses centralized demo eligibility; reset mode stays explicit                                                                                      |
| `tests/prototype.test.cjs`                                                             | Environment regression cases, including production fail-closed and explicit opt-out                                                               |
| `tests/server-harness.cjs`, `tests/login-development.cjs`, `package.json`              | Actual development-mode login/opt-out checks; server readiness isolation; `npm run test:login`                                                    |
| `tests/browser-smoke.cjs`                                                              | Automatic heroes, reduced motion, direct test login, single-screen 320/360/390/768px layout checks in both themes                                 |
| `AGENTS.md`, `CLAUDE.md`                                                               | Next.js-generated repository guidance produced by the development verification run                                                                |
| `README.md`, `docs/CONNECTED_PLATFORM.md`, `docs/VERIFICATION.md`, this inventory      | Current behavior, setup and verification documentation                                                                                            |
| `docs/screenshots/login-heroes.png`, `login-mobile-light.png`, `login-mobile-dark.png` | Desktop and compact mobile evidence                                                                                                               |

## Writing, workflow and UI follow-up — October 5, 2026

Starts from `b31510c` on `practo/testing-platform`. Scope and sequence are recorded in [the implementation plan](WRITING_AND_WORKFLOW_PLAN.md); usage and upgrade instructions are in [the guide](WRITING_ASSISTANT.md).

| Files                                                                                                                                                                                                                                               | Improvement                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/domain/writing-assistant.ts`, `src/client/writing-assistant.ts`, `src/components/portal/student/writing-assistant-panel.tsx`                                                                                                                   | Provider-neutral demo contract, cancellable sample requests, lazy drawer, language/detail preferences, preview, explicit apply/dismiss, loading/error/retry and selected-passage handling          |
| `src/components/portal/shared/journal-editor.tsx`                                                                                                                                                                                                   | Lazy assistant entry, native text selection, guarded single-step undo and read-only support                                                                                                        |
| `prisma/schema.prisma`, `prisma/migrations/20261005143000_writing_preferences/migration.sql`, `src/app/api/preferences/writing/route.ts`                                                                                                            | Additive per-account preferences storage, authenticated reads and validated same-origin writes                                                                                                     |
| `src/hooks/use-journal-draft.ts`, `src/client/navigation-guard.ts`, `src/client/portal-client.ts`                                                                                                                                                   | Serialized autosave preserves newer edits; dirty navigation/logout/account switch waits for save; failures expose retry; stale server snapshots cannot overwrite newer revisions/switched accounts |
| `src/components/portal/student/journal-form.tsx`, `journal-list-rail.tsx`, `journals-list.tsx`, `journal-detail.tsx`                                                                                                                                | Extracted search/filter rail, saved draft/revision continuation, captured cadence, journal number, period/previous-period/cumulative hours, lock feedback and save state                           |
| `src/domain/journal-progress.ts`, `src/domain/journal-period.ts`, `src/components/portal/student/journal-hours-summary.tsx`                                                                                                                         | Attendance-based nonduplicated review coverage and period labels that retain saved cadence                                                                                                         |
| `src/components/portal/shared/journal-review-timeline.tsx`, `journal-status-card.tsx`, `badges.tsx`, `src/components/portal/supervisor/journal-review.tsx`, `journal-approval-queue.tsx`, `src/components/portal/coordinator/all-journals-list.tsx` | Latest review timestamps/feedback, clear revision labels, persisted review success feedback and accurate approval wording                                                                          |
| `src/components/portal/shared/testing-scenarios.tsx`, `src/app/api/auth/[operation]/route.ts`, `src/server/seed.ts`, `src/lib/types.ts`                                                                                                             | Real eligible account scenarios derived from saved state; fresh seed adds new/no-hours and completed-hours students; ordinary setup preserves existing data                                        |
| `src/components/portal/layout/app-shell.tsx`, `page-actions.tsx`, `notifications-dropdown.tsx`, `src/components/portal/shared/editorial-dashboard.tsx`                                                                                              | Lazy scenario modal, practical touch targets, saved-draft dashboard continuation and responsive feedback rows                                                                                      |
| `src/components/portal/auth/login-screen.tsx`                                                                                                                                                                                                       | Equal desktop halves, full contained hero PNGs, preserved subtle automatic fade and compact mobile login                                                                                           |
| `src/components/ui/dialog.tsx`, `sheet.tsx`, `button.tsx`, `src/components/portal/shared/create-form-wizard.tsx`                                                                                                                                    | 44px primary/close controls, reserved header clearance, viewport-height scrolling, instant modal size adaptation and short fade without zoom                                                       |
| `tests/prototype.test.cjs`, `server-integration.cjs`, `browser-smoke.cjs`, `writing-workflow.cjs`, `package.json`                                                                                                                                   | Demo/coverage/cadence unit cases, own-account preference security tests, real slow/failed-save and cross-role workflow checks, responsive modal/drawer checks; reliable server-state polling       |
| `README.md`, `docs/CONNECTED_PLATFORM.md`, `docs/VERIFICATION.md`, this inventory, two new guides                                                                                                                                                   | Behavior, limits, schema upgrade, implementation plan, module boundaries and verification evidence                                                                                                 |
| `docs/screenshots/`                                                                                                                                                                                                                                 | Refreshed baseline and new contained hero, assistant, modal and scenario evidence                                                                                                                  |

No live OmniRoute/provider connection, API key, billing integration, fabricated AI-generated accomplishments, or changes to another GitHub branch are part of this pass. Review history shows latest events; it is not a complete audit log. Unsaved reload recovery is not promised; only successfully saved server drafts are recoverable.

## October 6 — synchronized login subtitles

Based on Carl's `1abfb31` login update; his layout, hero opacity, image fit,
single theme toggle, headline and role captions are preserved.

| File | Change |
| --- | --- |
| `src/components/portal/auth/login-screen.tsx` | Three role-focused subtitles share the existing hero state and one-second fade; stacked paragraphs avoid height changes and hide inactive copy from assistive technology. |
| `tests/browser-smoke.cjs` | Existing login-theme checks use Carl's single toggle. |
| `tests/writing-workflow.cjs` | Existing hero-fit expectation matches Carl's centered cover images. |
| `docs/LOGIN_SUBTITLE_ROTATION.md`, `docs/CONNECTED_PLATFORM.md`, this inventory | Copy, timing, scope and focused verification; signature implementation deferred and AI left for later. |

Typecheck, targeted lint, a fresh production build and focused production-server
browser checks passed. Full prior workflow suites were not rerun in this pass;
the detailed check scope is in the subtitle guide.
