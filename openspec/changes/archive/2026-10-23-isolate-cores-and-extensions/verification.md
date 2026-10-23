# Verification matrix

Every scenario of the change points at the test that proves it. The suites are
run with:

| Suite | Command |
| --- | --- |
| API | `cd apps/api && node ace test` |
| Web | `cd apps/web && npx vitest run` |
| UI | `cd packages/ui && npx vitest run` |
| Core tools | `npm test -w @dash/core-tools` |
| Installer | `npm test -w create-dash-starter` |
| End to end | `npm run test:e2e` against the e2e stack |
| CI | the `installer` and `build` jobs of `.github/workflows/ci.yml` |
| Generated project | the run of the task 9.4, described at the end of this file |

## core-extensions

| Scenario | Test | Suite |
| --- | --- | --- |
| Generated project records its core state | `packages/create-app/test/install.test.js` "every core file of the project carries the checksum of its bytes" | Installer |
| Generated project records its core state | `packages/create-app/test/install.test.js` "the project records the ownership of its files" | Installer |
| Feature files are outside the core | `packages/core-tools/test/metadata.test.js` "the user-owned globs win over the core globs" | Core tools |
| Feature files are outside the core | `packages/create-app/test/install.test.js` "every core file of the project carries the checksum of its bytes" | Installer |
| Untouched core file is updated | `packages/core-tools/test/update.test.js` "an untouched core file is updated with the identity of the project" | Core tools |
| Locally modified core file is preserved | `packages/core-tools/test/update.test.js` "a locally modified core file is kept, reported and fails the update" | Core tools |
| New and removed core files | `packages/core-tools/test/update.test.js` "a file added upstream is written and an untouched one removed upstream is deleted" | Core tools |
| Repeated update is harmless | `packages/core-tools/test/update.test.js` "a repeated update reports no changes and writes nothing" | Core tools |
| Rebrand survives an update | `packages/core-tools/test/update.test.js` "an untouched core file is updated with the identity of the project" | Core tools |
| Rebrand survives an update | `packages/create-app/test/conformance.test.js` "the update materializes the template as the installer did" | Installer |
| Locale and palette survive an update | `packages/core-tools/test/update.test.js` "the locale and the palette of the project survive an update" | Core tools |
| Dry run changes nothing | `packages/core-tools/test/update.test.js` "a dry run lists the pending changes and leaves every byte as it was" | Core tools |
| Download failure leaves the project intact | `packages/core-tools/test/update.test.js` "a download failure exits non-zero and leaves the project intact" | Core tools |
| Unsafe path is rejected | `packages/core-tools/test/update.test.js` "a release with an unsafe path exits non-zero and writes nothing" | Core tools |
| Unsafe path is rejected | `packages/core-tools/test/metadata.test.js` "a path that leaves the project is refused" | Core tools |
| Feature endpoint is served | the functional test that `make:feature` emits, run by the `installer` job and by the run of the task 9.4 | CI, Generated project |
| Feature endpoint is served | `apps/api/tests/functional/feature_registry.spec.ts` "a path that no feature exports is not found under /api/v1" | API |
| Feature endpoint reaches the typed client | `packages/core-tools/test/integration.test.js` "a generated feature reaches the typed client and a component the custom entry" | Core tools |
| Feature page is reachable | `apps/web/src/pages/feature-registry.test.tsx` "mounts a feature page under the organization" | Web |
| Feature navigation entry is visible | `apps/web/src/pages/feature-registry.test.tsx` "shows a feature destination to the roles that can reach it" | Web |
| Core router stays unchanged | `packages/core-tools/test/generators.test.js` "make:feature creates a working feature and registers it through the markers" | Core tools |
| Generated feature works end to end | the `installer` job step "Lint, type-check and test the project with the feature", and the run of the task 9.4 | CI, Generated project |
| Invalid name is rejected | `packages/core-tools/test/generators.test.js` "make:feature refuses an invalid or reserved name and writes nothing" | Core tools |
| Invalid name is rejected | `packages/core-tools/test/generators.test.js` "make:feature refuses an existing feature and writes nothing" | Core tools |
| Generated component is usable | `packages/core-tools/test/generators.test.js` "make:component creates a component, its test and its story, and exports it" | Core tools |
| Generated component is usable | `packages/ui/src/stories.test.ts` "finds the stories of the kit and of the project components" | UI |
| Invalid component name is rejected | `packages/core-tools/test/generators.test.js` "make:component refuses an invalid or existing component and writes nothing" | Core tools |
| Showcase is removed without touching the product | `packages/core-tools/test/showcase.test.js` "the showcase is removed from a generated project and the removal is recorded" | Core tools |
| Showcase is removed without touching the product | the `installer` job step "Lint, type-check and test the project without the showcase" | CI |
| Second run is a no-op | `packages/core-tools/test/showcase.test.js` "a second run is a successful no-op" | Core tools |
| An update keeps the showcase removed | `packages/core-tools/test/update.test.js` "a removed showcase stays removed and is no conflict" | Core tools |
| Protected files are never deleted | `packages/core-tools/test/showcase.test.js` "the showcase is removed from a generated project and the removal is recorded" | Core tools |

## project-installer

| Scenario | Test | Suite |
| --- | --- | --- |
| Generated project carries update metadata | `packages/create-app/test/install.test.js` "the metadata names the identity and holds no secret" | Installer |
| Generated project carries update metadata | `packages/create-app/test/install.test.js` "every core file of the project carries the checksum of its bytes" | Installer |
| Metadata contains no secrets | `packages/create-app/test/install.test.js` "the metadata names the identity and holds no secret" | Installer |
| Create project in a new directory | `packages/create-app/test/install.test.js` "the cores and the metadata travel while the installer does not" | Installer |
| Create project in a new directory | `packages/create-app/test/install.test.js` "a project is generated from a local template" | Installer |
| Target directory is not empty | `packages/create-app/test/install.test.js` "a directory that is not empty is refused" | Installer |
| Clean output | `packages/create-app/test/install.test.js` "the cores and the metadata travel while the installer does not" | Installer |

## quality-tooling

| Scenario | Test | Suite |
| --- | --- | --- |
| Tooling regression fails the suite | a deliberately failing test in `packages/core-tools/test` made the root `npm test` exit 1 and name it (task 8.1) | Core tools |
| Tooling is tested without the network | `packages/core-tools/test/update.test.js` "a local template is used instead of a download" | Core tools |
| Tooling is tested without the network | `packages/core-tools/test/release.test.js` "a release is downloaded from the recorded repository into a temporary directory" (a mocked download) | Core tools |
| Failing test blocks merge | the `test` job of `.github/workflows/ci.yml` runs `npm test`, which includes every workspace suite | CI |
| Storybook is not a CI artifact | `packages/ui/src/storybook-local.test.ts` "is built by no workflow, image or compose file" | UI |
| Storybook is not a CI artifact | the `build` job step "Check that the web build ships no Storybook asset" | CI |
| Installer regression | `packages/create-app/test/install.test.js` "no placeholder of the template survives in the project" | Installer |
| Installer regression | `packages/create-app/test/conformance.test.js` "the update materializes the template as the installer did" | Installer |
| Showcase removal in a generated project | the `installer` job steps "Remove the showcase" and "Lint, type-check and test the project without the showcase" | CI |

## ui-components

| Scenario | Test | Suite |
| --- | --- | --- |
| Web app consumes the UI package | `apps/web/src/lib/palettes.test.ts` "come from the stylesheet of the UI package" | Web |
| Web app consumes the UI package | `npm run build -w @dash/web` and the web image built from `apps/web/Dockerfile` (task 1.7) | Build |
| Primitives have no app dependencies | `packages/ui/src/boundaries.test.ts` "never imports a page, a provider, the API client or a catalog of the app" | UI |
| Tokens have one source | `apps/web/src/lib/palettes.test.ts` "have no second copy in the app" | Web |
| Tokens have one source | `packages/ui/src/stories.test.ts` "renders the stories with the stylesheet of the package" | UI |
| Every primitive has a story | `packages/ui/src/stories.test.ts` "has a story for every exported primitive" | UI |
| Storybook is local only | `packages/ui/src/storybook-local.test.ts` "is left out of the build scripts of the workspaces" | UI |
| One command starts the local stories | `npm run storybook` served `index.json` with 78 stories of the 32 primitives, offline (task 2.1) | Manual |
| Production build | `apps/web/src/pages/showcase.build.test.ts` "does not ship the showcase page in a production build" | Web |
| Showcase is removable after install | the `installer` job steps "Remove the showcase" and "Lint, type-check and test the project without the showcase" | CI |

## The run of the task 9.4

A project generated from the checkout as "Acme AI" with `--locale es --palette forest`:

1. `npm run core:check -- --source <template>` reported no changes.
2. `npm run remove:showcase` deleted the five showcase files and edited the three marked files; a second run changed nothing.
3. `npm run make:feature -- invoices` and `npm run make:component -- data-card`, then `node ace codegen`: the typed client holds `/api/v1/orgs/:orgSlug/invoices`.
4. `npm run lint`, `npm run typecheck` and `npm test` passed in every workspace (API 255 passed and 1 skipped, the template-only installer assertion).
5. `npm run core:update -- --source <template>` against a template that still has the showcase added the new core files and left the showcase, the feature and the component in place; `core:check` then reported no changes.
6. No file outside the preserved core tools names the template.
