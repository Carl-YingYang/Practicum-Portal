# Report workspace implementation plan

Authorized scope: implement the consolidated October 6 plan, iterate/test and publish only `practo/testing-platform`. Base refreshed against GitHub: `7bc2cf9` (Carl’s updated create-account login). Existing login and SVG remain Carl's authored design.

## Reference and decisions

The provided Nieva–Francisco and Casera–Dela Cruz Word reports establish shared cover/company/front matter, separate personal chapters, six/seven journal periods, narrative reflections, evaluation matrices, photos and scanned appendices. Default: Letter, left 1.5 inch and other margins 1 inch, configurable typography. Do not ship their personal contents/scans as demo data. Templates contain prompts, not fabricated company facts or school ratings.

Single-student reports: student author; coordinator can edit/review. Combined reports: coordinator assembles selected students from the same company; shared sections occur once. Assigned supervisors review personal sections without editing narratives. A student cannot access another student's dossier through combined reports.

Word is the editable review artifact. Export snapshots and grammarian-reviewed uploads are immutable; a new export creates a new version. Arbitrary Word Track Changes roundtrip import is explicitly out of scope. Wet-signature spaces/scans only. AI and school verification remain deferred.

## Sequence and acceptance

1. Additive database migration for report content/assets; authenticate and scope all reads, writes and downloads; revision conflicts must retain local text.
2. Reusable section templates, journal/form/attendance bindings, section status/review, selected/chapter/full exports, evidence organizer and immutable version history.
3. Word builder with heading/TOC fields, paper/margins, header/footer, proper paragraphs/tables, image fit/rotation and uncropped long content. Use completed attendance, exact minutes, captured reporting cadence and immutable exports.
4. Form structural validation, starter templates, snapshot-safe submissions and real pending/error feedback. Notification events with stable IDs/timestamps, account-scoped read state, optional sound and no initial/reload playback.
5. Test isolated databases: HTTP ownership, optimistic conflicts, signed-document retention, long DOCX internals/rendering and real 320px/desktop workflows. Run existing account/journal/form/responsive regressions, typecheck/lint/build. Record evidence and practical limits.

Storage: report assets stored with the existing persistent SQLite database, not temporary filesystem URLs. Initial limits must be visible and enforced. Deployed hosts still require persistent database storage and backups.
