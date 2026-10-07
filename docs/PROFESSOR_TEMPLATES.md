# Professor-controlled practicum templates

Branch: `practo/testing-platform`. This update builds on the user's existing login and logo changes.

## Upgrade without resetting data

Stop the dev server, pull this branch, then run:

```bash
git pull origin practo/testing-platform
bun install
bun run db:setup
bun run dev
```

`db:setup` deploys the additive `20261006160000_professor_templates` migration and keeps an already populated school/database. Do not use `db:reset:test` to upgrade. The explicitly requested testing-data reset now also clears templates, assignments, reports and their assets, so old testing reports cannot reappear after a reset.

## Where each role works

| Role | Workspace | Responsibility |
| --- | --- | --- |
| Professor / coordinator | Templates & Assignments | Own the blank format, separate sample, section definitions, publication and assignments |
| Professor / coordinator | Submission Reviews | Review assigned sections, assemble Word, inspect a version-update diff |
| Student | My Practicum Report | Write assigned answers, preview assembled content, export editable Word for the grammarian |
| Supervisor | My Interns → intern → Review practicum report | Review student work; answer sections explicitly assigned to the supervisor |

The supervisor's global Report Builder navigation is removed. Earlier independent/combined drafts remain accessible in a separate expandable area; no previous report is overwritten or converted automatically. Students cannot read combined dossiers containing another student's records.

## First working pilot

1. Sign in as a coordinator and open **Templates & Assignments**.
2. Click **New template from pilot**. The clean starter derives its Letter paper, 1.5-inch left margin, one-inch remaining margins, header/footer, styles and logos from the supplied practicum sample. Filled sample names, narrative answers, body pictures and source document metadata were removed.
3. Expand a section to edit its title, instructions, source, respondent, required flag, page-break setting and linked published forms. Add a genuine custom section, remove sections, or reorder them.
4. Checks/publication automatically synchronize owned section placeholders when needed. You can also click **Sync Word sections** to update the owned section placeholders in the draft. Download and inspect the format. Edit fixed wording, logos, styles, page layout and other complex formatting in Word, then upload that mapped blank DOCX.
5. Upload a **separate filled example**, if useful. It has its own in-app text preview and download. Example answers never initialize student responses.
6. Resolve the publication checklist and click **Publish new version**. Ready active students are selected by default. Review missing account/supervisor reasons, the optional due date and published version, then confirm **Assign reports**.
7. Students open their blank assignment under **My Practicum Report**. Each section shows its responsible respondent and instructions. Linked forms open the existing real form-filling workspace. Journals and attendance use saved records; approved form responses use their captured form snapshots.
8. Mark completed sections ready for review. Reviewers approve or request revision with feedback. Export a full report or one chunk to Word, and retain a grammarian-reviewed DOCX alongside the export version.

Required sections cannot be removed, retitled, reassigned or excluded by the respondent. A supervisor cannot rewrite student answers or review the supervisor's own assigned response. A coordinator uses the review action for student work rather than rewriting a student's assigned answer.

Opening a linked supervisor form from a report carries that report's intern into the form workspace. If the requested recipient is no longer eligible, it does not silently select another intern.

## Word mapping

Metadata placeholders can appear in normal text, including headers and footers:

```text
{{report_title}}  {{student_name}}  {{student_number}}  {{course}}
{{company_name}}  {{company_address}}  {{supervisor_name}}  {{school_name}}
{{placement_start}}  {{placement_end}}  {{required_hours}}
{{completed_hours}}  {{report_date}}
```

Each dynamic section has a stable key. Put its placeholder on **its own body paragraph outside a table**, for example:

```text
{{section_reflection}}
{{section_journals}}
{{section_program_evaluation}}
```

The portal replaces that paragraph with native Word headings, paragraphs, tables and images. Word format changes remain the professor's responsibility. It does not guess which text in a filled sample represents an answer, automatically parse arbitrary school forms, or recreate a full Word editor in the browser.

To permit optional student-written extras, enable the template setting and include `{{extra_sections}}`. These custom narratives cannot become required core sections. On a version upgrade, extras remain active when still allowed; otherwise their answers remain archived.

Sync changes only owned slot paragraphs. It uses existing slot positions in configured order, removes retired slots and appends additional slots before the final section properties. It preserves surrounding fixed text. Download and inspect layout after structural edits, especially if the original format interleaves fixed instructions with placeholders.

Student evidence uploads are prohibited in this pilot. Image sections use descriptions/captions and labelled placeholders, including in Word. Existing saved evidence remains accessible.

Full exports retain the uploaded format's fixed content and geometry. Chunk exports remove unrelated body content while retaining the source header/footer, styles and final section geometry. PDFs and other DOCX evidence remain original companion files in the ZIP; they are not silently merged into report pages.

## Version and response safeguards

- Draft changes use optimistic revisions, serialized autosave, browser recovery and navigation save guards. A conflict returns an error and retains local text.
- Published Word bytes, section configuration and optional example bytes are immutable. New publications get new version numbers.
- Repeating a version/student assignment returns the same report; it does not create duplicate reports or discard answers.
- Publishing does not move an ongoing assignment automatically. **Update assigned format** shows added, changed and archived sections first. Applying it matches answers by stable section key, preserves IDs/evidence, returns changed sections to draft, archives removed answers and retains prior Word exports.
- A second report already assigned on the target version blocks an ambiguous migration instead of silently replacing it.
- Published custom forms use the existing form lifecycle: response snapshots freeze when a respondent opens the form. Template publication freezes the Word layout and section definitions; it does not create an additional revision system for external linked forms. For changed rubrics, duplicate/publish a new form and link its new ID in a new template version. Assignment fails clearly if a linked form was archived.
- Archiving a template stops new edits/assignments while preserving existing assignments and downloads.
- Template uploads: 20 MB per DOCX, up to 500 ZIP entries and 80 MB expanded content. Unknown, duplicate, mixed-content or table-nested section tags fail validation. Invalid XML, macro/embedded-object packages and external document resources are rejected. No template bytes are exposed outside the school and assignment permissions.

## Evaluation improvements

Rating rows now have explicit **Scored item / Heading** roles. The three known legacy program-evaluation group headings are also recognized without treating every uppercase criterion as a heading. Headings have no score input, no required-rating error and no numeric contribution.

The actual rating buttons now save numeric strings, matching server validation. Historical scale-label responses remain readable, valid and exportable. Weighted zero is valid. Configured total/average summaries remain incomplete until every scored row has a valid response; summary values are descriptions of the configured scale, not automatically invented grades.

Word rating tables use a wide criterion column, compact score columns and merged heading rows. Journal tasks and learnings use full-width cells so long answers do not waste half the page beside an empty label column. Wet-signature spaces remain separate from electronic signing.

## Files and boundaries

- `src/domain/templates`: strict format contracts, pilot defaults and mapping validation.
- `src/server/templates/service.ts`: coordinator authorization, draft files, publication, version downloads and archival.
- `src/server/templates/assignments.ts`: assignments, linked-form recipients and explicit format migration.
- `src/server/templates/word.ts`: bounded DOCX inspection, slot synchronization and mapped exports.
- `src/components/portal/templates`: section settings, configuration, sample preview and version-update UI.
- `src/hooks/use-template-draft.ts`: autosave, recovery and navigation guard.
- `prisma/migrations/20261006160000_professor_templates`: additive storage.

No new external server, API key or separate self-hosted tool is required for this workflow. Word remains the final editable layout/grammarian artifact. In-app previews show content rather than exact Word pagination. Validation uses Chromium and LibreOffice/PyMuPDF; actual Microsoft Word, Safari/iOS and physical devices are not claimed tested.
