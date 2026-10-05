# Practo — Practicum Portal prototype

An interactive practicum workspace for students, supervisors, and coordinators, built with Next.js 16, React 19, TypeScript, Tailwind 4, shadcn/ui, and Zustand.

The `practo/testing-platform` branch starts from `feature/sandbox-prototype` at `09a4245b2941952e29f6ee10653176717dbc974e`. It adds a white-default editorial interface, optional charcoal dark mode, browser persistence, and workflow fixes. See [the complete improvement log](docs/TESTING_PLATFORM.md), [the verification guide](docs/VERIFICATION.md), and [the changed-file inventory](docs/CHANGE_INVENTORY.md).

## Run locally

Use Node 24 and npm. This branch's `package-lock.json` records the versions used for verification. The existing Bun lockfile belongs to the earlier baseline; use npm for reproducing this branch.

```bash
git clone --branch practo/testing-platform https://github.com/Carl-YingYang/Practicum-Portal.git
cd Practicum-Portal
npm ci
cp .env.example .env
npm run dev
```

Open http://localhost:3000. For production compilation:

```bash
npm run build
npm start
```

Google Fonts downloads are unnecessary: the UI uses system fonts. If the environment restricts network interface discovery, start with an explicit host: `npm start -- --hostname 127.0.0.1`.

## Explore the roles

Expand **Explore the prototype** on the sign-in screen. Demo previews bypass credentials and open the selected local role; they still respect disabled records and the password-change gate. The account menu also lets you switch demo roles.

Use **Explore the prototype** for the seeded demo roles. The README does not publish account emails or initial passwords.

Newly provisioned or reset accounts use the generated temporary password and must choose a personal password at first sign-in. Personal passwords are case-sensitive. Credentials shown in provisioning exports are temporary credentials for invited accounts.

## What persists

Accounts, companies, students, supervisors, coordinators, journals, evaluations, attendance, activity, forms, assignments, responses, and the local session are stored in `practo:prototype:v1` in browser localStorage. Branding, schools, external tool links, and billing settings use their existing separate localStorage keys.

**Reset demo data**, available in the profile menu and desktop footer, asks for confirmation, restores the domain fixtures, and signs you out. It keeps branding, external tool settings, and billing configuration. Refresh opens your role's dashboard; view history and in-progress screen selection are intentionally temporary. Draft journals, evaluation edits, and form responses save as they change.

Use sample data and sample passwords: accounts and credentials are stored locally without server authentication or password hashing. Browser data does not sync across devices or between tabs in real time.

## Hours and dates

Completed attendance is the sole source of credited practicum hours. Approving a journal records review status and feedback; it does not add attendance hours. Deleting attendance recomputes the student's total. An active session survives refresh, but only a completed session contributes to the credited total.

Manual attendance rejects invalid dates, reversed intervals, future completed entries, sessions longer than 24 hours, and overlapping sessions. Manual time inputs and common date/time formatting use Philippine time, `Asia/Manila`.

New default cohort dates follow August 1 to July 31 of the current academic year. The coordinator can configure those dates in External Tools. Historical seed records keep their original dates and terms. Aggregate reports explicitly say **All terms** rather than implying that historical data belongs to the current term.

## External tools and APIs

Google Drive, Docs, Forms, and Jibble settings are optional links. They are not OAuth connections or background sync. Local journal edits are not written to Google Docs. Built-in journals, attendance, evaluations, and custom forms work without those services.

The `/api/students`, `/api/supervisors`, `/api/forms`, and timesheet routes remain read-only fixture APIs. They do not read browser changes and do not form a production backend. The Prisma SQLite `User`/`Post` schema is optional scaffolding and is not the portal domain database. To exercise that scaffold:

```bash
npm run db:generate
npm run db:push
```

`.env.example` matches the SQLite datasource (`DATABASE_URL="file:./dev.db"`). The database path is relative to the Prisma schema directory. Production deployment needs a real domain schema, server sessions and authorization, password hashing, persistence, uploads, integrations, audit records, and backup policy; see the improvement log's follow-up list.

## Verification

```bash
npm run typecheck
npm test
npm run lint
npm run build
npx playwright install chromium
npm run test:browser
```

The browser smoke test starts its own local production server on port 3101, so build first. It uses an isolated browser context and sample data. It checks all three dashboards, themes, attendance and journal persistence, a real custom-form PDF download, and mobile drawer navigation. It refreshes the screenshots in `docs/screenshots/`.

Lint retains inherited controlled editor/modal `set-state-in-effect` findings as warnings; this branch does not claim zero lint debt. See [verification details](docs/VERIFICATION.md).


## School colors and open-source options

Main surfaces stay white in light mode and charcoal in dark mode. School Settings applies the school palette to actions, navigation selections, focus and charts; the separate editorial accent controls dashboard highlights. Its Live Preview shows unsaved colors, and Save applies them across the portal.

See [the secondary color update](docs/TESTING_PLATFORM.md#secondary-color-correction--october-5-2026), [verification](docs/VERIFICATION.md), and the [open-source tool review](docs/OPEN_SOURCE_TOOLS.md) for Kimai, Solidtime, Frappe HR, HeyForm, Tiptap and Etherpad. These are researched candidates; the prototype has no new external service connection.
