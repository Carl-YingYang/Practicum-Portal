# Open-source tools for Practo

Reviewed October 5, 2026 against the projects' repositories and official documentation. This is a source/documentation review, not an installation, benchmark, integration test, or guarantee of compatibility. No third-party service was installed or connected in this update. Recommendations below are engineering judgments based on the portal's current scope.

## Recommended shortlist

| Tool / official repository | License shown upstream | What it provides | Suggested use in Practo | Integration work / limits |
|---|---|---|---|---|
| [Kimai](https://github.com/kimai/kimai) | AGPL-3.0 | Multi-user time tracking; punch-in/out mode; exports; JSON API; roles and teams | First proof of concept for replacing the optional Jibble link with a real timesheet service | Separate PHP/Symfony + MariaDB/MySQL service. Map portal identities, teams and placement projects; implement server API adapter. Approval plugins have their own compatibility requirements. |
| [Solidtime](https://github.com/solidtime-io/solidtime) | AGPL-3.0 | Project/task time tracking, organizations, roles, imports, public REST API | Alternative time service if its workflow and interface fit the school's needs better | Separate self-hosted service, with Docker guidance. Practicum review rules still need mapping and testing. Self-hosted personal API tokens require the documented OAuth client setup. |
| [Frappe HR](https://github.com/frappe/hrms) | GPL-3.0 | Employee check-in/out, attendance, shifts, leave and broader HR/payroll modules | Later candidate when shift attendance and institutional HR processes become requirements | Larger Frappe stack; requires mapping interns to employees and assigned shifts. Too much operational scope for the present browser-local prototype, in our assessment. |
| [HeyForm](https://github.com/heyform/heyform) | AGPL-3.0 | Conversational forms, conditional logic, file uploads, themes, webhooks and CSV exports | Optional external survey or feedback form builder | Separate service with MongoDB and Redis-compatible storage in the official Docker example. Embedded forms and submission ingestion need identity and assignment verification. Does not automatically provide Practo's template snapshots and supervisor review rules. |
| [Tiptap](https://github.com/ueberdosis/tiptap) | MIT for the open-source editor | Headless rich-text editor with React support and extensions; open-source Hocuspocus collaboration backend | Candidate for a future structured journal editor inside our existing white/dark UI | Editor library, not a complete Google Docs replacement. Need content schema, persistence, read-only submission locking and compatible PDF/DOCX rendering. Pro extensions/services require subscriptions. |
| [Etherpad](https://github.com/ether/etherpad) | Apache-2.0 | Real-time collaborative documents, embedding, HTTP API for pads/users/groups | Alternative when shared drafting is more important than a native journal UI | Separate document service. Create restricted pads and sessions on the server; enforce school membership and read-only review access. Journal tasks/learnings and export rules still need adaptation. |

Do not add all six services. For the current prototype, keep the working local attendance, forms and journals. Start with a Kimai proof of concept only when building the real backend; compare Solidtime with the same acceptance cases. Evaluate a rich-text library only if journal formatting becomes a concrete requirement.

## Kimai approval: free and paid are different

The official marketplace lists [Katja Glass Consulting's ApprovalBundle](https://www.kimai.org/en/store/katjaglass-approval-bundle.html) as free. It supports weekly submissions, teamlead/admin approval or denial, and lockdown of submitted/approved weeks. Its compatibility table and recommended LockdownPerUserBundle must be checked against the pinned Kimai release. This is a separate plugin, not a feature verified in our portal.

The separate [Working hours / vacation / sickness / public holidays plugin](https://www.kimai.org/en/store/controlling.html) is paid and includes monthly approvals with PDFs. The [marketplace](https://www.kimai.org/en/store/) also contains paid audit/custom-field/kiosk features. Core Kimai being open source does not make every add-on free. Self-hosting also needs hosting, backups and maintenance.

## Fit with the code we already have

- `src/components/portal/coordinator/external-tools-setup.tsx` currently configures optional links; `jibbleInviteUrl` is not an API connection. `src/lib/selectors.ts` validates specific HTTPS hosts. A self-hosted service would need an explicit provider/base-URL configuration and server-side adapter; simply pasting a Kimai URL into the Jibble field will not work.
- Attendance in `src/store/use-app-store.ts` is currently the sole credited-hours source. A real time service must replace that authority or feed a deduplicated mirror; counting both remote entries and local entries would double-credit hours. Journal approval must continue to avoid crediting the same hours again.
- `src/components/portal/shared/google-doc-editor.tsx` renders a local Docs-style writing surface. It does not sync content to Google Docs. `@mdxeditor/editor` is already declared in `package.json`; compare the installed library and actual formatting needs before adding another editor dependency.
- `jspdf`, `jspdf-autotable` and `docx` are already installed for exports. Keep the existing exports unless a new content schema needs a new renderer; another export service is not required just to produce files.
- The domain is browser-local and the fixture APIs are read-only. API tokens, pad service credentials and webhook verification belong in a real server layer, with sessions and role/school authorization. They must not be placed in browser localStorage or public environment variables.

## Proposed time-service proof of concept

1. Pin a service release and use isolated sample accounts: one student, one supervisor and one coordinator.
2. Map portal user/school/supervisor/placement IDs to provider users, teams and projects. Verify that supervisors cannot read another team's records.
3. Exercise start/stop, duplicate start, reload during a running session, manual corrections, overlaps and failed network retries.
4. Test Asia/Manila date boundaries and break handling. Kimai's API documents local wall-clock input and offset-bearing output; do not assume both formats are the same.
5. Verify that completed imported hours are counted once and journal approval adds zero extra hours. Record provider IDs and retry-safe mapping.
6. Compare supervisor approval/denial, locking, coordinator reports and CSV/PDF totals. Decide whether approvals stay in Practo or are owned by the time service.
7. Document hosting, database backup/restore, upgrades, token lifecycle, pinned plugin compatibility and the relevant upstream licenses before adoption.

Success means the same hours and access rules as the current prototype, with real server persistence. A linked dashboard or embedded page alone is not successful integration.

## Primary sources

- Kimai [repository](https://github.com/kimai/kimai), [JSON API](https://www.kimai.org/documentation/rest-api.html), [plugins](https://www.kimai.org/en/store/), [weekly approval](https://www.kimai.org/en/store/katjaglass-approval-bundle.html), [paid working-hours plugin](https://www.kimai.org/en/store/controlling.html).
- Solidtime [repository](https://github.com/solidtime-io/solidtime), [self-hosting](https://docs.solidtime.io/self-hosting/intro), [public API and token setup](https://www.solidtime.io/blog/public-rest-api).
- Frappe HR [repository](https://github.com/frappe/hrms), [auto attendance and shift/check-in prerequisites](https://docs.frappe.io/hr/auto-attendance).
- HeyForm [repository](https://github.com/heyform/heyform), [self-hosting](https://docs.heyform.net/open-source/self-hosting).
- Tiptap [repository and distinction between open-source core and Pro features](https://github.com/ueberdosis/tiptap).
- Etherpad [repository, HTTP API and license](https://github.com/ether/etherpad).
