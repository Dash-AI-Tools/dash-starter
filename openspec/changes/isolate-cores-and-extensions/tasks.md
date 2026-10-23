# Tasks

## 1. Extract the UI core

- [ ] 1.1 [frontend] Create `packages/ui` (`@dash/ui`) with `package.json` exports for `.`, `./styles.css` and `./custom` (an empty user-owned `src/custom/index.ts`), `tsconfig.json`, a Vitest config with its jsdom setup file, and an ESLint config; add `"@dash/ui": "*"` to `apps/web/package.json`; verify `npm install`, `npm run typecheck -w @dash/ui`, `npm run test -w @dash/ui` and `npm run lint -w @dash/ui` succeed on the empty package
- [ ] 1.2 [frontend] Move the 34 primitives and their tests from `apps/web/src/components/ui/` to `packages/ui/src/`, re-export `cn` from a package-local `utils.ts`, replace sibling imports with relative ones, and make `date-picker.tsx` format with `Intl.DateTimeFormat` from its `locale` prop instead of importing `@/lib/i18n`; verify the package tests and typecheck pass and `rg "@/|apps/web" packages/ui/src` returns no app imports
- [ ] 1.3 [frontend] Move `apps/web/src/index.css` and `styles/palettes.css` into `packages/ui/src/styles/`, export them as `@dash/ui/styles.css`, import that file in `apps/web/src/main.tsx`, and move `tokens.test.tsx` with the styles; verify the token/contrast tests pass and the web build includes the palette classes
- [ ] 1.4 [frontend] Replace every `@/components/ui/*` import in `apps/web` (pages, patterns, auth, app shell, tests, showcase) with `@dash/ui` imports and remove the old directory; verify `rg "components/ui" apps/web/src` is empty and `npm run typecheck -w apps/web` plus the web unit suite pass
- [ ] 1.5 [frontend] Add the UI workspace to the root lint/typecheck/test fan-out through its own scripts and confirm the design-token assertions still prove one source of truth; verify `npm run lint`, `npm run typecheck` and `npm test` run the UI package and exit 0
- [ ] 1.6 [frontend] Add a package-level test that fails if a primitive imports a page, provider, API client or locale catalog from the web app; verify the test passes on the moved kit and fails on a temporary violating import
- [ ] 1.7 [frontend] Update `apps/web/Dockerfile` to copy `packages/ui/package.json` before `npm ci` and `packages/ui` before the build; verify `docker compose -f docker-compose.prod.yml build web` succeeds and the final image contains no Storybook files

## 2. Local Storybook

- [ ] 2.1 [frontend] Install the current stable Storybook for React + Vite and its Tailwind integration as dev dependencies of `@dash/ui`, pin the resolved versions, add `.storybook/main.ts` and `.storybook/preview.ts` importing `@dash/ui/styles.css`, and add only a `storybook` dev script; verify `npm run storybook -w @dash/ui` starts and serves the story index without an account or network service
- [ ] 2.2 [frontend] Add stories for the form and control primitives (button, input, textarea, select, combobox, checkbox, radio, switch, date picker, file upload, field, input group, label, calendar, command) showing their main variants; verify Storybook lists them and `npm run typecheck -w @dash/ui` passes
- [ ] 2.3 [frontend] Add stories for the overlay, navigation and feedback primitives (dialog, sheet, dropdown menu, context menu, popover, tooltip, tabs, breadcrumb, pagination, badge, avatar, card, skeleton, empty, table, sonner, separator) showing their main variants; verify every primitive file has a matching `*.stories.tsx` and Storybook lists them
- [ ] 2.4 [frontend] Add a root `storybook` script, keep Storybook out of the root `build` script, the web Docker image and every CI job, and document that it is a local tool; verify `npm run build` produces no Storybook asset and `rg -i storybook .github apps/web/Dockerfile docker-compose*.yml` finds no build or deployment step
- [ ] 2.5 [frontend] Add a small Storybook smoke check to the UI package tests (story files exist for every exported primitive, the preview imports the stylesheet) so a missing story fails the normal suite; verify the check fails when one story is temporarily removed

## 3. Feature extension points

- [ ] 3.1 [backend] Add `"#features/*": "./app/features/*.js"` to `apps/api/package.json`, create `apps/api/app/features/index.ts` exporting `registerFeatureRoutes(router)`, and call it inside the existing `/api/v1` group in `apps/api/start/routes.ts`; verify the existing API suite passes with an empty registry
- [ ] 3.2 [backend] Prove codegen sees feature routes: add a temporary feature route through the registry, run `node ace codegen`, assert the generated registry contains the endpoint, then remove the fixture; verify the check in a test or scripted command and restore a clean registry
- [ ] 3.3 [frontend] Add `apps/web/src/features/index.ts` exporting `featureRoutes: RouteObject[]` and `featureNav: NavItem[]`, spread the routes into the `AppLayout` children in `main.tsx`, and append the nav entries to the main group in `lib/nav.ts`; add `featureScaffoldTitle` and `featureScaffoldDescription` to both locale catalogs; verify the app shell, navigation and localization suites pass with empty registries
- [ ] 3.4 [frontend] Add tests for the registries: a fixture route renders under `/app/:orgSlug/<feature>`, a fixture nav item is visible to a member and hidden by role, and the core router/nav files are not edited by a feature; verify the tests pass and fail if the registry merge is removed
- [ ] 3.5 [backend] Add a functional test that hits a feature endpoint registered through the registry under `/api/v1`, and verify the endpoint is absent until the registry exports it

## 4. Core update tooling

- [ ] 4.1 [tooling] Create `packages/core-tools` (`@dash/core-tools`) with a `bin/dash-core.js`, `src/` modules, `test/` with `node --test`, and lint/test scripts; verify `npm install`, `npm test -w @dash/core-tools` and `npm run lint -w @dash/core-tools` succeed
- [ ] 4.2 [tooling] Implement reading and writing `.dash/install.json` and `.dash/core.json`, SHA-256 checksums, atomic writes, project-root resolution and path-escape rejection; verify unit tests cover a missing manifest, a corrupt manifest, a checksum mismatch and a `../` release path
- [ ] 4.3 [tooling] Implement the update-side materialization from recorded identity: token replacement, locale, palette, the installer removals that affect core files, and every `removedCapabilities` transform (showcase stripping/deletion); add a template-repo test that runs the installer and the updater on the same fixture and asserts identical output; verify the conformance test passes
- [ ] 4.4 [tooling] Implement release resolution (`--to` or latest GitHub release) and the downloader behind an injectable fetch/download seam, rejecting non-HTTPS or foreign repositories and cleaning the temp directory on failure; verify tests cover a successful download, a network failure and a malformed release
- [ ] 4.5 [tooling] Implement `core:update`, `core:check` and `--dry-run` with the classification policy: updated, added, deleted, preserved modified, user-created-in-core, no-op, manifest report and exit codes; verify tests cover every classification, a project with `removedCapabilities: ["showcase"]` (no resurrection, no false conflict) and the exact report
- [ ] 4.6 [tooling] Implement self-update for `packages/core-tools`: classify and write its own files after all other decisions, without leaving a partial tree; verify a fixture update that changes the tool completes and a failure midway leaves the original files
- [ ] 4.7 [tooling] Add root `core:update` and `core:check` scripts and `--help` output; verify `npm run core:check -- --to <same-version>` reports no changes on a generated project and `npm run core:update -- --help` exits 0
- [ ] 4.8 [docs] Write `docs/guides/updating.md` covering the metadata, update/check/dry-run, conflict resolution, release tags, the identity guarantee and the fact that only projects generated from this release are updatable; verify every documented command runs as written on a generated project
- [ ] 4.9 [docs] Add the core/update contract to `docs/architecture.md`: `.dash` files, core vs user-owned paths, the materialization step and the shared installer/updater fixture test; verify every named path exists

## 5. Feature and component generators

- [ ] 5.1 [tooling] Implement `make:feature <name>`: API controller, service, routes and functional test; web page, page test and routes; registrations in both feature registries; validate kebab-case, reserved names, existing files and missing markers; verify fixture tests cover a valid feature, an invalid name, an existing feature and a missing marker with no writes on failure
- [ ] 5.2 [tooling] Add the generated feature's localization keys and navigation entry, and ensure the generated API test and page test are runnable; verify a fixture feature passes its tests and the generated page renders in English and Spanish
- [ ] 5.3 [tooling] Implement `make:component <name>`: component, test, story and export in the user-owned `packages/ui/src/custom/` through an `// exports` marker in `src/custom/index.ts`; validate the same rules; verify fixture tests cover a valid component, an invalid name and an existing component with no writes on failure
- [ ] 5.4 [tooling] Add root `make:feature` and `make:component` scripts and `--help`; verify each command creates the expected files and `npm run typecheck` passes in the affected workspaces
- [ ] 5.5 [tooling] Add an integration test that generates a feature and a component in a temporary copy, runs API codegen, and asserts the typed client contains the feature endpoint and the component is exported from `@dash/ui/custom`; verify the test passes without the network
- [ ] 5.6 [docs] Write `docs/guides/extending.md` covering the ownership boundary, both registries, both generators, localization of feature strings, Storybook for new components and the rule that customizations stay outside core; verify every documented command runs as written
- [ ] 5.7 [docs] Update `docs/architecture.md` and `docs/guides/customizing.md` with the feature registries, generators and the "where a new feature lives" table; verify every named path exists

## 6. Remove the showcase

- [ ] 6.1 [frontend] Add stable marker comments around the showcase route block in `apps/web/src/main.tsx` and around the showcase import/spread in both locale indexes, and add `remove:showcase` to the ownership notes; verify the showcase still renders and the web suite passes before removal
- [ ] 6.2 [tooling] Implement `remove:showcase` with a preflight that checks the known files, markers, catalog references and protected paths, then deletes the page, tests, locales and route/string registrations atomically; record `"showcase"` in `removedCapabilities` and refresh the checksums of the edited core files (or report that no metadata exists in the template checkout); verify fixture tests cover success, a missing marker (no writes), an extra catalog reference (no writes), idempotent second run, metadata updates and protected files remaining
- [ ] 6.3 [tooling] Add the root `remove:showcase` script; verify on a temporary copy of a generated project that the route is gone, Home and the dashboard still render, Storybook and `@dash/ui` remain, and lint/typecheck/tests pass; then run `core:update` against a fixture release that still contains the showcase and verify it stays removed
- [ ] 6.4 [docs] Document the removal command in `docs/guides/customizing.md`, `docs/guides/what-you-get.md` and the README: what it deletes, what it keeps (Home, dashboard, UI kit, Storybook), and that it is safe to run twice; verify the docs name only paths the command touches

## 7. Installer metadata

- [ ] 7.1 [installer] Add `core` and `userOwned` globs to `packages/create-app/template.json` matching the design, and verify the installer test asserts the generated `.dash/core.json` lists them
- [ ] 7.2 [installer] After replacements, pruning, locale/palette selection and env generation, write `.dash/install.json` (identity, token map/values, removals, locale, palette) and `.dash/core.json` (repository, version, globs, SHA-256 checksums); verify a generated project's checksums match the files on disk and no secret value appears in either file
- [ ] 7.3 [installer] Confirm `packages/ui`, `packages/core-tools` and `.dash/` survive generation while `packages/create-app` and `openspec/changes` are removed; verify the existing clean-output installer test and the new metadata assertions pass
- [ ] 7.4 [installer] Add installer tests for a custom `DASH_TEMPLATE_REPO`, a generated project with a Spanish locale and forest palette, and a second generation whose checksums differ only by identity; verify `npm test -w packages/create-app` passes
- [ ] 7.5 [docs] Update the installer section of `README.md` and the generated-project guide: what `.dash/` is, that it contains no secrets and must be committed, and that it enables `core:update`; verify the documented path and commands exist

## 8. CI and quality gates

- [ ] 8.1 [ci] Add `@dash/core-tools` tests to the root test fan-out and a CI test step that proves the installer/updater materialization fixture matches; verify `npm test` runs the tooling suite and a deliberately failing tooling test fails the root command
- [ ] 8.2 [ci] Extend the installer job: assert `.dash`, `packages/ui` and `packages/core-tools`; run `remove:showcase`; generate one feature and one component; run API codegen; run lint, typecheck and tests after each; verify the job steps locally on a generated project
- [ ] 8.3 [ci] Add a CI assertion that Storybook is neither built nor uploaded and that the production web build contains no Storybook assets; verify the assertion fails if a `build-storybook` step is added
- [ ] 8.4 [ci] Ensure the generated project's `core:check --to <same-version>` reports no changes and exits 0 both after generation and after `remove:showcase`; verify both steps in the installer job

## 9. Integration verification

- [ ] 9.1 Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` at the root; all pass
- [ ] 9.2 Run `node ace codegen` in `apps/api` and confirm the generated registry still covers the core routes; verify the diff is limited to the expected feature test fixtures
- [ ] 9.3 Run the e2e suite against the started stack; verify auth, dashboard, members and preferences journeys still pass with the extracted UI package
- [ ] 9.4 Generate a project, remove the showcase, generate a feature and a component, run `core:check --to <same-version>`, run lint/typecheck/tests, then update from a fixture release and confirm the showcase stays gone and the custom component remains; verify the generated project is usable and shows no template branding
- [ ] 9.5 Run `openspec validate isolate-cores-and-extensions --strict`; verify it passes with every scenario mapped to a test or a documented verification
- [ ] 9.6 Inspect `git diff --stat` and confirm no database migration, API response change or secret file is part of the change; verify the only generated artifacts are the expected package/test files

## Workflow follow-up

- Archive the change after the implementation review and all checks pass.
- Bump the template/installer version for the release so generated projects record the version they can update from.
