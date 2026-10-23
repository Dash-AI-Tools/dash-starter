# Design

## Context

See `proposal.md` for motivation and `specs/` for the behavior contract.

- npm workspaces; the web app is React 19 + Vite 8 + Tailwind 4; the API is AdonisJS 7 with a single `start/routes.ts`.
- The 34 primitives live in `apps/web/src/components/ui`; app-level patterns in `components/patterns`; the design tokens in `apps/web/src/index.css` and `styles/palettes.css`.
- The in-app showcase is dev-only and imports both primitives and patterns.
- The installer downloads a GitHub release with `giget`, rewrites identity tokens, prunes template-only files, then initializes git. A generated project has no link back to the template.
- Storybook is not installed. The existing CI runs lint, typecheck, tests, a web build, e2e and an installer smoke test.

## Goals / Non-Goals

**Goals**

- One source of truth for primitives and tokens, consumed by the app and a local Storybook.
- A core update that is safe for a rebranded, already-customized project.
- User-owned feature folders and registries that survive updates.
- Generators that produce a working feature and component without editing core files.
- A removal command that deletes only the showcase.

**Non-Goals**

- A runtime plugin loader, lifecycle or sandbox.
- Publishing the UI or API cores to npm.
- Moving `components/patterns`, `components/brand` or the AdonisJS app into separate packages.
- Hosting Storybook or building it in CI/Docker.
- Auto-merging user edits in core files; they are reported, not merged.
- Migrating projects generated before this change.

## Decisions

### 1. Source-only `@dash/ui` workspace

```
packages/ui/
  package.json          exports ".", "./styles.css" and "./custom"
  tsconfig.json
  vitest.config.ts
  .storybook/{main.ts,preview.ts}
  src/index.ts          barrel of core primitives
  src/utils.ts          re-export of cn
  src/styles/{index.css,palettes.css}
  src/<primitive>.tsx
  src/<primitive>.test.tsx
  src/<primitive>.stories.tsx
  src/custom/index.ts   user-owned barrel, empty at install
```

- Move the primitives, their tests, `tokens.test.tsx`, `index.css` and `palettes.css` into the package. The package exports TypeScript source directly; Vite compiles it for the web app and Storybook. No build step and no dual output.
- `apps/web` depends on `"@dash/ui": "*"` and imports `@dash/ui/styles.css` from `main.tsx`. All `@/components/ui/*` imports become `@dash/ui` imports.
- The production web Dockerfile copies `packages/ui/package.json` before `npm ci` and `packages/ui` before the build. The development Compose stack already mounts the repository root. The final nginx image contains only `dist`, so Storybook never ships.
- `date-picker` drops `@/lib/i18n`: it formats with `Intl.DateTimeFormat` from its `locale` prop (default `en`). `cn` comes from the package-local re-export. No primitive imports a page, provider, API client or catalog.
- `src/custom/` is user-owned and exported as `@dash/ui/custom`; the generator writes new components there. The core barrel stays checksum-managed, so a generated component cannot be lost when the core barrel is replaced by an update.
- Patterns and brand stay in the app. They depend on i18n/API types and are compositions, not primitives. The existing showcase keeps documenting them; Storybook documents every primitive. This keeps the `ui-components` inventory satisfied without extracting app services into the package.
- Storybook uses `@storybook/react-vite`, the Tailwind Vite plugin, and a preview that imports the package stylesheet. Each primitive gets at least one story with its main variants. The package exposes only a `storybook` dev script; the root adds `npm run storybook`. There is no `build-storybook` in the root build, Docker, CI or deployment.
- Alternatives rejected:
  - Keep Storybook inside `apps/web`: no isolation, and the UI package would not be independently checkable.
  - Compile the package: adds a build/watch step and a second artifact to keep in sync.
  - Move patterns too: requires extracting i18n and API concerns for little gain; the showcase already covers them.

### 2. Core boundary and feature registries

The API core stays in place and is declared by manifest. Moving every layer under `app/core` would churn imports, Adonis codegen and the generated controller map for no behavior gain.

- `.dash/core.json` lists core globs and user-owned globs (see the update section).
- `apps/api/package.json` gains `"#features/*": "./app/features/*.js"`.
- `apps/api/app/features/index.ts` is user-owned and exports `registerFeatureRoutes(router)`. Core `start/routes.ts` calls it inside the existing `/api/v1` group. Feature routes use the same router instance and import their controllers/services directly.
- Codegen executes `start/routes.ts`, so routes registered through the feature registry are part of the generated client registry. The implementation verifies this with a generated feature and a codegen assertion; it is the one integration point that must be proven before the rest of the generator lands.
- Web features live in `apps/web/src/features/index.ts`, which exports `featureRoutes: RouteObject[]` and `featureNav: NavItem[]`. Core `main.tsx` spreads `featureRoutes` into the `AppLayout` children; `lib/nav.ts` appends `featureNav` to the main navigation group. Both registries are user-owned and the generator edits only them.
- Alternative rejected: `import.meta.glob` for web routes. It removes the explicit registry but makes navigation, ordering and TypeScript types implicit; the API needs a registry anyway, so both sides use the same convention.

### 3. Update metadata and algorithm

Two committed files under `.dash/`:

- `install.json` — schema version, template version, resolved identity, token map and values, exclude patterns, removed paths/sections/lines/workflow jobs, locale, palette and `removedCapabilities` (empty at install, `["showcase"]` after the removal command). No secrets.
- `core.json` — schema version, upstream repository, installed version, core globs, user-owned globs, and `checksums[path] = "sha256:..."` for every core file.

The installer writes both after replacements, pruning, locale/palette selection and env generation, then initializes git. Checksums are computed on the final generated bytes.

**Core paths** (checksum-updated):

- `apps/api/app/**` except `app/features/**`
- `apps/api/start/**`, `config/**`, `database/**`, `resources/**`
- `apps/api/tests/unit/**` and `tests/functional/**` except `tests/functional/features/**`
- `apps/web/src/**` except `src/features/**`
- `apps/web/{vite.config.ts,tsconfig*.json,index.html}`
- `packages/ui/**` except `src/custom/**`
- `packages/core-tools/**`

**User-owned paths** (never replaced):

- `apps/api/app/features/**`, `apps/api/tests/functional/features/**`
- `apps/web/src/features/**`
- `packages/ui/src/custom/**`
- `.env*`, `openspec/**`, `docs/**`, `README.md`
- root `package.json`, `apps/api/package.json`, `apps/web/package.json`, lockfiles
- Docker, Compose and `.github/**` (teams customize deployment; the updater reports nothing for them)

`packages/ui/package.json` is core because UI dependencies belong to the UI package and teams do not edit it. Root and app manifests are user-owned; the updater prints a manifest diff report and `npm install` when the release changes them. Core code must therefore avoid needing new app-level dependencies; new primitive dependencies go into `packages/ui`.

**Update flow** (`core:update`, `core:check`, `--dry-run`, `--to <version|ref>`):

1. Read `.dash/core.json` and `.dash/install.json`.
2. Resolve the target: `--to`, or the latest GitHub release of the recorded repository.
3. Download the release into a temporary directory with `giget` (the installer already uses it).
4. Materialize the release with the recorded transformations: token replacements, locale, palette, the removal of paths/sections/lines/workflow jobs that the installer would have pruned, and every capability in `removedCapabilities` (for the showcase: delete its files and strip its route/import markers). Only the update-side subset is implemented in `@dash/core-tools`; the installer keeps its broader pipeline. A template-repo test runs both on the same fixture and asserts identical output, so the two cannot drift silently.
5. Walk the core globs and classify each path:
   - local checksum matches the recorded one and the file changed upstream → replace;
   - local checksum matches and upstream deleted it → delete;
   - upstream adds a file absent locally → write it;
   - local checksum differs → preserve, report as modified;
   - local file exists but has no recorded checksum (user-created inside a core path) → preserve, report.
6. Write changed files atomically, then update `core.json` with the new version and checksums. A preserved modified file keeps its old checksum so it is reported again; the version still advances.
7. Print a report: updated, added, deleted, modified, conflicts and manifest notes. Exit non-zero when anything was preserved as modified. `core:check` reports and exits 1 when work is pending; it writes nothing. `--dry-run` behaves like `core:check` but is worded as an update preview.
8. `packages/core-tools` is itself core. Its files are replaced after all decisions, with atomic writes; the running process already holds its modules, so self-update is safe in practice. This is covered by a test that updates a fixture containing the tool.

**Safety**: resolve every release path under the project root, reject `..`/absolute escapes, do not follow symlinks, do not execute downloaded code, never touch `.env` or user-owned paths, and clean the temp directory on failure. A download or materialization failure aborts before any project write.

**Why not git merge**: a merge of the whole template would reintroduce branding, fight user deletions and require an upstream remote. Checksums plus identity materialization give the same update result with a small, testable surface. The release is still fetched from git.

### 4. Generators

`make:feature <name>` and `make:component <name>` are commands of `@dash/core-tools`, exposed as root scripts. They validate `^[a-z][a-z0-9-]*$`, reject reserved names (`core`, `features`, `shared`, `app`, `api`, `ui`) and any existing file, and preflight every target before writing.

`make:feature` creates:

- API: `app/features/<name>/<name>_controller.ts`, `<name>_service.ts`, `routes.ts`; a functional test at `tests/functional/features/<name>.spec.ts`.
- Web: `src/features/<name>/<name>-page.tsx`, `<name>-page.test.tsx`, `routes.tsx`.
- Registrations: an import and a call in `app/features/index.ts`; imports and entries in `src/features/index.ts` for both routes and navigation.

The generated page uses two new generic keys, `featureScaffoldTitle` and `featureScaffoldDescription`, added to both locale catalogs. Feature-specific strings are the developer's responsibility; the scaffold is localized from the first commit.

Registries are edited through marker comments (`// features:imports`, `// features:register`, `// features:routes`, `// features:nav`). A missing marker aborts the command before any write. Markers are simpler and more predictable than an AST codemod, and the generator tests assert the exact registration.

`make:component` creates `packages/ui/src/custom/<name>.tsx`, `<name>.test.tsx`, `<name>.stories.tsx`, and appends the export to the user-owned `src/custom/index.ts` through an `// exports` marker. The component is imported as `@dash/ui/custom`; Storybook discovers it through its normal stories glob. The story uses the component's main props; the test renders it.

Alternative rejected: a generator that only prints snippets. The request is a supported extension path, and a working scaffold plus tests is the acceptance bar.

### 5. Showcase removal

`remove:showcase` is a preflight-then-write command:

- Known paths: `pages/ShowcasePage.tsx`, `pages/showcase.test.tsx`, `pages/showcase.build.test.ts`, `locales/{en,es}/showcase.ts`.
- Marker edits: the dev route block in `main.tsx` and the `showcase` import/spread in both locale indexes. If a marker is missing, or the showcase catalog is imported anywhere else, the command aborts before deleting anything.
- Protected paths are never deleted: `pages/Home.tsx`, `pages/DashboardPage.tsx`, `layouts/AppLayout.tsx`, `layouts/PublicLayout.tsx`, `components/app/**`, `components/patterns/**`, `packages/ui/**`, `packages/core-tools/**`.
- If the page and all markers are already absent, the command succeeds and changes nothing.
- On success the command adds `"showcase"` to `removedCapabilities` in `.dash/install.json` and recomputes the checksums of the core files it edited in `.dash/core.json`, so the removal becomes the new baseline. In the template checkout, where `.dash` does not exist, it still removes the showcase and reports that no update metadata was recorded.
- The updater applies `removedCapabilities` to every downloaded release before comparing, so a later core update never restores the showcase route, page or strings. If an upstream release no longer contains a removal marker, the updater leaves that file untouched and reports a conflict instead of reintroducing the showcase.
- It does not delete Storybook. Storybook is the local component browser; the command removes only the in-app page.
- The command is exercised on a generated project in CI (not on the template checkout) so the template keeps its showcase.

### 6. Installer, scripts and CI

- Root scripts: `core:update`, `core:check`, `make:feature`, `make:component`, `remove:showcase`, `storybook`.
- The installer copies `packages/ui` and `packages/core-tools` through the existing `packages/*` workspace rule, keeps `.dash/`, and continues to remove `packages/create-app` and `openspec/changes`.
- CI adds the new workspaces to lint/typecheck/test automatically. The installer job additionally checks `.dash` and `packages/core-tools`, runs `remove:showcase`, then lint/typecheck/tests. It generates one feature and one component to prove the generators, runs API codegen, and does not start Storybook.
- Storybook dev dependencies are installed by `npm ci`, but no job builds or serves them.

### 7. Documentation and migration

- New `docs/guides/updating.md` (manifest, update/check, conflicts, release tags) and `docs/guides/extending.md` (feature/component generators, registries, ownership).
- Update `docs/architecture.md`, `docs/guides/customizing.md`, `docs/guides/what-you-get.md`, `README.md` commands and the tests guide.
- Existing generated projects cannot use `core:update` until they have `.dash/` metadata; this change does not add a migration command. The guides explain that only projects generated from this release onward are updatable.
- Rollback is a commit revert. There are no database, data or API contract changes.

## Risks / Trade-offs

- **Hand-edited core files are reported on every update** → keep customizations in `features/`, docs say so; the report is explicit and no data is lost.
- **Identity materialization can drift from the installer** → a template-repo test compares both on one fixture; the update surface is intentionally limited to tokens, locale and palette.
- **Adonis codegen may not see feature routes** → implement and verify the registry first with a generated feature; the route file is executed by codegen. If it cannot see lazy imports, register feature routes with direct controller imports in the registry before building the rest of the generator.
- **Moving 34 primitives and the stylesheet breaks imports or the production image** → codemod, package-level tests, full web suite, a production build and a web Docker build that copies the UI workspace; no runtime behavior changes.
- **Storybook compatibility with Vite 8 / React 19** → install the current stable Storybook line, pin the resolved versions, and require `storybook` start plus lint/typecheck before the task is done.
- **Core tools update themselves** → atomic writes after all classification; a fixture test covers the self-update.
- **A user owns a path inside a core glob** → checksums treat it as user-created and preserve it; report it rather than overwrite.
- **An update resurrects a removed showcase or loses a generated component** → `removedCapabilities` is replayed during materialization, and custom components live in the user-owned `src/custom/`; both have fixture tests.
- **Release downloads are a trust boundary** → HTTPS via the recorded repository, path traversal checks, no code execution, temp cleanup, and a dry-run/check mode.

## Migration Plan

1. Extract `@dash/ui` and Storybook; move imports and styles; prove the web build and full web suite.
2. Add the API and web feature registries with an empty registry; prove codegen and navigation.
3. Add `@dash/core-tools` with metadata reading, update/check, generators and removal; unit-test on fixtures.
4. Teach the installer to write `.dash/` metadata and include the tooling; extend the installer CI job.
5. Run `remove:showcase` and both generators on a generated project; run lint, typecheck, tests and API codegen.
6. Update docs and release notes; bump the template/installer version for the release.

## Open Questions

- The exact Storybook major and its Vite 8 peer range are resolved at implementation by installing the current stable line and recording the resolved versions. This does not change the specs or approach.
