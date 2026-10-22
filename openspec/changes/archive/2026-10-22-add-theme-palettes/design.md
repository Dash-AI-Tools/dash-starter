# Design

## Context

See proposal.md for motivation. Current state:

- Colour lives in `apps/web/src/index.css` as tokens: `:root` (light) and `.dark` (dark) define ground, ink, primary, `--line`, neutrals and `--station-*`; `@theme inline` maps them to Tailwind colours (`bg-line`, `text-primary`, …). Components already read only tokens, and `lib/stations.ts` resolves station colours to `var(--station-*)`.
- Light/dark/system is handled by `providers/theme-provider.tsx` (localStorage key `theme`, synced with the user's `theme` preference) and toggles the `dark` class on the document root.
- The installer (`packages/create-app`) already rewrites one web source constant at setup: `applyLocale` replaces `export const DEFAULT_LOCALE: Locale = '…'` in `apps/web/src/lib/i18n.tsx`. Web env flags are read through `import.meta.env.VITE_*` (precedent: `VITE_ENABLE_SHOWCASE`).
- The SPA has no server render, so anything set on `<html>` before React mounts is in place on first paint.

## Goals / Non-Goals

**Goals:**
- Palettes as token overrides only, so the "rebrand by tokens" rule holds and every existing component re-colours for free.
- One source of truth for the default palette that both humans and agents can set, reusing the installer's existing rewrite seam.
- Demo-mode picker with zero footprint when the flag is off.

**Non-Goals:**
- Per-user or per-organization palettes stored in the database; admin UI for palettes; custom palettes built in the browser.
- Re-colouring transactional emails (they keep their neutral layout).
- Re-capturing landing-page proof screenshots per palette.
- Changing fonts, radii or layout per palette.

## Decisions

### D1. Palettes as attribute-scoped token blocks
New `apps/web/src/styles/palettes.css`, imported by `index.css`, holds one block pair per palette:

```css
[data-palette='ocean'] { /* light tokens */ }
.dark[data-palette='ocean'], .dark [data-palette='ocean'] { /* dark tokens */ }
```

The current values move into the `line` blocks and stay as the `:root` / `.dark` fallback, so a missing attribute still renders Line. Selector specificity resolves correctly on the root element: `.dark[data-palette]` (0,2,0) beats both `[data-palette]` (0,1,0) and `.dark` (0,1,0). Scoping to the attribute (not only `:root`) lets a picker swatch preview any palette by carrying its own `data-palette`, in light and dark.
*Alternatives:* palettes in TypeScript injected as inline styles (bypasses the CSS cascade, harder for designers to edit, flashes on mount); separate CSS files loaded on demand (extra requests, flash on switch).

### D2. Palette registry and default in one module
`apps/web/src/lib/palettes.ts` exports `PALETTE_IDS = ['line', 'ink', 'ocean', 'forest', 'plum', 'ember'] as const`, `type PaletteId`, the localized label keys, and `export const DEFAULT_PALETTE: PaletteId = 'line'`. The type makes an invalid default a compile error (spec: Unknown default). Agents and developers change the default by editing this one line; the README documents it.

### D3. Demo-mode flag
`apps/web/src/lib/demo-mode.ts` is the only reader: `export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'`, so anything but the literal `true` is off. Wiring:
- Root `.env.example`: `DEMO_MODE=true` (the template repository demonstrates palettes); the installer writes `DEMO_MODE=false` into generated projects.
- Dev Compose `web` service: `VITE_DEMO_MODE: ${DEMO_MODE:-false}`.
- Production: `apps/web/Dockerfile` takes `ARG VITE_DEMO_MODE=false` before `npm run build`; `docker-compose.prod.yml` passes it as a build arg (Vite inlines env at build time).
*Alternative:* serve the flag from the API at runtime (allows toggling without rebuild, but adds an endpoint and a loading state for a demo-only feature).

### D4. Applying the palette before first paint
`main.tsx` calls `applyPalette(resolveInitialPalette())` at module top, before `createRoot().render`, setting `document.documentElement.dataset.palette`. `resolveInitialPalette()` returns the stored browser choice only when `DEMO_MODE` is true and the stored id is valid; otherwise `DEFAULT_PALETTE`. With demo mode off, a stale stored value is ignored (spec: Demo mode off).

### D5. PaletteProvider
`providers/palette-provider.tsx`, mounted next to `ThemeProvider` in `main.tsx`, exposes `{ palette, setPalette, canChoose }`. `setPalette` applies the attribute and persists to localStorage key `palette` only when `canChoose` (= `DEMO_MODE`). It never touches the `dark` class, keeping palette and light/dark independent (spec: Independent of light and dark mode).

### D6. Picker component
`components/palette-picker.tsx` renders `null` unless `canChoose`. Otherwise a compact trigger (swatch plus palette name, icon-only below `sm`) opens the existing shadcn `DropdownMenu` with a `DropdownMenuRadioGroup`: Base UI supplies arrow-key navigation, Enter to select and `aria-checked`. Each item shows a three-chip swatch (primary, line, one station) inside an element carrying `data-palette={id}`, so the preview uses that palette's real tokens in the current mode. Placed in `PublicLayout` beside the language switcher and in the dashboard `TopBar` beside search. Palette names come from new EN/ES keys (`paletteLine`, `paletteInk`, …, `paletteLabel`).

### D7. Palette values and accessibility proof
Each palette is authored in OKLCH like the current tokens: a tinted neutral ground and ink, one primary/line hue, and six station hues rotated to stay distinct from the primary. Ink is the neutral option (near-black primary, desaturated stations); Ember uses a deep burnt orange (lightness kept low enough for white button text). A Vitest suite reads `palettes.css` as text, extracts each block's OKLCH values, converts OKLCH to sRGB with a small local function (no new dependency) and asserts AA contrast for: foreground/background, muted-foreground/background, primary-foreground/primary, ring/background (3:1), and each station/background (3:1), in light and dark for every palette. It also asserts every block defines the full token list, so a palette cannot silently fall back.

### D8. Installer support
- `cli.js`: `--palette <id>` flag and usage line.
- `prompts.js`: a select prompt "Default colour palette", initial `line`, shown unless the flag or `--yes` decides it.
- Valid ids live in the installer as `PALETTES` (same pattern as `LOCALES`) and are checked in `resolveIdentity`, before the template is fetched, so an unknown id exits non-zero listing valid ones without writing anything. Reading them from the downloaded template was rejected: the template is fetched into the target directory, so validation would come after files were written. An installer test compares `PALETTES` with `PALETTE_IDS` in `apps/web/src/lib/palettes.ts`, so the two lists cannot drift.
- `env.js`: `applyPalette(root, id)` rewrites `DEFAULT_PALETTE` with the same pattern as `applyLocale`; `generateEnvFiles` sets `DEMO_MODE=false` in the root `.env`.

## Risks / Trade-offs

- [Landing proofs stay teal under other palettes in demo mode] → Accepted for a demo; the proof frame and caption chip already use tokens, so the surroundings match. Per-palette captures are a non-goal.
- [Specificity mistakes let a light token leak into dark mode] → The completeness test (D7) plus a render test switching palette and mode on the root guard it.
- [Build-time flag means toggling demo mode in production needs a rebuild] → Acceptable for a demo-only flag; documented.
- [Six palettes multiply the token-maintenance surface] → All live in one file with one test; adding a token fails the completeness check until every palette defines it.

## Migration Plan

No data migration. Existing installs keep `line` (unchanged values) and demo mode off because `VITE_DEMO_MODE` is unset. Rollback is reverting the change; the `:root` fallback means removing `palettes.css` restores today's look.
