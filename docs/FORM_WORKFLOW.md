# Form workflow and local testing

This update targets `practo/testing-platform`. Local SQLite remains the database; no Supabase service or keys are required. Existing login assets and account data are retained. Research and acceptance criteria are recorded in [FORM_WORKFLOW_PLAN.md](FORM_WORKFLOW_PLAN.md).

## Coordinator workflow

1. Open **Practicum → Form Library** (also **Forms** in navigation). Create/edit a draft, use Undo/Redo for content, Preview, Blank Word, Sample Word or PDF. Rating headings group criteria and never require scores.
2. Publish the library form. Link it to a **Forms** section in **Set up format** and choose the student or supervisor respondent. Instructions and sections have their own session Undo/Redo.
3. Download the starter Word. Keep the supplied page size, margins, headers and footers. Put section placeholders on separate ordinary body paragraphs; keep metadata placeholders inside ordinary text. Use **Sync Word sections** after adding/removing sections.
4. Run **Check format** or **Generate Sample Word**. The server inspects the package and placeholders and builds fictional content. Resolve errors. Open Sample Word in Microsoft Word to inspect page breaks, tables and headers/footers, then confirm publication. Structural validation cannot certify pagination in every Word renderer.
5. Select the immutable published version, class/batch and recipients. The whole recipient row is tappable. Search, select all visible, review the names/version/due date, then confirm. Assignment runs in batches of 25 with progress. Successful batches survive a later failure; retry the same version/recipients to reopen existing reports without duplicates.
6. Students answer their report's linked forms; supervisors answer only their assigned interns' requirements. Approved contextual answers appear in the corresponding report section. Review sections and export the combined Word for the grammarian. Wet signatures stay blank for printing.

Assignment is an explicit roster selection, not a subscription for future enrollees. New students must be selected later. Coordinator scope currently follows the existing school boundary; teacher/class ownership and future cohort automation need a separate data model before a multi-coordinator beta.

## Editing and preservation rules

| Situation                                                       | Behavior                                                                                                                                                                                 |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ordinary never-submitted draft                                  | Follows a newer published library version; retained answers are revalidated against the current fields.                                                                                  |
| Submitted, approved or returned-for-revision response           | Retains its captured rubric. Republish does not silently change historical scoring.                                                                                                      |
| Form linked to an assigned report                               | Retains the definition pinned to that published report format. Use the existing explicit format upgrade flow for a newer version.                                                        |
| Unused library form                                             | Confirmation moves it to **Trash**, available through the status filter. Restore returns a draft. Permanent deletion requires another confirmation and a server check.                   |
| Form with assignments, responses or published-format references | Deletion is blocked. Archive retains records and existing report rubrics, while preventing new ordinary responses.                                                                       |
| Editor history                                                  | Up to 50 session steps; consecutive typing is grouped. New edits clear Redo. Reload/navigation resets history. Files, answers, publication and assignment are outside content Undo/Redo. |
| Conflicting undo                                                | Expected draft-content signature must match the saved content. The server rejects a stale restore rather than replacing another edit. Object key ordering is ignored.                    |

Word exports are authenticated. Coordinators can generate fictional samples. Respondents can download their saved answered response; another person's response is unavailable. Blank and answered exports identify the form version. PDF uses the existing form export renderer.

## Finished testing example

As a testing coordinator, open **Practicum → Prepare completed demo**. It creates a separate fictional student and supervisor, 32 completed attendance sessions totaling exactly 250 hours, 32 approved daily journals, a submitted native evaluation, approved linked reflection/evaluation forms, reviewed sections and a real exported Word report. Open **completed report** to inspect the result, or switch through the existing testing-account picker to the named completed student/supervisor.

Repeated or simultaneous setup reopens the same fixture and preserves existing accounts/answers. Fixture preparation intentionally uses service APIs to publish, assign, review and export; it inserts fictional approved data only for its separate demo profiles. It is restricted to enabled demo coordinators in the testing school, and is unavailable to ordinary student/supervisor accounts. Do not run database reset to obtain this example.

## Upload policy

Optional `.env` settings (restart after changes):

```dotenv
PORTAL_STUDENT_IMAGES=true
PORTAL_STUDENT_UPLOAD_MB=3
PORTAL_STUDENT_IMAGE_COUNT=5
```

Set the first flag to `false` to block new student image uploads. Existing evidence remains readable. The byte budget covers evidence and grammarian-reviewed uploads across reports owned by that student. Generated exports do not consume that personal upload budget, but still consume the existing school/report quotas. Duplicate evidence in the same report/section is reused before quota checks.

Images are decoded, oriented and resized to at most 2000 pixels, preserving aspect ratio without upscaling. These changes reduce repeated large photos; they do not make storage unlimited. For example, 200 students each using the full 3 MiB personal budget would account for about 600 MiB before templates, generated Word files and other assets. The existing school quota can stop uploads earlier. Choose an image policy and measured storage budget for beta rather than assuming every allowance fits a free hosting plan.

## Persistence boundaries and future migration

Current flow is **UI → authenticated endpoint → domain actions → SQLite adapter**. `src/server/persistence/school-state.ts` handles school snapshot decoding and revision-checked writes. `write-queue.ts` queues aggregate commands per school inside one server process and retries only transient database transaction timeouts. Database write locks, revisions and command receipts remain authoritative; the queue does not replace cross-process database checks.

`src/server/storage/policy.ts` and `normalize-image.ts` separate budgets and image normalization from report routes. Files still live in local database records. The portal's school data is still a JSON aggregate, while reports, versions, accounts and assets already have separate tables. This is preparation, not a completed PostgreSQL migration.

Before Supabase beta: normalize school entities and form definitions/versions/assignments/responses; migrate attachments to private object storage behind an adapter; enforce school and respondent ownership on every row/object; map current receipts/revision conflicts to transactional Postgres writes; preserve identifiers, rubric snapshots and file hashes; backfill and verify counts/hours/answers; test rollback and backup recovery. Retest multi-worker writes and realistic simultaneous users after migration. No Supabase integration was added in this update.

## Verification, 7 October 2026

| Check                                 | Result                                                                                                                                                                                                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production build and TypeScript       | Passed on installed Next.js 16.3.8 / Node 24.                                                                                                                                                                                                                                   |
| ESLint                                | Zero errors; 22 existing initialization warnings remain.                                                                                                                                                                                                                        |
| Core/domain tests                     | 29 passed: history, heading/rating rules, publication policy, Trash, conflict checks, attendance and prior workflow behavior.                                                                                                                                                   |
| `npm run test:form-quality`           | Real HTTP ownership/Word exports, publication across two ordinary drafts, historical response preservation, Trash/restore/purge, preflight/revision conflicts, completed fixture/idempotence; 320px editor and deletion UX, desktop report navigation; zero browser exceptions. |
| Capacity fixture                      | 200 recipients in batches of 25, retry of the first batch without duplicate assignments, 10 concurrent isolated answer writers. Passed after fixing local SQLite lock contention. This is not a 200-simultaneous-user benchmark.                                                |
| `npm run test:upload-policy`          | Image count and byte limits, duplicate reuse, disabled-image gate, atomic quota rejection retaining saved assets.                                                                                                                                                               |
| Existing templates/connected workflow | Authenticated API, 320px/desktop browser and editable Word/PDF checks passed.                                                                                                                                                                                                   |
| New exported documents                | Completed demo: 22 pages; library sample: 1 page; format sample: 3 pages. Rendered with LibreOffice and checked for text outside page edges; no edge overflow found. Rating table visually checked with an unscored heading and blank wet signature.                            |
| Prior long document fixture           | 44-page Word/PDF regression retained journals, 250 hours, narrative, images, tables and supplied margins/header/footer.                                                                                                                                                         |

All server/browser fixtures use disposable SQLite databases. Screenshots: [history](screenshots/form-history-mobile.png), [Trash confirmation](screenshots/form-trash-confirmation-mobile.png), [completed report](screenshots/completed-report-desktop.png), [format setup](screenshots/templates-mobile.png).
