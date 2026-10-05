# Writing Assistant and journal workflow

The testing branch provides a **local demo**, not live AI. No OmniRoute installation, API key, provider login or subscription is required to use these screens.

## Try the assistant

1. Sign in as a sample Student and choose **Write a journal** or **Continue editing** on a saved draft.
2. Enter actual tasks/learnings. Optionally select a passage with the mouse or keyboard.
3. Open **Writing Assistant**. Choose the section, language and response detail. **Save preferences** persists these choices for this signed-in account on the server.
4. Choose **Fix grammar**, **Make it formal**, or **Help with reflection**. A visible **Demo · Sample response** label explains that suggestions are deterministic examples.
5. Review the preview. **Insert suggestion** appends to the chosen section. **Replace section** is explicit; a selected passage instead offers **Replace selected text**, preserving the rest of the section. **Dismiss suggestion** changes nothing.
6. Close the drawer and use **Undo suggestion** if needed. Undo refuses to overwrite newer manual edits. A preview also refuses to apply if its source changed.

Demo grammar only normalizes spaces, capitalizes the opening and the standalone pronoun `I`. Formal samples add a localized introduction while retaining original wording. Reflection produces localized bracketed prompts; students must supply actual lessons/outcomes before submission. The demo does not translate or infer achievements, times or hours. Context is limited to 6,000 characters; journal sections retain the 30,000-character limit. Demo suggestions have no provider quota or monetary balance.

The assistant is loaded only when opened. The drawer is full width on small devices and a 480px panel on desktop, with focus management, Escape, scrollable content and visible retry feedback. **Simulate demo error** appears only in explicit testing mode and allows a successful retry without affecting attendance.

## Persistence, attendance and review

- Debounced saves serialize requests and keep saving newer edits entered during a slow reply. Dirty editor navigation, Back, logout and UI account switching await the save; failures retain the editor text and show **Retry saving**. Reload/close while dirty invokes the browser's leave warning.
- Successfully saved drafts can be reopened from the journal list, Drafting Room rail or dashboard. Unsaved text is not stored in localStorage, and unsaved reload recovery is not promised. Database drafts persist across sessions.
- The rail has search and status filters, clear Continue editing/View controls, and dates/recorded cadence. Entries show a journal number, period hours, previous-period hours and cumulative attendance.
- **Journals → Hours breakdown** distinguishes recorded attendance, approved journal coverage, pending coverage, revision coverage, attendance without a submitted journal, and remaining attendance. Overlapping coverage is counted once, with approved/pending/revision priority. Running clocks count after clock-out. Journal approval never earns extra attendance hours.
- Submitted/approved journals are read only; requested revisions reopen the same record. Review history displays creation, latest submission and latest review timestamps plus retained feedback, not a complete event audit log.
- School Settings keeps daily/weekly/twice-weekly scheduling. An entry captures its cadence; changing the preference affects new entries, not saved ones. List/review period labels use the captured cadence.

## Testing scenarios

Open the account menu → **Testing scenarios**. This uses eligible seeded demo accounts and reflects their current records, not fabricated client-side state. Starter data includes active, pending, revision, saved draft, new student (no hours), and completed-hours students, plus supervisor/coordinator workspaces.

Normal setup/seed **preserves existing data**. Existing databases get the new starter variants only through an explicit testing reset by a coordinator. Reset removes shared test records/preferences and signs out all sessions; it is never needed just to enable the assistant. Production with demo access disabled offers no scenario switcher.

## Upgrade an existing checkout

Stop the dev server first. From `practo/testing-platform`:

```bash
git pull --ff-only origin practo/testing-platform
npm ci
npm run db:setup
npm run dev
```

Keep your existing `.env`. Dependency installation regenerates Prisma; setup applies the additive `writingPreferencesJson` migration. It does not reset student data. Creating fresh `.env` is only necessary for a new checkout.

## Structure and later live AI

| Location                                                    | Responsibility                                                         |
| ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| `src/domain/writing-assistant.ts`                           | Provider-neutral types and clearly labelled deterministic samples      |
| `src/client/writing-assistant.ts`                           | Cancellable demo request adapter; future live endpoint seam            |
| `src/components/portal/student/writing-assistant-panel.tsx` | Preferences, request state, preview and explicit apply controls        |
| `src/components/portal/shared/journal-editor.tsx`           | Text editing, selection and guarded single-step undo                   |
| `src/hooks/use-journal-draft.ts`                            | Serialized autosave, dirty state and save failures                     |
| `src/client/navigation-guard.ts`                            | Shared in-app exit protection                                          |
| `src/domain/journal-progress.ts`                            | Attendance-based review coverage calculation                           |
| `src/app/api/preferences/writing/route.ts`                  | Authenticated own-account preferences and same-origin validated writes |

Live AI later requires a server-only Practo endpoint, reachable OmniRoute base URL, secret gateway key, verified provider/model, request limits, timeouts, usage measurement and explicit context selection. No live credentials or placeholder API environment variables are enabled in this pass. Personalization comes from the student's chosen context/preferences; a shared provider login does not give each student a private AI account.
