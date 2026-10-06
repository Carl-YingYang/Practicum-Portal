# Responsive and workflow polish — October 6, 2026

Base: Carl's `1e4020d` on `practo/testing-platform`. The user authorizes this
implementation and a push only after iteration, verification and documentation.
Other branches, live AI and electronic signatures are outside this pass. Existing
blank signature lines remain available for printed/wet signatures.

## Research and implementation decisions

- [MDN flex](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/flex)
  and [overflow](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overflow):
  give navigation a bounded viewport and a shrinking scroll body. Fix intrinsic
  grid/flex widths rather than hiding document overflow.
- [Next.js loading](https://nextjs.org/docs/app/api-reference/file-conventions/loading)
  and installed Next.js `use-client`, `lazy-loading`, `loading` and image docs:
  this portal has one route and client-driven views. Use real bootstrap/code-split
  fallbacks and request progress, rather than artificial page delays.
- [WAI modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/):
  preserve Radix focus trapping, Escape and focus return; retain visible focus
  styles while aligning controls and keeping close buttons reachable.

## Scope and acceptance

| Area | Work and verification |
| --- | --- |
| Sidebar | Native bounded scrolling on mobile/desktop; header/footer remain reachable on short screens; all coordinator sections selectable. |
| Overflow | Shrinkable cards/grids; wrapping headings/contact text; responsive detail tabs/actions; dedicated table scroll. Long records must fit the viewport. |
| Sticky layout | Shared header/mobile-nav geometry, editor-toolbar clearance, bottom safe area and short-height checks; simulate keyboard-like viewport resizing. |
| Controls | Centered profile trigger, predictable active navigation including detail views, visible focus and modal-close clearance; remove duplicate detail actions. |
| Branding | Reuse Carl's unchanged logo asset for Practo branding, keep configurable school identity distinct, retain current login hero design. |
| Accounts | Add Coordinator entry in authorized User Management; prevent duplicate saves and verify temporary credentials/first-login gate. First coordinator in this prototype comes from documented seed/setup, not public registration. |
| Loading/errors | Full-screen bootstrap, workspace skeleton, real action progress and failed-request Retry. Background refresh preserves visible content. No artificial loading delays. |
| Journals | Distinguish list/detail/editor; use captured cadence labels and read-only state; verify autosave, retry/recovery, attendance-derived hours and revision flow. |
| Forms | Responsive toolbar/metadata/block controls; show confirmed publish/archive outcomes, save progress and preview state. |
| Workflows/exports/mocks | Audit existing role permissions, assignment/account flow, evaluations, PDF pagination/long records and realistic seeded scenarios; fix concrete findings. |
| Structure | Remove ambiguous case-dependent dashboard filenames; extract narrowly reusable layout/loading/action helpers; no wholesale reorganization. |
| Verification | Typecheck, lint, build, unit/integration/development-login/browser/workflow checks plus targeted responsive regression checks and screenshots. Document failures, iterations and limits. |

Physical phone/browser-keyboard behavior is not claimed from viewport emulation.
Tests cover real HTTP persistence and Chromium desktop/mobile viewport emulation.
No production-security or universal-device guarantee is implied.
