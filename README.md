# Practicum Evaluation Portal

A **glue + accreditation portal** for Philippine university practicum / OJT
programs. The portal owns auth, the cohort roster, the workflow status, the
dashboard, and the accreditation PDF — and **delegates** journal writing
(Google Docs), attendance (Jibble), and evaluations (Google Forms) to the best
free existing tools, embedding them inline so students never leave the portal.

Built on **Next.js 16 (App Router) · TypeScript 5 · Tailwind CSS 4 ·
shadcn/ui · Prisma (SQLite) · Zustand · TanStack Query**.

---

## Quick start (local development)

### 1. Prerequisites

| Tool  | Version | Why                                   |
|-------|---------|---------------------------------------|
| Node  | v24+    | Next.js 16 runtime                    |
| Bun   | v1.3+   | Package manager + dev runner          |

Install:
- **Node.js** — <https://nodejs.org> (pick LTS)
- **Bun** — <https://bun.sh/docs/install>
  - macOS / Linux: `curl -fsSL https://bun.sh/install | bash`
  - Windows (PowerShell): `powershell -c "irm bun.sh/install.ps1 | iex"`

### 2. Clone & install

```bash
git clone https://github.com/Carl-YingYang/Practicum-Portal.git
cd Practicum-Portal
bun install
```

### 3. Configure environment

```bash
cp .env.example .env
mkdir -p db
```

The default `.env` uses a relative SQLite path so it works on any machine:

```
DATABASE_URL=file:./db/custom.db
```

### 4. Set up the database

```bash
bun run db:push
```

This creates `db/custom.db` from `prisma/schema.prisma`. Re-run this command
any time the schema changes.

### 5. Run the dev server

```bash
bun run dev
```

Open **<http://localhost:3000>** in your browser.

> ⚠️ Do **not** run `bun run build` — the build script is configured for the
> sandbox deployment environment and may fail locally. For development, always
> use `bun run dev`.

### 6. (Optional) Lint

```bash
bun run lint
```

---

## Demo accounts

The login screen has three one-click demo buttons (no real auth in this MVP):

| Button                  | Role                | What you can do                         |
|-------------------------|---------------------|-----------------------------------------|
| Juan Dela Cruz          | Student             | Write journals, clock in/out, view evals|
| Maria Santos            | Company Supervisor  | Review/approve journals, eval interns   |
| Prof. Patricia Lim      | Practicum Coordinator | Manage cohort, connect tools, export PDFs |

---

## Project structure

```
Practicum-Portal/
├── prisma/
│   └── schema.prisma          # Database schema (SQLite)
├── src/
│   ├── app/                   # Next.js App Router (single `/` route)
│   │   ├── layout.tsx
│   │   ├── page.tsx           # Renders <PortalApp/>
│   │   └── globals.css        # Design tokens (Tailwind v4)
│   ├── components/
│   │   ├── portal/
│   │   │   ├── auth/          # Login + create-account
│   │   │   ├── layout/        # AppShell, sidebar, topbar, bottom nav
│   │   │   ├── shared/        # Reusable: cards, sheets, editors, grid
│   │   │   ├── student/       # Student views
│   │   │   ├── supervisor/    # Supervisor views
│   │   │   ├── coordinator/   # Coordinator views
│   │   │   └── portal-app.tsx # Root view-state router
│   │   └── ui/                # shadcn/ui primitives
│   ├── lib/                   # Types, selectors, mock data, utils
│   ├── store/                 # Zustand store (app + tools config)
│   └── hooks/                 # React hooks
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── eslint.config.mjs
├── tailwind.config.ts
└── next.config.ts
```

---

## Architecture notes

- **Single `/` route** — the portal uses client-side view-state navigation via
  Zustand (`navigate(view, params)`) because the deployment target restricts
  to one route. All "pages" are components switched by `PortalApp`.
- **Mock data** — students, supervisors, journals, evaluations, and time logs
  are seeded mock data in the Zustand store, persisted to `localStorage`.
  No real backend calls in this MVP.
- **Free-first tool integration** — the coordinator dashboard has a "Connect
  Tools" sheet where you paste URLs for Google Drive, Google Docs journal
  template, Google Forms, and Jibble. These are embedded inline:
  - **Journal form** = "Drafting Room" with a Google-Docs-style embedded
    editor + a left rail listing the student's journals.
  - **Time Clock → Timesheet tab** = a Jibble-style monthly timesheet grid
    that reads from the portal's clock-in/out sessions.
- **Delegation stays honest** — every embedded tool surface shows a
  "Connected to Google Docs / Jibble" badge and an "Open original ↗" link so
  users always know where the source of truth lives.

---

## Tech stack

| Concern         | Choice                                   |
|-----------------|------------------------------------------|
| Framework       | Next.js 16 (App Router)                  |
| Language        | TypeScript 5                             |
| Styling         | Tailwind CSS 4                           |
| UI components   | shadcn/ui (New York) + Lucide icons      |
| Database        | Prisma + SQLite                          |
| State (client)  | Zustand                                  |
| State (server)  | TanStack Query                           |
| Auth            | NextAuth.js v4 (available, not wired)    |
| Charts          | Recharts                                 |
| Animations      | Framer Motion                            |

---

## Scripts

| Command             | What it does                              |
|---------------------|-------------------------------------------|
| `bun run dev`       | Start dev server on port 3000             |
| `bun run lint`      | Run ESLint                                |
| `bun run db:push`   | Push Prisma schema → SQLite               |
| `bun run db:generate`| Regenerate Prisma Client                 |
| `bun run db:migrate`| Create + apply a migration                |
| `bun run db:reset`  | Reset DB (destructive)                    |

---

## License

Internal university project — not for redistribution.
