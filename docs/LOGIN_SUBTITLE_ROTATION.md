# Login subtitle rotation — October 6, 2026

Branch: `practo/testing-platform`. This small follow-up starts from Carl's
`1abfb31945ab6a508454bc8ebe61a786bf3f5f99` login update. His full-width desktop
halves, image cover/centering, 35% light / 25% dark image opacity, single theme
toggle, headline, role captions and compact mobile layout are preserved.

## Copy and timing

| Hero | Subtitle |
| --- | --- |
| 1 | Clock in. Learn something new. Make every hour count—with your work and progress in one place. |
| 2 | See the effort behind every entry. Give feedback that helps students grow beyond the classroom. |
| 3 | Less chasing updates. More seeing progress. Keep your students, supervisors, and requirements connected. |

The existing hero state controls both images and subtitles. There is one timer:
six seconds per slide, a one-second opacity crossfade, and a repeating 1 → 2 → 3
→ 1 sequence. There is no movement, zoom, typewriter effect or extra carousel
control. Update `heroSubtitles` in
`src/components/portal/auth/login-screen.tsx` to change the copy.

All three paragraphs occupy the same CSS grid cell so the longest determines
the height. Changing slides does not move the headline, role captions or login
form. Inactive paragraphs are hidden from assistive technology; no live region
repeatedly announces the rotating marketing copy. Reduced motion disables
rotation and transitions; hidden tabs do not advance either images or text.
The desktop marketing section remains hidden below 1024px.

## Scope

Only subtitle rotation and compatibility updates to existing browser checks are
included. The checks now use Carl's single theme toggle and expect his image
`object-fit: cover`. Remaining portal layout/workflow work is separate.
Signature implementation is deferred at Carl's request because wet signatures
are commonly required; live AI remains a later phase.

## Verification

- `npm run typecheck` and targeted ESLint passed.
- `npm run build` passed after archiving a corrupted local Turbopack cache;
  no application change was needed to resolve that cache error.
- An isolated production-server Playwright check verified image/text pairing
  across full loops in light/dark at desktop widths 1024 and 1440, one-second
  fade styling, stable paragraph-container height, and inactive-text hiding.
- Reduced-motion and hidden-tab checks verified that images and text stay
  paused together. Mobile widths 320/360/390/768 retained the compact layout,
  three testing-role buttons and no horizontal page overflow. No browser
  exceptions occurred. Light/dark screenshots were visually inspected.
- The existing full browser/workflow suites were updated for Carl's previous
  theme-toggle and image-fit changes but were not rerun in this small pass.
