# Linked requirements and placeholder evidence polish

Branch: `practo/testing-platform`. Baseline: `6d4025b`. Carl explicitly authorized publication on October 7, 2026, after local implementation and verification. Preserve his login, hero, SVG and copy edits. No Supabase, AI or digital signatures.

## Problems confirmed in the eight screenshots

- Supervisor cards repeat the same title for multiple interns without pending totals or a clear checklist.
- A report-bound supervisor form shows unrelated disabled intern picker buttons.
- `Name of Department` falls through to a broad `name` match and receives the student's name.
- Missing `extra_sections` mapping and an unlinked Evaluation Forms section make Publish unavailable; the publication panel omits the form-link blocker.
- Assignment disables the complete roster until publication, starts with zero recipients, and hides missing supervisor/account readiness until an assignment fails.
- Optional coordinator sections start excluded, so configured sections can appear absent.
- Students cannot inspect/download submitted supervisor forms through their own portal.
- Student image prohibition was an optional environment gate rather than a fixed pilot policy.

## Execution

1. Add server-derived recipient previews for draft and immutable published versions. Select ready active students by default, show blocked reasons and already-assigned reports, and recheck accounts before batch writes. Keep recipient confirmation and version isolation.
2. Publication saves, synchronizes owned section placeholders when necessary, builds a fictional Word sample, and opens confirmation only after checks pass. Errors link to the exact expanded section or Word mapping panel. Generated section keys stay stable.
3. Group supervisor tasks by intern with To do / Awaiting review / Approved counts, text badges and subtle colors. Report-bound forms show the single actual intern without an unrelated picker.
4. Use one read policy for student portal projection and authenticated Word downloads. Only the current intern's submitted, under-review or approved supervisor response is readable. Bound responses follow the assigned respondent even after a mentor transfer; shared legacy responses follow current placement ownership. Drafts, revision requests, other interns and retired contexts remain private. Students receive readonly previews/downloads and cannot edit the supervisor's answer.
5. Include coordinator sections by default; students may exclude optional sections. Approved contextual responses remain tied to the exact report/section assignment. Shared legacy responses are viewable, but are not silently substituted into a new official report.
6. Disable all new student evidence binary uploads, including images disguised as DOCX/PDF, before decoding. Written descriptions/captions render as image placeholders in browser and editable Word. Existing evidence is retained; grammarian-reviewed DOCX returns still work against the exported version.
7. Verify actual coordinator/student/supervisor flows at narrow and desktop sizes, access denial, immutable history, exports and storage rejection using disposable databases.

## Primary-source design guidance

- [W3C error summary](https://design-system.w3.org/styles/form-errors.html): describe problems and link each item to the relevant control.
- [WAI jump-to-error mechanism](https://www.w3.org/WAI/WCAG21/Techniques/general/G139.html): preserve entered content and provide navigation to errors.
- [WAI color plus text](https://www.w3.org/WAI/WCAG21/Techniques/general/G14): status must remain understandable without color.
- Installed Next.js 16 documentation: backend-for-frontend endpoints; keep authentication and validation on the server.

## Deliberate boundaries

Active students are preselected, not enrolled in an invisible ongoing auto-assignment subscription. Future active students require another reviewed assignment. Existing reports keep their published version until an explicit upgrade. A student cannot approve a supervisor response. Template DOCX/reference upload remains coordinator-only. Placeholder sections need review and real photographs can be inserted later in offline Word if the school requires them. No schema migration, database reset or automatic approval is required.


## Verified result

Production build, TypeScript, 33 domain/Word unit checks, template/report/server APIs, 320px/desktop role workflows, testing login, 200-recipient batches and 10 concurrent saves pass. Student evidence rejection is verified with old environment flags both true and false. The generated placeholder DOCX renders without page-edge text overflow. Detailed evidence and testing boundaries are recorded in [VERIFICATION.md](VERIFICATION.md).
