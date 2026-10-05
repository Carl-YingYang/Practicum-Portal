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
