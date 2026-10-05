# Changed-file inventory

Every affected path relative to the repository root. `M` = modified, `A` = added, `D` = removed. The thematic rationale and limitations are in [TESTING_PLATFORM.md](TESTING_PLATFORM.md).

| Change | File |
|---|---|
| D | `.env` |
| M | `.env.example` |
| M | `README.md` |
| A | `docs/CHANGE_INVENTORY.md` |
| A | `docs/TESTING_PLATFORM.md` |
| A | `docs/VERIFICATION.md` |
| A | `docs/screenshots/coordinator-mobile.png` |
| A | `docs/screenshots/student-dark.png` |
| A | `docs/screenshots/student-light.png` |
| M | `eslint.config.mjs` |
| M | `next.config.ts` |
| A | `package-lock.json` |
| M | `package.json` |
| M | `src/app/globals.css` |
| M | `src/app/layout.tsx` |
| M | `src/components/portal/auth/login-screen.tsx` |
| M | `src/components/portal/coordinator/bulk-create-users.tsx` |
| M | `src/components/portal/coordinator/coordinator-dashboard.tsx` |
| M | `src/components/portal/coordinator/coordinator-form.tsx` |
| M | `src/components/portal/coordinator/coordinator-profile.tsx` |
| M | `src/components/portal/coordinator/coordinator-reports.tsx` |
| M | `src/components/portal/coordinator/coordinator-time-monitor.tsx` |
| M | `src/components/portal/coordinator/external-tools-setup.tsx` |
| M | `src/components/portal/coordinator/forms-hub.tsx` |
| D | `src/components/portal/coordinator/forms-list.tsx` |
| M | `src/components/portal/coordinator/import-users-sheet.tsx` |
| M | `src/components/portal/coordinator/student-detail.tsx` |
| M | `src/components/portal/coordinator/student-form.tsx` |
| D | `src/components/portal/coordinator/subscription.tsx` |
| M | `src/components/portal/coordinator/supervisor-form.tsx` |
| M | `src/components/portal/coordinator/user-management.tsx` |
| M | `src/components/portal/layout/app-shell.tsx` |
| D | `src/components/portal/layout/command-palette.tsx` |
| D | `src/components/portal/layout/keyboard-shortcuts-help.tsx` |
| D | `src/components/portal/layout/mobile-nav.tsx` |
| M | `src/components/portal/layout/page-actions.tsx` |
| M | `src/components/portal/layout/sidebar.tsx` |
| M | `src/components/portal/portal-app.tsx` |
| M | `src/components/portal/shared/assign-form-modal.tsx` |
| D | `src/components/portal/shared/blur-image.tsx` |
| D | `src/components/portal/shared/clock-widget.tsx` |
| A | `src/components/portal/shared/editorial-dashboard.tsx` |
| M | `src/components/portal/shared/evaluation-radar.tsx` |
| M | `src/components/portal/shared/form-block-renderer.tsx` |
| M | `src/components/portal/shared/form-preview-modal.tsx` |
| M | `src/components/portal/shared/google-doc-editor.tsx` |
| M | `src/components/portal/shared/jibble-timesheet-grid.tsx` |
| M | `src/components/portal/shared/person-details-slide-over.tsx` |
| M | `src/components/portal/shared/progress-ring.tsx` |
| M | `src/components/portal/shared/reassign-supervisor-sheet.tsx` |
| M | `src/components/portal/shared/school-identity-card.tsx` |
| M | `src/components/portal/shared/school-identity-modal.tsx` |
| M | `src/components/portal/shared/school-theme-provider.tsx` |
| M | `src/components/portal/shared/star-rating.tsx` |
| M | `src/components/portal/shared/submission-review-slide-over.tsx` |
| D | `src/components/portal/shared/weekly-goal-widget.tsx` |
| M | `src/components/portal/student/StudentDashboard.tsx` |
| M | `src/components/portal/student/journal-detail.tsx` |
| M | `src/components/portal/student/journal-form.tsx` |
| M | `src/components/portal/student/student-form-workspace.tsx` |
| M | `src/components/portal/student/student-forms.tsx` |
| M | `src/components/portal/student/student-reports.tsx` |
| M | `src/components/portal/student/student-workspace.tsx` |
| D | `src/components/portal/student/time-clock-view.tsx` |
| M | `src/components/portal/supervisor/evaluation-form.tsx` |
| M | `src/components/portal/supervisor/intern-detail.tsx` |
| M | `src/components/portal/supervisor/supervisor-dashboard.tsx` |
| D | `src/components/portal/supervisor/supervisor-form-viewer.tsx` |
| M | `src/components/portal/supervisor/supervisor-form-workspace.tsx` |
| D | `src/components/portal/supervisor/supervisor-forms.tsx` |
| M | `src/components/portal/supervisor/supervisor-reports.tsx` |
| D | `src/components/portal/supervisor/supervisor-time-monitor.tsx` |
| A | `src/lib/academic-term.ts` |
| M | `src/lib/client-pdf.ts` |
| M | `src/lib/csv-export.ts` |
| A | `src/lib/form-export.ts` |
| M | `src/lib/mock-data.ts` |
| A | `src/lib/prototype.ts` |
| M | `src/lib/school-themes.ts` |
| M | `src/lib/selectors.ts` |
| M | `src/lib/types.ts` |
| A | `src/lib/use-account-users.ts` |
| M | `src/lib/use-effective-school.ts` |
| M | `src/lib/use-notifications.ts` |
| M | `src/lib/use-prefers-motion.ts` |
| M | `src/lib/use-role-activity.ts` |
| M | `src/lib/validation/auth.ts` |
| M | `src/store/use-app-store.ts` |
| A | `tests/browser-smoke.cjs` |
| A | `tests/load-ts.cjs` |
| A | `tests/prototype.test.cjs` |
| M | `tsconfig.json` |

Total: 92 affected files. Generated source/build output, local databases, dependencies, and scratch scripts are excluded.


## Secondary color and tool research follow-up — October 5, 2026

The prior inventory above describes the original testing-platform implementation. This follow-up changes the following 16 paths on the same branch:

- `README.md`: school color behavior and research links; removed the demo credential table after publication review.
- `docs/CHANGE_INVENTORY.md`: this follow-up inventory.
- `docs/TESTING_PLATFORM.md`: color correction rationale, component changes, behavior and scope.
- `docs/VERIFICATION.md`: 14 regression cases and expanded branding browser checks.
- `docs/OPEN_SOURCE_TOOLS.md`: six researched projects, licensing/feature boundaries and proposed time-service proof of concept.
- `docs/screenshots/student-light.png`: refreshed colored controls on white surfaces.
- `docs/screenshots/student-dark.png`: refreshed colored controls on charcoal surfaces.
- `docs/screenshots/coordinator-mobile.png`: refreshed mobile view.
- `docs/screenshots/school-settings-light.png`: new light branding capture.
- `docs/screenshots/school-settings-dark.png`: new dark branding capture.
- `src/app/globals.css`: school color aliases for actions, selections, secondary controls and focus in light/dark mode; locally resolved preview tokens.
- `src/components/portal/layout/sidebar.tsx`: active navigation foreground and section label legibility, desktop/mobile.
- `src/components/portal/settings/school-identity-settings.tsx`: matching neutral preview, common accent swatches, selected-state accessibility, custom hex validation and current role descriptions; discard also clears validation messages.
- `src/lib/school-themes.ts`: shared light/dark tokens, contrast calculation and safe custom fallback.
- `tests/browser-smoke.cjs`: actual preview/save/discard/validation/reload checks and screenshots in both modes.
- `tests/prototype.test.cjs`: palette contrast and independent accent/custom fallback regressions.

No dependencies or external integrations were added. Other GitHub branches are outside this update.
