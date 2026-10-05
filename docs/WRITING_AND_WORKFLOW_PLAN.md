# Writing and workflow polish — October 5, 2026

Baseline: `b31510c` on `practo/testing-platform`. Publish only this branch.

## Implementation scope

1. Optional, lazy-loaded Writing Assistant drawer with grammar/formal/reflection actions. Local deterministic demo responses are visibly labelled; no provider calls, keys, AI login, credits or live AI claims. Preview, insert, replace selection and guarded undo; never generate attendance hours or invent activities.
2. Account-owned language/detail preferences, stored on the server, with authenticated, validated and same-origin writes. Future provider integration replaces the demo adapter, not the editor.
3. Serialize draft saves and retain newer edits during slow replies. Guard all in-app navigation and account switching while an editor is dirty. Offer retry, prevent edits of locked journals, and reopen saved drafts from the list.
4. Compact journal rail with status filters, journal numbering and period/prior/cumulative attendance. Report completed attendance separately from journal-reviewed coverage; pending/revision work never earns extra attendance hours.
5. Keep shared Student → Supervisor → Coordinator records and cadence settings. Verify revision/resubmission/approval and old cadence preservation. Improve review wording, pending/error feedback and a readable status timeline.
6. Provide testing-only scenario selection using eligible seeded accounts, realistic starter/pending/revision/draft/completed states and coordinator-only explicit shared reset. Normal seeding/migrations preserve existing data.
7. Equal desktop login halves, full contained hero images and automatic existing fades; retain the compact single mobile login. Give modal/drawer close controls 44px targets and reserved header space, including the form wizard from the screenshot.
8. Verify typecheck, domain tests, lint, production build, HTTP integration, login development guards, and browser flows at desktop/mobile in both themes. Record screenshots and exact results in verification/change inventory docs before publishing.

## Constraints

- White primary surface, optional dark theme, school/secondary accents, minimal motion.
- Preserve attendance as the source of rendered hours. Journal approval reviews coverage; it does not clock time or double-count overlapping periods.
- No OmniRoute setup is needed for this pass. No live AI endpoint is enabled yet.
- No secret credentials or database contents in commits. No updates to other GitHub branches.
