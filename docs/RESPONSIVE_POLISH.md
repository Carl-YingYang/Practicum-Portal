# Responsive and workflow polish — October 6, 2026

Branch: `practo/testing-platform`. Base: Carl's `1e4020d` logo update.
The [plan and research](RESPONSIVE_POLISH_PLAN.md) define the scope. Publishing
this pass is authorized only after verification. Other branches are excluded.

## Resulting behavior

| Area | Improvement / retained verified behavior |
| --- | --- |
| Mobile navigation | A viewport-height drawer with a bounded native scroll body. Its school header and account footer stay outside the scrolling menu. Short portrait and landscape screens can reach Reports and other lower sections. Escape returns focus to the header menu button. Desktop navigation uses the same bounded scroll pattern. |
| Page sizing | Shrinkable shared cards/content, wrapping page actions and headings, wrapped contact text, and student-detail tabs that use two columns on small screens. The duplicated bottom student-detail action row is removed. Tables retain their own scroll surfaces. |
| Sticky layout | A consistent 64px workspace header; the form-editor toolbar starts below it. Mobile gutters align with the app shell. Bottom sheets use dynamic viewport height; slide-over bodies can shrink and scroll while headers/footers remain available. Existing bottom-navigation/safe-area clearance is retained. |
| Controls / highlights | The mobile profile trigger is a centered 44px square. Parent navigation remains active on detail/editor screens. Form block move/duplicate/remove controls are visible without hover, named, and touch-sized. Form-card menus are named and larger on mobile. Shared sheet headers reserve close-button space. |
| Logo / login | A shared Practo brand uses Carl's unchanged `/logo.svg` in the login header, workspace header and loading state. The school logo remains independently configurable. Carl's hero layout, opacity, theme toggle and rotating subtitles are preserved. Testing accounts remain visible under the existing environment rules. |
| Coordinator access | **User Management → Add User → Add Coordinator** opens the existing authorized provisioning flow. Pending creation disables repeat submission; credentials appear after server confirmation. Failed saves show a retryable error and keep local fields. Edit fields initialize once rather than being overwritten by a failed-save reconciliation. |
| Initial coordinator | In this prototype, `npm run db:setup` seeds the initial coordinator. Testing buttons or the private, git-ignored generated credentials provide access. Additional coordinators are created by authorized coordinators. This pass does not introduce public coordinator registration. |
| Loading / errors | A branded full-screen loader covers session bootstrap; code-split workspaces use skeletons. Failed bootstrap can retry. Incomplete JSON responses get a readable error; requests have a 20-second timeout. Background refresh keeps existing content. No artificial page-loading delay is added. |
| Real action feedback | Coordinator creation, form-editor publish/unpublish/archive, Forms-list mutations and submission reviews await server confirmation. Reusable action locks prevent repeat submission and expose pending/errors. PDF exports await lazy library loading and actual generation; failures do not produce a download-success message. |
| Journals | List/detail/editor routing distinguishes drafts/revisions from locked submitted entries. The editor distinguishes unsaved edits from an active save. Student/coordinator exports and individual supervisor/coordinator journal rows use captured cadence/period labels. Weekly aggregate charts continue to describe journal hours, not newly earned attendance. |
| Draft reliability | Existing serialized autosave, slow-save edit preservation, failed-save navigation guard, explicit retry, saved-draft recovery and revision/resubmission are verified. Submitted/approved journal entries open read-only views. |
| Hours / schedule | Existing attendance-derived period/cumulative hours and daily/weekly/twice-weekly preferences remain in place. Tests verify captured cadence, overnight clipping, overlapping coverage deduplication and unchanged attendance totals after approvals. Journal approval never earns additional hours. |
| Forms | Metadata stacks on mobile; the three-column editor is reserved for wide desktops. Published/archived templates open in preview; published templates must be unpublished before editing. Publish validates a title/nonempty template. Preview and submission PDF export use the correct displayed values. |
| Cross-role workflows | Real HTTP and browser checks verify account provisioning/password replacement, role/school scope, required form submission/review locks, evaluations, and the student → supervisor → coordinator journal workflow. Existing domain/server modules remain authoritative. |
| Documents | Long PDF titles, metadata, key/value rows and narrative content wrap and paginate. The download helper returns a Promise instead of reporting success before lazy generation. Print previews hide workspace/modal chrome and release scroll-height constraints. Physical wet-signature lines remain blank. |
| Structure | The ambiguous `StudentDashboard.tsx` wrapper is renamed to `active-student-dashboard.tsx`, with an `ActiveStudentDashboard` export. Shared branding, pending-action and PDF-export helpers replace repeated behavior. No wholesale folder relocation or backend rewrite. |
| Evidence | Disposable-database unit/HTTP/browser checks, mobile regression coverage, PDF geometry assertions, current screenshots and this change inventory. No live AI/provider setup or electronic signature flow is added. |

## Verification

Runtime: Node 24, installed Next.js 16.3.8/React 19, Prisma 6/SQLite and
Playwright Chromium headless shell. Development, integration and browser tests
use independent temporary databases; they do not reset the developer's data.

| Command | Result / coverage |
| --- | --- |
| `npm run typecheck` | Pass. |
| `npm run lint` | Zero errors; 20 existing effect-initialization warnings remain. This pass removes the coordinator-form initialization warning. |
| `npm test` | 19 passing domain/prototype tests, including account lifecycle, attendance/cadence and review invariants. |
| `npm run test:login` | Pass: actual development-server testing accounts with older environment defaults, all three roles, explicit demo opt-out and reset restrictions. |
| `npm run build` | Pass: production application and API routes. |
| `npm run test:integration` | Pass: real HTTP persistence, authorization, CSRF, retry receipts, first-login password replacement, journal/form review, school isolation and production demo/reset restrictions. |
| `npm run test:browser` | Pass: login/hero/theme regression, role workspaces, journals, real Word/PDF downloads, supervisor provisioning and settings. No page errors. |
| `npm run test:workflow` | Pass: slow/failed draft saves, recovery/retry, revision/resubmission/approval, unchanged hours and responsive modal checks. No page errors. |
| `npm run test:responsive` | Pass: session loading/malformed-response recovery; short/landscape drawer scroll and focus return; 320–768px student tabs; pending coordinator creation; 320–1440px form editor; published read-only behavior; Forms-list failure/retry; PDF download/document-only printing; all role navigation pages at 320 light/390 dark/768 light with long student records. |
| `npm run test:pdf` | Pass: a real 7-page PDF with long metadata, 160 narrative lines and 100 table rows; final content/footer present and text within every page's bounds. Requires `python` and PyMuPDF (`python -m pip install pymupdf`). |
| `git diff --check` | No whitespace errors. |

Iterations caught and corrected a missing async export return type, an import
path, a reserved variable name reported by ESLint, and the real drawer
focus-return issue. Browser selectors were adjusted for navigation count badges
and required labels. The final checks run against a fresh production build.

Viewport emulation covers short screens and keyboard-like resizing, not actual
phone keyboards or Safari/iOS hardware. See [deployment limits](CONNECTED_PLATFORM.md#remaining-work)
before using real student data. Live AI and electronic signatures remain deferred.

## Screenshots

- [Scrollable short-screen sidebar](screenshots/polish-sidebar-mobile.png)
- [Student detail with responsive tabs](screenshots/polish-student-detail-mobile.png)
- [Mobile form block controls](screenshots/polish-form-editor-mobile.png)

Existing browser/workflow captures are refreshed to show the current logo and
shared layout. The complete changed-file list is in [the change inventory](CHANGE_INVENTORY.md).

## Getting the update

Stop the running development server, then in the repository's Bash terminal:

```bash
git fetch origin
git checkout practo/testing-platform
git pull --ff-only origin practo/testing-platform
npm run dev
```

This pass adds no database migration or new application dependency. Keep any
uncommitted local changes safe before pulling. `bun run dev` can also run the
existing development script.
