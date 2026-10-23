---
type: Reference
title: Architecture
description: The map of the repository: workspaces, layers, request flow, the core and its extension points, persistence, localization, tests and CI.
tags: [architecture, monorepo, api, web, ui, core, reference]
status: stable
---

# Architecture

The map of this repository: the workspaces, the layers of the API and the web app, the UI kit, the shared AI tool registry, the core and its feature registries, the update contract, persistence, configuration, localization, tests and CI, plus the commands that build and check each workspace.

Read this before changing anything. If a change adds, removes or moves a workspace, a layer, a module boundary or a shared contract, this document is updated in the same change.

## Workspaces

npm workspaces, Node `>=24.22.1` (`.nvmrc`, `engine-strict` in `.npmrc`).

| Workspace             | Package               | Stack                                                             |
| --------------------- | --------------------- | ----------------------------------------------------------------- |
| `apps/api`            | `@dash/api`           | AdonisJS 7, Lucid (Postgres), VineJS, Japa                        |
| `apps/web`            | `@dash/web`           | React 19, Vite, react-router, Tailwind 4, TanStack Query, Vitest  |
| `packages/ui`         | `@dash/ui`            | The UI kit: primitives and design tokens, Vitest, local Storybook |
| `packages/core-tools` | `@dash/core-tools`    | Node CLI: core update, generators, showcase removal (`node:test`) |
| `e2e`                 | `@dash/e2e`           | Playwright                                                        |
| `packages/create-app` | `create-dash-starter` | Node installer (`node:test`)                                      |
| `plugins/dsh`         | `@dash/dsh`           | Claude Code plugin: agents, skills, hook scripts (`node:test`)    |

The root `package.json` fans out to the workspaces:

| Command                   | Runs                                                                     |
| ------------------------- | ------------------------------------------------------------------------ |
| `npm run dev`             | `dev` in every workspace that has one                                    |
| `npm run build`           | `build` in every workspace that has one                                  |
| `npm run lint`            | `eslint .` per workspace                                                 |
| `npm run typecheck`       | `tsc --noEmit` (or `tsc -b --noEmit`) per workspace                      |
| `npm run test`            | `test` in every workspace that has one                                   |
| `npm run format`          | `prettier --write .` (root, all workspaces)                              |
| `npm run format:check`    | `prettier --check .` (root, all workspaces)                              |
| `npm run test:e2e`        | `playwright test` (`e2e` workspace)                                      |
| `npm run storybook`       | `storybook dev --port 6006 --no-open` (`@dash/ui` workspace), local only |
| `npm run core:update`     | `node packages/core-tools/bin/core.js update`                            |
| `npm run core:check`      | `node packages/core-tools/bin/core.js check`                             |
| `npm run make:feature`    | `node packages/core-tools/bin/core.js make:feature`                      |
| `npm run make:component`  | `node packages/core-tools/bin/core.js make:component`                    |
| `npm run remove:showcase` | `node packages/core-tools/bin/core.js remove:showcase`                   |
| `prepare`                 | `git config core.hooksPath .githooks` on install                         |

The core tools take their arguments after `--`: `npm run make:feature -- invoices`, `npm run core:check -- --to 0.2.0`. The root scripts call `packages/core-tools/bin/core.js` by path, not by workspace name, because the installer rebrands the workspace names.

Per workspace:

| Workspace             | Build                  | Test                               | Lint       | Typecheck         | Format        |
| --------------------- | ---------------------- | ---------------------------------- | ---------- | ----------------- | ------------- |
| `apps/api`            | `node ace build`       | `node ace test`                    | `eslint .` | `tsc --noEmit`    | root Prettier |
| `apps/web`            | `tsc -b && vite build` | `vitest run`                       | `eslint .` | `tsc -b --noEmit` | root Prettier |
| `packages/ui`         | —                      | `vitest run`                       | `eslint .` | `tsc --noEmit`    | root Prettier |
| `packages/core-tools` | —                      | `node --test "test/**/*.test.js"`  | `eslint .` | —                 | root Prettier |
| `e2e`                 | —                      | `npm run test:e2e`                 | `eslint .` | `tsc --noEmit`    | root Prettier |
| `packages/create-app` | —                      | `node --test "test/**/*.test.js"`  | `eslint .` | —                 | root Prettier |
| `plugins/dsh`         | —                      | `node --test "scripts/*.test.mjs"` | —          | —                 | root Prettier |

`packages/ui` has no `build`: it exports its TypeScript source, which Vite compiles for the web app and for Storybook. `packages/create-app` and `packages/core-tools` have no `typecheck` and no `build`; `e2e` has no `build`; `plugins/dsh` has only `test`. Formatting is a single root Prettier run over the whole repository (`prettier.config.js`), so a workspace without a `format` script is still formatted.

## API: layers and request flow

```
apps/api/start/routes.ts                 (+ registerFeatureRoutes from apps/api/app/features/index.ts)
  → apps/api/app/middleware/*.ts        (auth, verified, org, ...)
  → apps/api/app/controllers/*_controller.ts
  → apps/api/app/validators/*.ts         (VineJS)
  → apps/api/app/services/*.ts           (domain logic)
  → apps/api/app/models/*.ts             (Lucid)
  → apps/api/app/transformers/*_transformer.ts   (response shape)
```

| Layer        | Directory                        | Responsibility                                                                                                                                                                          |
| ------------ | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Routes       | `apps/api/start/routes.ts`       | Every route. `/api/v1` group; organization routes under `orgs/:orgSlug` with `middleware.auth()` and `middleware.org()`                                                                 |
| Middleware   | `apps/api/app/middleware/`       | `auth`, `verified`, `org` (resolves the membership of `orgSlug`), plus locale, container bindings and JSON forcing                                                                      |
| Controllers  | `apps/api/app/controllers/`      | HTTP only: validate, authorize, call a service, serialize                                                                                                                               |
| Validators   | `apps/api/app/validators/`       | VineJS schemas, one file per resource                                                                                                                                                   |
| Services     | `apps/api/app/services/`         | Domain logic, the only layer that touches the database and the AI layer                                                                                                                 |
| Models       | `apps/api/app/models/`           | Lucid models extending `apps/api/database/schema.ts`                                                                                                                                    |
| Transformers | `apps/api/app/transformers/`     | `serialize.withoutWrapping(...)` shapes returned to the client                                                                                                                          |
| Abilities    | `apps/api/app/abilities/main.ts` | Bouncer policies (`user.updateOrganization`, `organization.deleteOrganization`, ...)                                                                                                    |
| Mails        | `apps/api/app/mails/`            | One class per transactional mail; templates in `apps/api/resources/views/emails/`                                                                                                       |
| Exceptions   | `apps/api/app/exceptions/`       | `errors.ts` (domain errors) and `handler.ts` (HTTP mapping)                                                                                                                             |
| Ace commands | `apps/api/commands/`             | `node ace billing:sync`                                                                                                                                                                 |
| Features     | `apps/api/app/features/`         | Owned by the product: one folder per feature (routes, controller, service), registered by `registerFeatureRoutes(router)` inside the `/api/v1` group and imported through `#features/*` |

MCP is mounted outside `/api/v1` because MCP clients address the API root: `POST /mcp` and `GET /mcp` in `apps/api/start/routes.ts`.

## AI layer and the shared tool registry

| Piece                    | Path                                                                            | Role                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Provider registry        | `apps/api/config/ai.ts`                                                         | `AI_PROVIDERS`, `AI_ALIASES` (`chat`, `fast`, `reasoning`, `image`), `AI_CAPABILITIES`, per-alias pricing, timeouts                       |
| Service                  | `apps/api/app/services/ai.ts`                                                   | `AiService`: `generateText`, `streamText`, `generateObject`, `generateImage`; quota check, metering, timeouts                             |
| Models and stub          | `apps/api/app/services/ai_models.ts`                                            | `languageModelOf(alias)`, `imageModelOf(alias)`, the deterministic `stub` provider used by tests                                          |
| Usage                    | `apps/api/app/services/ai_usage.ts`                                             | `usedCredits`, quota thresholds, usage events                                                                                             |
| Chat                     | `apps/api/app/services/chat.ts`                                                 | Chat system prompt, tool wiring, conversation persistence                                                                                 |
| Tool registry (contract) | `apps/api/app/tools/registry.ts`                                                | `ToolDefinition` (`name`, `descriptionKey`, `schema`, `minRole`, `scope`, `execute`), `ToolRegistry.call` with role and scope enforcement |
| Tool registration        | `apps/api/app/tools/main.ts`                                                    | `toolRegistry.register(...)` for every tool                                                                                               |
| Tools                    | `apps/api/app/tools/{list_members,organization_info,ai_usage,generate_text}.ts` | One file per tool, shared by chat and MCP                                                                                                 |

A tool is added by writing its file and registering it in `apps/api/app/tools/main.ts`. Changing `apps/api/app/tools/registry.ts` itself is a contract change: it is scheduled first and merged alone.

The `stub` provider is the default in development and tests, so no API key is needed to run the whole suite. In production an unconfigured provider refuses to start.

## MCP

| Piece        | Path                                             | Role                                                                                                         |
| ------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Controller   | `apps/api/app/controllers/mcp_controller.ts`     | Bearer-token authentication, entitlement check, budget consumption, stateless streamable HTTP transport      |
| Server       | `apps/api/app/services/mcp.ts`                   | `createMcpServer(ctx)` registers every tool of the shared registry with its schema and localized description |
| Usage        | `apps/api/app/services/mcp_usage.ts`             | `mcpUsage(organization)`, `recordMcpCall(...)`                                                               |
| API keys     | `apps/api/app/services/api_keys.ts`              | `createApiKey`, `listApiKeys`, `revokeApiKey`, `verifyApiKey`; scopes `mcp:read` and `mcp:write`             |
| API key HTTP | `apps/api/app/controllers/api_key_controller.ts` | `orgs/:orgSlug/api-keys` routes                                                                              |
| Docs         | `docs/mcp.md`                                    | Every tool, its scope and its input                                                                          |

The MCP server and the in-app chat call the same registry, so a tool added for the chat is exposed to MCP clients without a second implementation.

## Web app

| Piece         | Path                                  | Role                                                                                                                                                                                                      |
| ------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pages         | `apps/web/src/pages/*Page.tsx`        | One page per route, with a colocated `*.test.tsx`                                                                                                                                                         |
| Layouts       | `apps/web/src/layouts/`               | `AppLayout` (signed in), `PublicLayout` (public site)                                                                                                                                                     |
| Components    | `apps/web/src/components/`            | `apps/web/src/components/patterns/` (data table, form, page header), `apps/web/src/components/app/` (shell), `apps/web/src/components/brand/`, plus one folder per feature                                |
| Features      | `apps/web/src/features/`              | Owned by the product: one folder per feature; `featureRoutes` is spread into the `AppLayout` children of `apps/web/src/main.tsx`, `featureNav` is appended to the main group of `apps/web/src/lib/nav.ts` |
| API client    | `apps/web/src/lib/api.ts`             | Typed client built from the API registry (`@dash/api/registry`); CSRF and locale headers, `urlFor`                                                                                                        |
| Feature hooks | `apps/web/src/lib/*.ts`               | One file per feature (`organizations.ts`, `api-keys.ts`, `billing.ts`, `chat.ts`, `onboarding.ts`)                                                                                                        |
| Localization  | `apps/web/src/locales/{en,es}/`       | 14 catalogs per locale; `es` must satisfy the shape of `en`                                                                                                                                               |
| Providers     | `apps/web/src/providers/`             | Theme, palette, consent, app providers                                                                                                                                                                    |
| Showcase      | `apps/web/src/pages/ShowcasePage.tsx` | The component showcase at `/app/:orgSlug/dev/components`, in dev builds or with `VITE_ENABLE_SHOWCASE=true`; `npm run remove:showcase` deletes it                                                         |

The web app never talks to the database: it calls the API through `apps/web/src/lib/api.ts`, whose types are generated from the AdonisJS registry (`node ace codegen` in `apps/api`).

## UI kit

The primitives and the design tokens live in the `@dash/ui` workspace. The web app depends on `"@dash/ui": "*"` and imports the stylesheet once, in `apps/web/src/main.tsx`.

| Piece             | Path                                  | Import                | Role                                                                                                          |
| ----------------- | ------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------- |
| Primitives        | `packages/ui/src/<primitive>.tsx`     | `@dash/ui`            | Button, input, dialog, table and the rest of the kit, each with a story                                       |
| Core barrel       | `packages/ui/src/index.ts`            | `@dash/ui`            | Exports every primitive and `cn`                                                                              |
| Custom components | `packages/ui/src/custom/`             | `@dash/ui/custom`     | Owned by the product; `npm run make:component` writes here and exports from `packages/ui/src/custom/index.ts` |
| Global styles     | `packages/ui/src/styles/index.css`    | `@dash/ui/styles.css` | Tailwind 4 theme, fonts, base layer; `@source` scans the package                                              |
| Tokens            | `packages/ui/src/styles/palettes.css` | through `index.css`   | Six palettes (`line`, `ink`, `ocean`, `forest`, `plum`, `ember`) in light and dark                            |
| Storybook         | `packages/ui/.storybook/`             | —                     | `npm run storybook` on port 6006; stories are `packages/ui/src/**/*.stories.tsx`                              |

- A primitive never imports the web app: `packages/ui/src/boundaries.test.ts` fails on a page, provider, layout, catalog, API client or `@/` import. Patterns and brand components stay in `apps/web/src/components/`.
- `packages/ui/src/stories.test.ts` fails when a primitive of the core barrel has no story; `packages/ui/src/tokens.test.tsx` and `packages/ui/src/styles/palettes.test.ts` check the tokens and the contrast.
- Storybook is a local tool. `packages/ui/src/storybook-local.test.ts` fails if a workflow, a Compose file or a Dockerfile builds it, and the `build` job of CI checks that `apps/web/dist` holds no Storybook asset.
- The production web image copies `packages/ui` before the build (`apps/web/Dockerfile`); the final image holds only `dist`.
- `apps/web/components.json` points the shadcn CLI at the package (`ui` is `@dash/ui`, the stylesheet is `packages/ui/src/styles/index.css`): `npx shadcn add <component>`, run in `apps/web`, writes `packages/ui/src/<component>.tsx`. Export it from `packages/ui/src/index.ts` and give it a story, or `packages/ui/src/stories.test.ts` fails.

## The core, the features and the update

A generated project holds two halves: the core, which `npm run core:update` replaces while it is untouched, and the product, which the update never writes. The guides are `docs/guides/updating.md` and `docs/guides/extending.md`; this section is the contract.

### Ownership

The globs live in `packages/create-app/template.json` (`core`, `userOwned`), are copied into `.dash/core.json` by the installer, and are the defaults of `packages/core-tools/src/metadata.js` (`DEFAULT_CORE`, `DEFAULT_USER_OWNED`). A path that matches a `userOwned` glob is never core.

| Half    | Paths                                                                                                                                                                                                                                                                               |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core    | `apps/api/{app,start,config,database,resources}/**`, `apps/api/tests/{unit,functional}/**`, `apps/web/src/**`, `apps/web/{vite.config.ts,tsconfig*.json,index.html}`, `packages/ui/**`, `packages/core-tools/**`                                                                    |
| Product | `apps/api/app/features/**`, `apps/api/tests/functional/features/**`, `apps/web/src/features/**`, `packages/ui/src/custom/**`, `.env*`, `openspec/**`, `docs/**`, `README.md`, the root, API and web `package.json`, the lockfiles, the Dockerfiles, the Compose files, `.github/**` |

A path in neither list (`e2e/`, `plugins/`, `apps/api/commands/`) is outside the update.

### The metadata

| File                 | Written by                                                                    | Holds                                                                                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.dash/install.json` | the installer (`packages/create-app/src/metadata.js`), then `remove:showcase` | template version, identity, token map and values, `exclude`, `preserve`, the removed paths, sections, lines and workflow jobs, locale, palette, `removedCapabilities` |
| `.dash/core.json`    | the installer, then `core:update` and `remove:showcase`                       | `repository`, `version`, `core`, `userOwned`, a `sha256:` checksum of every core file                                                                                 |

Both files carry `schemaVersion: 1`, hold no secret and are committed. The installer writes them after the replacements, the pruning, the locale, the palette and the env files, so the checksums describe the bytes the developer receives. The directory is always `.dash`: it is written after the rebrand, and the tools that read it are left out of the token replacement.

### Materialization

An update never compares the project with the raw release. `materialize` in `packages/core-tools/src/transform.js` first replays on the release, in the installer's order, the update-side subset of its pipeline: the excluded paths, the removed sections and lines, the token replacement (except on `preserve`), the removed paths and workflow jobs, the locale (`apps/web/src/lib/i18n.tsx`), the palette (`apps/web/src/lib/palettes.ts`), then every capability of `removedCapabilities` (`showcase`, from `packages/core-tools/src/showcase.js`). Then `classify` in `packages/core-tools/src/update.js` decides each core path from three checksums (recorded, on disk, release), and `applyOperations` in `packages/core-tools/src/files.js` writes the result as one transaction: `packages/core-tools/**` after every other file, `.dash/core.json` last.

The updater keeps its own copy of the installer's token compiler, because `packages/create-app` is removed from every generated project. `packages/create-app/test/conformance.test.js` runs the installer and `materialize` on the same fixture, for two identities (one in Spanish with the `forest` palette), and asserts byte-for-byte identical trees, so the two cannot drift.

Token immunity: `preserve: ["packages/core-tools/**"]` in `packages/create-app/template.json` keeps the tools' source out of the rebrand, at install and at every update. Their entry point is `packages/core-tools/bin/core.js`, and the root scripts call it by path.

### Feature registries and markers

| Registry                          | Exports                                                 | Called by                                                                                                                        |
| --------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/app/features/index.ts`  | `registerFeatureRoutes(router)`                         | `apps/api/start/routes.ts`, inside the `/api/v1` group; `node ace codegen` executes it, so feature routes reach the typed client |
| `apps/web/src/features/index.ts`  | `featureRoutes: RouteObject[]`, `featureNav: NavItem[]` | `apps/web/src/main.tsx` (children of `AppLayout`, under `/app/:orgSlug`), `apps/web/src/lib/nav.ts` (appended to the main group) |
| `packages/ui/src/custom/index.ts` | the components of the product                           | `@dash/ui/custom`                                                                                                                |

The generators and the removal command edit core and registry files only through marker comments. A marker is a whole line, indentation aside. A generator inserts its line right above its marker and aborts before any write when the marker is missing or repeated; the removal command aborts before any write when a file still reaches the showcase without its marker.

| File                                    | Markers                                                              |
| --------------------------------------- | -------------------------------------------------------------------- |
| `apps/api/app/features/index.ts`        | `// features:imports`, `// features:register`                        |
| `apps/web/src/features/index.ts`        | `// features:imports`, `// features:routes`, `// features:nav`       |
| `packages/ui/src/custom/index.ts`       | `// exports`                                                         |
| `apps/web/src/main.tsx`                 | `// showcase:start` and `// showcase:end` around the dev route block |
| `apps/web/src/locales/{en,es}/index.ts` | `// showcase:line` at the end of each showcase line                  |

### Generators and removal

| Command                            | Module                                  | Writes                                                                                                                                                                                                                                                        |
| ---------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run make:feature -- <name>`   | `packages/core-tools/src/generators.js` | The API controller, service and routes, the functional test, the web page, its test and its routes, and both registrations                                                                                                                                    |
| `npm run make:component -- <name>` | `packages/core-tools/src/generators.js` | A component, its test and its story in `packages/ui/src/custom/`, and its export                                                                                                                                                                              |
| `npm run remove:showcase`          | `packages/core-tools/src/showcase.js`   | Deletes `apps/web/src/pages/ShowcasePage.tsx`, `apps/web/src/pages/showcase.test.tsx`, `apps/web/src/pages/showcase.build.test.ts` and `apps/web/src/locales/{en,es}/showcase.ts`; strips the showcase markers; records `"showcase"` in `removedCapabilities` |

The names are lowercase kebab-case; `core`, `features`, `shared`, `app`, `api` and `ui` are reserved. Every target is checked before the first write.

### Where a new feature lives

For a feature named `purchase-orders`:

| Piece                      | Path                                                                                                  | Created by       |
| -------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------- |
| API routes                 | `apps/api/app/features/purchase-orders/routes.ts`                                                     | `make:feature`   |
| API controller             | `apps/api/app/features/purchase-orders/purchase_orders_controller.ts`                                 | `make:feature`   |
| API service                | `apps/api/app/features/purchase-orders/purchase_orders_service.ts`                                    | `make:feature`   |
| API test                   | `apps/api/tests/functional/features/purchase_orders.spec.ts`                                          | `make:feature`   |
| API registration           | `apps/api/app/features/index.ts`                                                                      | `make:feature`   |
| Web page and its test      | `apps/web/src/features/purchase-orders/purchase-orders-page.tsx`, `purchase-orders-page.test.tsx`     | `make:feature`   |
| Web routes and navigation  | `apps/web/src/features/purchase-orders/routes.tsx`                                                    | `make:feature`   |
| Web registration           | `apps/web/src/features/index.ts`                                                                      | `make:feature`   |
| A component of the feature | `packages/ui/src/custom/<component>.tsx`, its test and its story                                      | `make:component` |
| Strings                    | `apps/web/src/locales/{en,es}/`, `apps/api/resources/lang/{en,es}/` (core files)                      | by hand          |
| Migrations                 | `apps/api/database/migrations/` (a new file in a core path: kept by updates, reported as not tracked) | by hand          |

## Persistence and migrations

- Postgres, one database for development (`dash`) and one for the test suite (`dash_test`).
- Migrations: `apps/api/database/migrations/` (one file per change, timestamped names).
- Generated schema: `apps/api/database/schema.ts`; models extend it.
- Seeders: `apps/api/database/seeders/main.ts` (plans) and `apps/api/database/seeders/demo.ts` (demo data).
- `node ace migration:run --force` applies them; the containers run it on start.

## Configuration and environment

| File                    | Tracked | Purpose                                          |
| ----------------------- | ------- | ------------------------------------------------ |
| `.env`                  | no      | Root secrets (`APP_KEY`)                         |
| `.env.example`          | yes     | Root template                                    |
| `apps/api/.env`         | no      | Local API configuration                          |
| `apps/api/.env.example` | yes     | API template                                     |
| `apps/api/.env.docker`  | yes     | Configuration used inside the Compose containers |
| `apps/api/.env.test`    | yes     | Configuration used by the test suite             |

The API reads its configuration from `apps/api/config/*.ts` (`ai.ts`, `auth.ts`, `database.ts`, `mail.ts`, `session.ts`, `shield.ts`, ...). The web app reads `VITE_*` variables (`VITE_API_URL`, `VITE_DEMO_MODE`, `VITE_ENABLE_SHOWCASE`).

The Compose stacks are `docker-compose.yml` (development, project `dash-starter`) and `docker-compose.e2e.yml` (end-to-end, project `dash-e2e`); `docker-compose.prod.yml` builds the production images. Development ports: `5433` (database), `8025` (Mailpit UI), `1025` (SMTP), `3333` (API), `5173` (web). End-to-end ports: `5434`, `8026`, `1026`, `3334`, `5174`. These are the defaults: the project names and the host ports are variables of the root `.env` (`DEV_COMPOSE_PROJECT_NAME`, `DB_HOST_PORT`, ..., and the same with the `E2E_` prefix), listed in `README.md`, so a worktree runs its own stacks next to these.

## Localization

- API: JSON catalogs in `apps/api/resources/lang/{en,es}/` (`chat.json`, `errors.json`, `mail.json`, `organizations.json`, `profile.json`, `validator.json`).
- Web: TypeScript catalogs in `apps/web/src/locales/{en,es}/` (14 files each). `apps/web/src/locales/es/index.ts` ends with `export const es = { ... } satisfies Messages`, so a missing or extra Spanish key is a type error.
- The active locale comes from the `locale` cookie, is sent as `Accept-Language` by the client and resolved by `apps/api/app/middleware/detect_user_locale_middleware.ts`.
- Every new user-facing string is added to both locales.

## Tests

| Suite          | Path                                 | Needs a database | Command                            |
| -------------- | ------------------------------------ | ---------------- | ---------------------------------- |
| API unit       | `apps/api/tests/unit/`               | no               | `node ace test unit`               |
| API functional | `apps/api/tests/functional/`         | yes              | `node ace test functional`         |
| Web unit       | `apps/web/src/**/*.test.tsx`         | no               | `vitest run`                       |
| UI kit         | `packages/ui/src/**/*.test.{ts,tsx}` | no               | `vitest run`                       |
| Core tools     | `packages/core-tools/test/`          | no               | `node --test "test/**/*.test.js"`  |
| Installer      | `packages/create-app/test/`          | no               | `node --test "test/**/*.test.js"`  |
| Harness        | `plugins/dsh/scripts/`               | no               | `node --test "scripts/*.test.mjs"` |
| End to end     | `e2e/specs/`                         | yes (full stack) | `npm run test:e2e`                 |

- API tests use Japa (`apps/api/tests/bootstrap.ts`); functional tests use the `Browser` helper in `apps/api/tests/helpers/browser.ts` to keep a signed-in session.
- The core tools are tested without the network: the releases are local fixtures behind the `fetch` and `download` seams of `packages/core-tools/test/helpers.js`. The installer/updater conformance test is `packages/create-app/test/conformance.test.js`.
- The end-to-end suite needs the Compose stack: `docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d --wait`.

## CI

`.github/workflows/ci.yml` runs on pull requests and on pushes to `main`:

| Job              | What it does                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lint-typecheck` | `node ace codegen`, `npm run format:check`, `npm run lint`, `npm run typecheck`                                                                                                                                                                                                                                                                                                                         |
| `test`           | Postgres service, `node ace migration:run --force`, `npm test`                                                                                                                                                                                                                                                                                                                                          |
| `build`          | `npm run build`, then a check that `apps/web/dist` holds no Storybook asset                                                                                                                                                                                                                                                                                                                             |
| `e2e`            | Compose stack, `node ace db:seed`, `npm run test:e2e`                                                                                                                                                                                                                                                                                                                                                   |
| `installer`      | Generates a project with `create-dash-starter` (Spanish, `forest`) and checks it, harness and `.dash/` included; runs `npm run core:check -- --source "$GITHUB_WORKSPACE"`, `npm run remove:showcase`, `npm run make:feature -- invoices`, `npm run make:component -- data-card` and `node ace codegen`; lint, typecheck and tests run after the generation, after the removal and after the generators |

No job builds, serves or uploads Storybook.

Before CI, `.githooks/pre-commit` checks the staged files of every commit (format, lint, typecheck, fast tests, staged secrets). `docs/harness.md` describes it.

## Where each kind of change lives

| Change                    | Files                                                                                                                                        | Imitate                                                                                                                                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API endpoint              | `apps/api/start/routes.ts`, `apps/api/app/controllers/`, `apps/api/app/validators/`, `apps/api/app/services/`, `apps/api/app/transformers/`  | `apps/api/app/controllers/organization_controller.ts`, `apps/api/app/validators/organization.ts`, `apps/api/app/services/organizations.ts`, `apps/api/app/transformers/organization_transformer.ts` |
| Database change           | `apps/api/database/migrations/`, `apps/api/database/schema.ts` (regenerated)                                                                 | the newest migration in `apps/api/database/migrations/`                                                                                                                                             |
| Authorization rule        | `apps/api/app/abilities/main.ts`                                                                                                             | `updateOrganization` in `apps/api/app/abilities/main.ts`                                                                                                                                            |
| API key or MCP feature    | `apps/api/app/services/api_keys.ts`, `apps/api/app/services/mcp.ts`, `docs/mcp.md`                                                           | `apps/api/app/services/api_keys.ts`                                                                                                                                                                 |
| AI tool or provider       | `apps/api/app/tools/<tool>.ts`, `apps/api/app/tools/main.ts`, `apps/api/config/ai.ts`, `docs/ai.md`                                          | `apps/api/app/tools/list_members.ts`                                                                                                                                                                |
| AI behaviour              | `apps/api/app/services/ai.ts`, `apps/api/app/services/ai_usage.ts`                                                                           | `generateText` in `apps/api/app/services/ai.ts`                                                                                                                                                     |
| Web page                  | `apps/web/src/pages/`, `apps/web/src/lib/`, `apps/web/src/locales/{en,es}/`                                                                  | `apps/web/src/pages/MembersPage.tsx`, `apps/web/src/lib/organizations.ts`, `apps/web/src/locales/en/organizations.ts`                                                                               |
| Product feature           | `apps/api/app/features/<name>/`, `apps/api/tests/functional/features/`, `apps/web/src/features/<name>/`, both `features/index.ts` registries | the output of `npm run make:feature -- <name>`                                                                                                                                                      |
| Web component             | `apps/web/src/components/`                                                                                                                   | `apps/web/src/components/api-keys/api-keys-settings.tsx`                                                                                                                                            |
| UI primitive (core)       | `packages/ui/src/<primitive>.tsx`, `packages/ui/src/<primitive>.stories.tsx`, `packages/ui/src/index.ts`                                     | `packages/ui/src/button.tsx`, `packages/ui/src/button.stories.tsx`                                                                                                                                  |
| Product component         | `packages/ui/src/custom/`                                                                                                                    | the output of `npm run make:component -- <name>`                                                                                                                                                    |
| Design token or palette   | `packages/ui/src/styles/palettes.css`                                                                                                        | the `line` palette block                                                                                                                                                                            |
| Core update or generators | `packages/core-tools/src/`, `packages/core-tools/test/`, `docs/guides/updating.md`, `docs/guides/extending.md`                               | `packages/core-tools/src/showcase.js`, `packages/core-tools/test/showcase.test.js`                                                                                                                  |
| End-to-end journey        | `e2e/specs/`, `e2e/support/`                                                                                                                 | `e2e/specs/auth.spec.ts`, `e2e/support/app.ts`                                                                                                                                                      |
| Installer behaviour       | `packages/create-app/src/`, `packages/create-app/template.json`                                                                              | `packages/create-app/src/env.js`                                                                                                                                                                    |
| Harness                   | `plugins/dsh/agents/`, `plugins/dsh/skills/`, `plugins/dsh/scripts/`, `plugins/dsh/hooks/hooks.json`, `docs/harness.md`                      | `plugins/dsh/agents/backend-dev.md`, `plugins/dsh/skills/backend/SKILL.md`, `plugins/dsh/scripts/protect-files.mjs`                                                                                 |
| Planning                  | `openspec/changes/<change>/`                                                                                                                 | `openspec/changes/add-dev-harness/`                                                                                                                                                                 |

A change that adds a shared contract (a new registry, a new workspace, a new response type used by both sides) updates this document in the same change. A change to the ownership globs, the metadata or the materialization updates `packages/create-app/template.json`, `packages/core-tools/src/metadata.js`, `packages/create-app/test/conformance.test.js` and `docs/guides/updating.md` together.
