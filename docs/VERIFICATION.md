# Verification record

Executed October 5, 2026 on `practo/testing-platform` using Node 24.19.0 and npm 11.9.0. Installed versions include Next 16.3.8, React 19.3.0, TypeScript 5.9.3, and Zustand 5.0.15. Use the npm lockfile to reproduce the dependency set.

| Check | Result |
|---|---|
| `npm run typecheck` | Passed; application TypeScript errors resolved. Reference examples are excluded. |
| `npm test` | 14 regression tests passed against the actual TypeScript store/helpers. |
| `npm run lint` | Completed with 0 errors and 22 inherited controlled-state effect warnings. |
| `npm run build` | Successful production compilation with TypeScript checking enabled. `/`, not-found, and seven API paths generated. |
| `npm run test:browser` | Chromium smoke passed: all three roles, themes, refresh persistence, actual PDF download, mobile drawer navigation, no browser page errors. |
| `git diff --check` | Passed. |

## Regression coverage

The Node suite loads the actual TypeScript store through a small CommonJS transpile loader, with an in-memory localStorage adapter. Every test resets the fixture state.

1. Eight-hour attendance plus journal approval credits eight hours once; repeated approval does not add hours, and deleting attendance restores the total.
2. Duplicate clock-in returns the original session; a completed zero-duration session remains closed.
3. Manual attendance rejects invalid, reversed, future, overlong, and overlapping intervals, while allowing an adjacent interval.
4. Disabled seeded accounts fail both credential sign-in and preview access; reset credentials replace the old password; personal passwords remain case-sensitive.
5. Provisioned accounts have a school identity and live user representation; email uniqueness spans roles.
6. Rejected journals accept edits on the same record and resubmit to pending.
7. Specific recipients cannot be empty; required responses block submission; snapshots retain the original template; submitted answers and approved reviews stay locked; deleting a form cascades linked data.
8. Local persistence restores journal changes and the live account session after hydration.
9. External links reject lookalike hosts and HTTP; CSV escapes formulas and quoted text while keeping numeric cells numeric.
10. Evaluation saves enforce supervisor ownership and keep submitted content immutable.
11. Form responses require an assignment and a supervisor's target stays within their own intern roster.
12. Provisioning does not assign students to a full supervisor.
13. Every school preset and white/black/yellow custom palettes maintain at least 4.5:1 action and selection text contrast in both modes.
14. Malformed custom colors safely fall back, and changing the editorial accent leaves the school action color intact.

## Browser smoke coverage

The test starts a production Next server on `127.0.0.1:3101` and opens a new isolated Chromium context. A build must exist before running it. It performs:

- Sign-in via the student demo preview and checks the white default surface.
- Journal typing through the real editor, verification of the stored draft, reload, and persisted-content verification.
- Dark-mode toggle, confirming the dark class.
- Clock-in, reload, restored clock-out action, and clock-out.
- Open an assigned custom form and export its PDF. The downloaded bytes must begin with `%PDF` and contain more than an empty stub.
- Switch to supervisor and coordinator roles, and open Forms & Reviews.
- Open School Settings, preview Royal Navy + Clay without changing the saved theme, save, compare actual/preview actions in dark and light modes, verify neutral surfaces, change/discard the separate accent, reject invalid custom colors, then reload and verify persisted selections.
- Resize to 390 × 844, check horizontal document containment, open the mobile drawer, and navigate to Students.
- Assert no `pageerror` events occurred.

Desktop screenshots use a 1440 × 1000 viewport. The mobile screenshot is a full-page capture; the fixed bottom navigation appears at the original viewport boundary in that capture. Screenshots are refreshed by the smoke test.

The environment isolates loopback networks between execution cells; running the test server and browser in the same process tree avoids that limitation. Browser download mirror retries were setup issues, not application failures. The committed test uses the pinned Playwright 1.51.1 dependency.

## Manual review / limitations

The light, dark, and mobile captures were inspected. This is a focused smoke/regression pass, not a complete accessibility, performance, export-pagination, or production-security audit. Browser print-dialog output, DOCX page layout, every account/import/reassignment modal, real third-party authentication, and cross-device behavior were not exhaustively tested.

The 22 lint warnings are all `react-hooks/set-state-in-effect`, covering inherited controlled editor/modal initialization, responsive mounting, animations, and selected-view synchronization. Their severity was reduced to warning specifically for source files; they were not fixed or hidden. Static component creation in the school card was fixed. Existing broad baseline lint exemptions remain and should be revisited before production.

## Reproduce

```bash
npm ci
cp .env.example .env
npm run typecheck
npm test
npm run lint
npm run build
npx playwright install chromium
npm run test:browser
```

Use sample data. The browser test modifies only its own fresh browser context and generated screenshot files.


## Secondary color update captures

The School Settings screenshots show the saved Royal Navy palette with Clay accent. Preview and application use the same theme tokens in both modes:

- [Light School Settings](screenshots/school-settings-light.png)
- [Dark School Settings](screenshots/school-settings-dark.png)

The focused browser pass waits for hover/color transitions to settle before comparing computed button colors.
