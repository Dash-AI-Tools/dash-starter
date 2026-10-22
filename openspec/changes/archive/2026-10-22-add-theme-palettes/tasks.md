# Tasks

## 1. Palette tokens

- [x] 1.1 Create `apps/web/src/styles/palettes.css` imported from `index.css`; move today's `:root`/`.dark` values into `[data-palette='line']` light/dark blocks, keeping `:root`/`.dark` as the Line fallback; verify the landing and dashboard render unchanged with and without `data-palette="line"` on `<html>`
- [x] 1.2 Author the Ink, Ocean, Forest, Plum and Ember light and dark blocks in OKLCH (full token list incl. `--line`, `--command*`, `--station-*`, sidebar, chart mapping) using the D1 selectors; verify each renders in light and dark by toggling the attribute in the running app
- [x] 1.3 Add a Vitest palette suite: parse `palettes.css`, assert every palette block defines the full token list, and assert AA contrast pairs from design D7 (local OKLCH→sRGB conversion, no new dependency) for all palettes in both modes; verify it fails when a token is deleted or a pair is made low-contrast

## 2. Registry, flag and provider

- [x] 2.1 Add `apps/web/src/lib/palettes.ts` (`PALETTE_IDS`, `PaletteId`, label keys, `DEFAULT_PALETTE = 'line'`, `resolveInitialPalette`, `applyPalette`); unit-test resolution: default when demo off, stored valid id when demo on, invalid stored id falls back; verify an invalid `DEFAULT_PALETTE` fails `npm run typecheck`
- [x] 2.2 Add `apps/web/src/lib/demo-mode.ts` reading `VITE_DEMO_MODE === 'true'` and declare the variable in the Vite env types; unit-test that unset and non-`true` values are off
- [x] 2.3 Apply the initial palette at the top of `main.tsx` before render and add `providers/palette-provider.tsx` mounted beside `ThemeProvider`; test that `setPalette` persists only in demo mode and never changes the `dark` class, and that switching light/dark keeps the palette

## 3. Picker

- [x] 3.1 Add EN/ES keys for the picker label and the six palette names; verify the locale completeness check and typecheck pass
- [x] 3.2 Build `components/palette-picker.tsx` on `DropdownMenuRadioGroup` with per-item `data-palette` swatches, icon-only trigger below `sm`, returning `null` when demo mode is off; component tests for: hidden when off, keyboard selection, checked state announced, Spanish names, immediate re-colour of the root
- [x] 3.3 Place the picker in `PublicLayout` (beside the language switcher) and the dashboard `TopBar`; verify in the running stack with demo mode on at 1440 and 390 widths in both themes, and that nothing renders with demo mode off

## 4. Configuration and deployment

- [x] 4.1 Add `DEMO_MODE=true` with an explanatory comment to the root `.env.example`, pass `VITE_DEMO_MODE: ${DEMO_MODE:-false}` to the dev Compose `web` service, add `ARG VITE_DEMO_MODE=false` to `apps/web/Dockerfile` and the build arg to `docker-compose.prod.yml`; verify `docker compose up` shows the picker with `DEMO_MODE=true` and hides it with `false`
- [x] 4.2 Document palettes, `DEFAULT_PALETTE` and `DEMO_MODE` in the root README (how a developer or agent sets the default, how to add a palette); verify the documented steps work as written

## 5. Installer

- [x] 5.1 Add the `--palette <id>` flag and usage text in `packages/create-app/src/cli.js` and the select prompt in `prompts.js` (skipped by the flag or `--yes`, default `line`); unit-test flag parsing and prompt skipping
- [x] 5.2 Keep valid ids in the installer (`PALETTES`, guarded by a test against the web app's `PALETTE_IDS`), reject unknown ids before writing anything, and add `applyPalette(root, id)` rewriting `DEFAULT_PALETTE` like `applyLocale`; unit-test valid rewrite, unknown-id failure and default `line`
- [x] 5.3 Write `DEMO_MODE=false` into the generated root `.env` in `generateEnvFiles`; unit-test that generated projects have demo mode off
- [x] 5.4 Extend the installer CI job to generate a project with `--palette forest --yes` and assert the generated `DEFAULT_PALETTE` and `DEMO_MODE=false`

## 6. Integration verification

- [x] 6.1 Add an e2e journey (demo mode on): pick Plum on the landing page, reload, sign in, confirm the dashboard is Plum and stays Plum after switching to dark mode; and a check that the picker is absent when demo mode is off
- [x] 6.2 Run `npm run lint`, `npm run typecheck`, `npm test` and `openspec validate add-theme-palettes --strict`; all pass

## Workflow follow-up

- Archive the change after review requirements are satisfied (`/opsx:archive`), after `bootstrap-ai-saas-starter` is archived so `openspec/specs` exists.
