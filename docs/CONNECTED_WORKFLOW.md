# Connected practicum workflow

## Where to start

Coordinator navigation now has one **Practicum** workspace: **Set up format → Assign students → Review & export**. **Form Library** remains available for making and reviewing reusable forms. Journals, timesheets, native evaluations, older independent drafts and external links remain accessible under **Browse saved records & earlier drafts**. Existing routes and records remain available.

The header's **How to use** button opens a short guide for the current role, including the difference between a submitted form response and a reviewed report section. On mobile it is the question-mark button.

## Connect an evaluation to a report

1. In Form Library, create or open a form. Add named questions/rating criteria, set required fields and publish it.
2. Open its editor and choose **Add to practicum report**. Select a report format and either an existing form section or a new section. Choose **Student** or **Assigned supervisor**, and whether the section is required.
3. **Save link to format draft** changes only that draft and updates its Word placeholders. It does not change ongoing assignments. **Open format to publish** brings you to the format editor.
4. Inspect the blank Word file. Section keys/copy controls are under **Word mapping (advanced)**. Add a cycle/batch label, publish a new format version and assign students.
5. The student/supervisor opens the exact requirement from their assigned report or Forms inbox. The header identifies the intern, cycle, section, format version and rubric version. Save answers, then submit.
6. Coordinator: **Practicum → Review form responses**. Approve or request revision. In the report, mark the completed section ready, then have its responsible reviewer review it. A supervisor cannot approve their own supervisor requirement.
7. Preview, resolve the export checklist and build Word. A draft export requires the explicit incomplete-export choice. The Word remains editable for external grammarian review; upload the reviewed DOCX against the export they checked. Wet signatures remain outside the portal.

A newly published form section must link a published library form. Library forms stay editable through their existing draft/publish flow; report-format publication captures a fixed definition. Uploading/editing Word does not automatically import questions or answers. A professor still verifies the blank layout and wording.

## What is linked and protected

| Record | Behavior |
| --- | --- |
| Published report format | Keeps its Word bytes and a shared, fixed definition of each linked form. Internal definitions are hidden from the editable library. |
| Assigned report | Records format version, student, cycle, respondents and section-to-assignment links. One shared rubric serves many students; each requirement gets a distinct response context. |
| Form response | Belongs to an assigned report/section/intern. Reusing a form twice creates two separate requirements; approving one does not complete the other. Browser draft recovery uses that context too. |
| Explicit format upgrade | Retires previous response assignments, retains saved answers and exported Word files, and creates the new requirement contexts. Old responses are not silently reused for a new rubric. |
| Attendance and journals | New official reports use their saved placement dates in Philippine time. Completed attendance is clipped to that window; overlapping journal periods are included. Saved portal records are not changed. |
| Existing formats and independent drafts | Keep their original behavior and records. New context rules apply to newly published formats; legacy versions are not rewritten. |
| Native evaluations | Remain available as saved records and in legacy independent reports. A new official evaluation section uses an explicitly linked form response. |
| Generated Word | Captures approved linked responses; same requirement filtering drives the portal preview/checklist. Existing downloaded/exported files remain unchanged. |

Changing the original form, school preferences or a newer format does not silently replace an ongoing report's rubric. A context-backed form requirement cannot be independently reassigned/unassigned through the generic form API. Unauthorized, retired and wrong-intern writes are rejected on the server.

## Guided testing

With testing enabled, sign in as a testing coordinator and open **Practicum → Prepare guided sample**. This creates a short, one-page-capable format with three blank requirements using existing fictional accounts:

- Student: introduction and reflection response.
- Supervisor: intern evaluation with two scored criteria and an average.
- Coordinator: approve responses, review the three ready sections and export Word.

The setup is repeatable/resumable, coalesces simultaneous requests in the running server, keeps accounts/answers, and does not auto-approve anything. It is rejected for student/supervisor callers, non-demo coordinators or disabled testing mode. If the sample is archived, use your own format; it is not silently recreated. A deterministic template ID and existing assignment identity prevent duplicate reports; a conflict across separate server processes should be retried rather than resetting data.

## File storage on limited resources

No image-hosting subscription or extra server is required for this prototype. Files remain in SQLite with these bounds:

- Report images: PNG/JPEG, corrected orientation, maximum 2000 × 2000 inside the original proportions, no upscaling. JPEG quality 85; PNG compression preserves lossless pixels at the normalized size. Images are normalized copies; PDF/DOCX uploads retain their original bytes.
- Upload limits: 32 MB per report file; 20 MB per format/reference file. Reports retain the existing 200-file bound and now have a 100 MB file budget.
- School file budget: `PORTAL_STORAGE_MB=512` by default, configurable from 1 through 102400 MB. It counts report assets, blank/reference drafts and immutable template versions. It is a file-byte budget, not an estimate of total SQLite/database disk usage.
- Identical normalized evidence in the same report/section, or identical reviewed Word in the same export, is reused. Repeated unchanged exports with the same selected sections reuse their saved files.
- **Practicum → File storage** shows actual usage. Remove unused evidence in its report. **Export history → Storage cleanup → Clean older ZIP bundles** removes old unreviewed ZIPs only. All Word exports, the newest bundle and bundles with grammarian companions remain saved. Version history remains visible even when a ZIP has been removed.
- Existing files remain readable if a lower budget is configured. Growth is rejected transactionally; failed uploads do not leave a partially saved file or incremented revision. Cleanup permits no external account access.

Back up the SQLite database before deploying. Hosting must preserve its database file across redeploys. Image normalization and caps reduce growth; they do not make storage unlimited. Institution-specific retention, durable production hosting and device/Microsoft Word compatibility remain deployment work.

## Update an existing installation

Stop the development server and back up the database. Pull only the testing branch, install dependencies, deploy the additive migration and regenerate Prisma before restarting. Preserve your existing `.env` and database.

```bash
git switch practo/testing-platform
git pull --ff-only origin practo/testing-platform
npm ci
npx prisma migrate deploy
npm run db:generate
npm run dev
```

Bun alternative: `bun install`, `bunx prisma migrate deploy`, `bun run db:generate`, then `bun run dev`. Do not use a reset command to apply this update. The migration adds nullable content hashes and an index; existing files do not need to be re-uploaded.

## Verification commands

```bash
npm run test:connected
npm run test:connected-ui
```

The connected tests create disposable migrated SQLite databases. They cover the real three-role flow, fixed rubrics, direct draft linking, report/section/intern isolation, explicit upgrades, placement-window boundaries, upload normalization/deduplication, atomic quota failure, unchanged-export reuse and cleanup retention. Browser checks exercise the actual UI at 320 × 568 and desktop, including login buttons, guides, submissions, reviews, preview and export. See `VERIFICATION.md` for the regression checks run with this update.
