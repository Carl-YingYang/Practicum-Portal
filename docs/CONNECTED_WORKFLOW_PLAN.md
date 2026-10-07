# Connected practicum workflow — implementation plan

Base: `c61d7a6`, testing branch only. Preserve the user's login, heroes, SVG and copy. Do not reset the development database. No AI, electronic signatures or extra school verification.

## User outcome

A coordinator publishes an evaluation, selects **Add to practicum report**, chooses the section/respondent, publishes the updated format and assigns it. Each respondent sees the correct student/cycle/form version. Approved responses appear consistently in preview and Word. A guided sample and task-specific help make this discoverable.

## Implementation boundaries

1. Add a lazy Practicum workspace with setup, assignments/reviews and saved-record shortcuts. Group coordinator navigation around tasks; retain old views and records. Separate official reports from independent drafts, add progress and next actions, and provide a reusable role-specific help panel.
2. Add coordinator-only, revision-checked form linking and **Used in** relationships. Modify drafts only; published/ongoing assignments never change silently. Generate section keys behind simple labels and copy controls.
3. Freeze shared internal form definitions on report-format publication. Scope new form assignments/responses to their report and section. Keep legacy assignments readable, prevent editing internal published definitions, retire superseded assignment contexts and isolate draft recovery keys. Scope new official reports to their placement period. Reuse the existing school aggregate for small shared form snapshots rather than duplicating a definition for every student.
4. Add a gated, repeatable guided-demo setup using existing fictional test accounts. Create a short, real format and linked student/supervisor forms; do not reset accounts, overwrite answers or auto-approve submissions.
5. Normalize report images with a bounded resolution and encoding; retain PDF/DOCX originals. Add a configurable school budget covering template files, versions and report files. Show actual usage, deduplicate equivalent evidence and unchanged exports, and offer deliberate cleanup of old unreviewed generated bundles while retaining the latest and grammarian-linked versions. Existing oversized records stay readable.
6. Add integration/browser checks for direct linking, frozen rubric, context isolation, multi-intern targeting, preview/Word parity, quota enforcement, image limits/deduplication, retention guards, help and the full guided cycle at mobile/desktop. Run existing relevant login/account/report/template regressions after the final production build. Publish only after all required checks pass.

## Research decisions

- GOV.UK task lists support a clear set of tasks with descriptive status rather than treating a menu as a completion guide: https://design-system.service.gov.uk/components/task-list/ and https://design-system.service.gov.uk/patterns/complete-multiple-tasks/
- Prisma 6 interactive transactions and optimistic revision checks support atomic scoped assignment writes: https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions
- Sharp resize `withoutEnlargement` and explicit output settings bound image dimensions while avoiding upscaling: https://sharp.pixelplumbing.com/api-resize/ and https://sharp.pixelplumbing.com/api-output/

No new external hosting or API dependency is required. SQLite-backed file storage remains a bounded prototype; hosting durability, institutional retention policy and Microsoft Word/device testing remain separate deployment work.
