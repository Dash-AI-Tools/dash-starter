# Proposal

## Why

The template ships a single colour world ("The Line": teal with six station colours). Product teams starting from it need a quick, safe way to pick a different look without hand-editing tokens, and Dash AI needs to show prospects that the starter re-skins in one move. A small set of ready, accessible palettes plus a setup-time default covers both, while a demo-only picker shows the range on the template's own site.

## What Changes

- Ship 6 preset colour palettes: Line (current teal, default), Ink (neutral), Ocean, Forest, Plum and Ember. Each preset re-tunes primary, line, neutrals and the six station colours together, for light and dark mode, and meets WCAG 2.1 AA.
- Palettes are pure design-token overrides: switching one never changes component code, and the existing light/dark/system mode keeps working on top of any palette.
- A product has one configured default palette, set in one place in the web app source. Developers or agents choose it at setup: the installer gains a palette prompt and a `--palette <id>` flag, and the value can be changed later by editing that single constant.
- A `demo_mode` feature flag (web env `VITE_DEMO_MODE`). When on, a palette picker appears on the landing page and in the dashboard; the visitor's pick applies instantly and is remembered in that browser only. When off (the default for every new installation), no picker renders and the configured default palette always applies.
- The installer writes `demo_mode` off in generated projects; the template repository itself runs with it on so the Dash AI site can demonstrate the palettes.

## Capabilities

### New Capabilities
- `theme-palettes`: preset colour palettes as token sets, the configured default palette, the setup-time choice (installer prompt/flag), and the demo-mode palette picker on the public site and dashboard.

### Modified Capabilities
<!-- None: openspec/specs/ is empty. The bootstrap change that introduces ui-components and project-installer is not archived yet; installer and theming behaviour added here is specified inside theme-palettes. -->

## Impact

- Web: `apps/web/src/index.css` (palette token blocks), a palette registry module with the `DEFAULT_PALETTE` constant, a palette provider applying `data-palette` on `<html>`, a picker component used by `PublicLayout` and the dashboard top bar, `apps/web/src/lib/stations.ts` unchanged (stations read tokens), EN/ES strings for palette names.
- Config: `VITE_DEMO_MODE` in web env; Compose dev/prod and the web Dockerfile pass it as a build/runtime value; root `.env.example` documents it.
- Installer (`packages/create-app`): new `--palette` flag and prompt, rewrite of `DEFAULT_PALETTE` (same seam as `DEFAULT_LOCALE`), `VITE_DEMO_MODE=false` in generated env.
- Proof captures on the landing page stay in the Line palette (raster screenshots do not re-colour); accepted for demo mode.
- No API, database or email changes.
