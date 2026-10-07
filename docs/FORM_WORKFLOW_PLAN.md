# Form workflow quality plan — 7 October 2026

Scope: local SQLite testing only, on `practo/testing-platform`. Preserve login assets and copy, existing answers, assigned report versions and wet-signature workflow. No Supabase connection, AI or database reset.

## Research and decisions

- W3C modal/alert-dialog patterns recommend confirmation and focusing the least destructive choice: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- Bounded past/present/future editor history, isolated from published records and answers: https://redux.js.org/usage/implementing-undo-history/
- GOV.UK error summaries and task lists connect blocking errors to useful actions: https://design-system.service.gov.uk/components/error-summary/ and https://design-system.service.gov.uk/patterns/complete-multiple-tasks/
- Follow the installed Next.js backend-for-frontend and state-preservation guides. Authorization stays on server endpoints; external storage is a future adapter, not a browser credential.

## Execution and acceptance

1. Safe library lifecycle: confirmation, unused drafts moved to Trash, restore to draft; used forms archived; permanent deletion checked on server. Never erase responses or pinned definitions.
2. Republished ordinary forms update never-submitted drafts consistently. Submitted/revision responses and report rubrics retain their definitions. Heading rows are excluded from scores.
3. Undo/redo for library drafts and report-format settings. Bounded session history, ordinary text grouping, redo invalidated on new edits, conflict checks before restoring server drafts. Visible preview, blank/answered Word and PDF exports.
4. Word setup guide/starter, structural checks and a deterministic sample build before publication. Human layout review remains necessary. Batch recipients have search/section filters, select-visible, whole-row targets, confirmation, progress and retry-safe batches.
5. Separate finished fictional student/supervisor, 250 actual completed hours, approved journals/forms, reviewed report and a real Word export. Setup resumes without rewriting existing test data and is restricted to demo coordinators.
6. Keep local storage but extract file normalization/policy and school state access boundaries. Optional image gate and student upload budgets; future Postgres normalization documented rather than claimed complete.
7. Regression: unit tests, real authenticated HTTP flow, UI at 320px/desktop, Word inspection, build, typecheck, lint and existing connected workflow. Capacity fixtures exercise 200 recipients and concurrent saves; no promise of 200 simultaneous production clients from a synthetic test.
