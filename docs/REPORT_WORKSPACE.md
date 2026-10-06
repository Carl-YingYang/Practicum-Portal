# Report Builder, forms and notifications — October 6, 2026

Built on Carl’s `7bc2cf9` login/create-account update, exclusively for `practo/testing-platform`. Login source, SVG, existing AI demo and school onboarding remain unchanged. Electronic signatures and live AI integration are deferred.

## Upgrade without resetting data

Stop the development server first. Back up the database identified by `DATABASE_URL` in your local environment; evidence and Word versions are stored in that same persistent SQLite database.

```bash
git switch practo/testing-platform
git pull --ff-only origin practo/testing-platform
npm ci
npx prisma migrate deploy
npm run dev
```

The additive migration creates `PracticumReport` and `ReportAsset`, plus account notification preferences. It does not reset accounts, attendance, journals, forms or password hashes. Do not use `db:reset` for this upgrade. Existing deployment needs persistent database storage and backups; ephemeral/serverless local SQLite does not preserve uploads reliably.

## Build the report in chunks

Open **Report Builder**. Students create their own report. Coordinators can create an individual report or a combined report for students from the same company. Shared front/company sections appear once; each student has a separate dossier. Students cannot read other students’ combined dossiers. Supervisors can access reports only when all members are their assigned interns, and review assigned personal sections without rewriting narratives.

Choose an editable section template, write its content and mark it ready for review. The catalog includes front matter, company/organization/technology, assignment, journals, reflection, recommendations, evaluations, attendance and appendices. Optional sections start excluded; include only those your institution requires. Templates contain prompts, not copied student information or invented school scoring instruments.

Narratives accept plain paragraphs and basic Markdown headings, bold text, lists and pipe tables. These export as editable Word paragraphs/tables. Journals bind to existing saved entries; forms bind to approved response snapshots and submitted evaluations. Completed attendance is calculated from exact minutes, overlapping records are deduplicated and active sessions excluded. Reporting periods use each journal’s captured cadence. A changed linked record after review triggers a new-review checklist warning.

Autosave serializes requests and saves edits made during a slow save. Failed requests retain local text, show retry/download controls and guard navigation. Account/report-scoped browser recovery can restore unsaved drafts. Closing the browser does not guarantee a pending network save completes; save first or use recovery on reopening. Conflicting revisions return 409 rather than replacing another session’s work; download the local draft, reload and merge deliberately.

## Evidence and Word review

Upload PNG/JPEG, PDF or DOCX evidence, up to **32 MB per file**. Images are validated, normalized for EXIF rotation and capped at 40 megapixels. Add captions, rotate by quarter-turns and reorder within the section. Images fit without cropping; rotated images are physically rotated for Word. PDF and DOCX attachments remain separate original files in the ZIP, with captions/references in Word; their pages are not automatically merged into the report.

Limits are **200 stored files / 250 MB per report**, including evidence, generated DOCX/ZIP and reviewed uploads. Exports are immutable, so repeated exports consume storage. Start a separate report when the limit is reached. There is no cloud storage service or deletion lifecycle in this prototype.

Export one section, one student chapter, or the complete report. The checklist catches missing text/evidence, excluded required sections, unapproved journals/forms, duplicate periods and review status. Export with outstanding checks requires explicitly selecting draft export. A draft is not an approved institutional submission.

Word defaults to Letter, Times New Roman 12, left margin 1.5 inches and other margins 1 inch. Paper/font settings can be adjusted. Headings, table-of-contents field, restrained school header, page-number footer, student dividers, editable narrative tables and wet-signature spaces are generated. Open the DOCX in Word and use **References → Update Table**; check pagination against your school’s actual format.

Each export creates a numbered snapshot with a source fingerprint, DOCX and ZIP. ZIP contains selected evidence originals and a manifest/checklist. Download the Word version, have the grammarian edit it, then upload the corrected DOCX under that exact version. The original export and reviewed upload stay intact. Creating another version never overwrites corrected Word. Arbitrary Word Track Changes or comments are not imported into portal sections; reconcile desired changes manually before a subsequent export. The browser preview is a content preview, not pixel-identical Word pagination.

## Forms that can be used

Four one-tap starters: practicum journal, site evaluation, reflection/self-assessment and general feedback. The creation wizard previews included questions, stays draft by default and supports an actual named-recipient picker. Review institutional wording/scoring in the editor before publishing. A blank form must be built in the editor first.

Publishing validates required block text/labels, unique IDs, rating criteria, weighted maxima and 2–10 distinct scale labels. Weighted zero is valid; values outside the maximum are rejected. Basic conditional questions compare an earlier unconditional text answer to one value, ignoring case/outer spaces. Hidden questions are not required and are excluded from exports. Nested conditions, arbitrary formula scoring and multi-page branching are not implemented.

Published forms must be unpublished or duplicated before editing. Response snapshots retain the version the respondent started. Forms with responses must be archived instead of deleted. Answer saves are serialized, retain text after failure and support browser recovery. Supervisor intern switches wait for the current save. Clear and submit actions ask for confirmation, wait for persistence and retain errors instead of claiming success early.

## Notification sound

Notifications reflect journal submission/review, form assignment/review, evaluation submission and attendance-correction events. Stable event IDs prevent repeated alerts. Read/seen state, sound and volume are saved per account. Sound starts off; enable it or use **Test sound** in the notification menu. A short Web Audio tone plays only for newly observed events while the portal is active; initial load/reload stays silent. Browser interaction may be required to activate audio. No background browser push, email or native notifications are added.

## Structure and verification

- `src/domain/reports/`: typed sections, templates, content/checklist/attendance rules.
- `src/server/reports/`: scoped services, optimistic locks, bounded uploads, evidence/export storage and Word assembly.
- `src/app/api/reports/`: authenticated route handlers; `src/client/reports.ts` transport.
- `src/components/portal/reports/`: list/editor/content previews; `src/hooks/use-report-draft.ts` recovery and serialized persistence.
- `src/domain/form-templates.ts`: starters and reusable form/condition/rating validation.
- `src/hooks/use-form-draft.ts`: response persistence; notification hook/API provide account-scoped preferences.

Run a fresh production build before integration/browser suites. They migrate disposable databases and do not reset your development database. Run development-login tests after production suites stop; they replace build output. New commands: `npm run test:reports`, `npm run test:reports-ui`, `npm run test:reports-doc`. The document test additionally requires LibreOffice (`soffice`) and Python with PyMuPDF (`fitz`); these are test tools only, not app runtime requirements. See [verification](VERIFICATION.md) for actual results and [implementation plan](REPORT_WORKSPACE_PLAN.md) for acceptance criteria.

Verified content uses fictional fixtures; uploaded student reference documents and their personal scans are not shipped. DOCX internals and LibreOffice-rendered output are tested, including a 57-page fixture. Actual Microsoft Word, physical phones and Safari/iOS still require manual acceptance. This prototype has no claim of pixel-identical reproduction of the supplied final reports.
