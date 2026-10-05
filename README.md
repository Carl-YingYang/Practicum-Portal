# Practo — connected testing platform

Practicum management for students, supervisors and coordinators. The `practo/testing-platform` branch now uses one Next.js application with a seeded SQLite database, server sessions and authorized APIs. White is the default surface; charcoal is optional, with school colors used as secondary accents.

This is a testing prototype. Use fictional data. Demo access and shared reset are explicitly gated by server environment flags.

## Run locally

Node.js 22+ and npm are recommended. Install and start from this branch:

```bash
git switch practo/testing-platform
git pull --ff-only origin practo/testing-platform
npm ci
cp .env.example .env
npm run db:setup
npm run dev
```

Open http://localhost:3000. Expand **Explore the prototype** to try one sample account per role. Seed setup creates a private `.seed-credentials.json` file for regular password sign-in; it is git ignored and must never be committed or uploaded. Seeding preserves existing data. `npm run db:reset:test` explicitly resets shared sample data when `APP_ENV=testing`.

No separate Kimai, HR, forms server, API key, or browser extension is needed for attendance, journals, evaluations, and built-in forms. Optional external tool links remain ordinary links.

## What changed

- Shared server persistence, hashed passwords, HTTP-only sessions, school/role ownership and retry-safe commands.
- Fictional test accounts, recent attendance, journals in different states, forms, and an isolated school for permission tests.
- All three login hero PNGs, subdued backgrounds, mobile-first sign-in and clear supervisor account creation.
- Compact Drafting Room with account/placement details, attendance-derived period hours and cumulative progress.
- Daily, weekly or twice-weekly journal preferences under **School Settings → Journal schedule**. Old entries retain their cadence.
- Lazy workspace screens, PDF libraries and journal Word exports, static loading placeholders and real save/error feedback.
- Separate domain actions, client transport, server services, route handlers and shared form fields.

See [the implementation details](docs/CONNECTED_PLATFORM.md), [file inventory](docs/CHANGE_INVENTORY.md), and [verification](docs/VERIFICATION.md). Earlier UI improvements remain recorded in [the historical changelog](docs/TESTING_PLATFORM.md).

## Verify

```bash
npm run typecheck
npm test
npm run lint
npm run build
npm run test:integration
npm run test:browser
```

HTTP and browser tests create temporary databases and private in-memory credentials, run their own production servers, and clean up afterward. They do not reset your development database. Browser checks update `docs/screenshots/`.

## Hosting

Deploy this single Next.js app on a Node host with a **persistent writable volume** for SQLite. Set an absolute `DATABASE_URL`, run `npm run db:setup`, then `npm run build` and `npm run start`. Set `APP_ORIGIN` to the public HTTPS origin when behind a reverse proxy. Production sessions use secure cookies; `COOKIE_SECURE=false` is only for local HTTP testing.

Keep `APP_ENV=testing` and `ENABLE_DEMO_LOGIN=true` only for an intentionally disposable demonstration. For real accounts, use `APP_ENV=production` and disable demo login. Read the remaining deployment work in [CONNECTED_PLATFORM.md](docs/CONNECTED_PLATFORM.md#remaining-work). Ephemeral serverless filesystems need an external persistent database; this SQLite prototype does not provide persistence there.
