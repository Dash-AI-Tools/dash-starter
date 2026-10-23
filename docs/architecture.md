---
type: Reference
title: Architecture
description: The map of the repository: workspaces, layers, request flow, persistence, localization, tests and CI.
tags: [architecture, monorepo, api, web, reference]
status: stable
---

# Architecture

The map of this repository: the workspaces, the layers of the API and the web app, the shared AI tool registry, persistence, configuration, localization, tests and CI, plus the commands that build and check each workspace.

Read this before changing anything. If a change adds, removes or moves a workspace, a layer, a module boundary or a shared contract, this document is updated in the same change.

## Workspaces

npm workspaces, Node `>=24.22.1` (`.nvmrc`, `engine-strict` in `.npmrc`).

| Workspace             | Package               | Stack                                                            |
| --------------------- | --------------------- | ---------------------------------------------------------------- |
| `apps/api`            | `@dash/api`           | AdonisJS 7, Lucid (Postgres), VineJS, Japa                       |
| `apps/web`            | `@dash/web`           | React 19, Vite, react-router, Tailwind 4, TanStack Query, Vitest |
| `e2e`                 | `@dash/e2e`           | Playwright                                                       |
| `packages/create-app` | `create-dash-starter` | Node installer (`node:test`)                                     |
| `plugins/dsh`         | `@dash/dsh`           | Claude Code plugin: agents, skills, hook scripts (`node:test`)   |

The root `package.json` fans out to the workspaces:

| Command                | Runs                                                |
| ---------------------- | --------------------------------------------------- |
| `npm run dev`          | `dev` in every workspace that has one               |
| `npm run build`        | `build` in every workspace that has one             |
| `npm run lint`         | `eslint .` per workspace                            |
| `npm run typecheck`    | `tsc --noEmit` (or `tsc -b --noEmit`) per workspace |
| `npm run test`         | `test` in every workspace that has one              |
| `npm run format`       | `prettier --write .` (root, all workspaces)         |
| `npm run format:check` | `prettier --check .` (root, all workspaces)         |
| `npm run test:e2e`     | `playwright test` (`e2e` workspace)                 |
| `prepare`              | `git config core.hooksPath .githooks` on install    |

Per workspace:

| Workspace             | Build                  | Test                               | Lint       | Typecheck         | Format        |
| --------------------- | ---------------------- | ---------------------------------- | ---------- | ----------------- | ------------- |
| `apps/api`            | `node ace build`       | `node ace test`                    | `eslint .` | `tsc --noEmit`    | root Prettier |
| `apps/web`            | `tsc -b && vite build` | `vitest run`                       | `eslint .` | `tsc -b --noEmit` | root Prettier |
| `e2e`                 | —                      | `npm run test:e2e`                 | `eslint .` | `tsc --noEmit`    | root Prettier |
| `packages/create-app` | —                      | `node --test "test/**/*.test.js"`  | `eslint .` | —                 | root Prettier |
| `plugins/dsh`         | —                      | `node --test "scripts/*.test.mjs"` | —          | —                 | root Prettier |

`packages/create-app` has no `typecheck` and no `build`; `e2e` has no `build`; `plugins/dsh` has only `test`. Formatting is a single root Prettier run over the whole repository (`prettier.config.js`), so a workspace without a `format` script is still formatted.

## API: layers and request flow

```
apps/api/start/routes.ts
  → apps/api/app/middleware/*.ts        (auth, verified, org, ...)
  → apps/api/app/controllers/*_controller.ts
  → apps/api/app/validators/*.ts         (VineJS)
  → apps/api/app/services/*.ts           (domain logic)
  → apps/api/app/models/*.ts             (Lucid)
  → apps/api/app/transformers/*_transformer.ts   (response shape)
```

| Layer        | Directory                        | Responsibility                                                                                                          |
| ------------ | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Routes       | `apps/api/start/routes.ts`       | Every route. `/api/v1` group; organization routes under `orgs/:orgSlug` with `middleware.auth()` and `middleware.org()` |
| Middleware   | `apps/api/app/middleware/`       | `auth`, `verified`, `org` (resolves the membership of `orgSlug`), plus locale, container bindings and JSON forcing      |
| Controllers  | `apps/api/app/controllers/`      | HTTP only: validate, authorize, call a service, serialize                                                               |
| Validators   | `apps/api/app/validators/`       | VineJS schemas, one file per resource                                                                                   |
| Services     | `apps/api/app/services/`         | Domain logic, the only layer that touches the database and the AI layer                                                 |
| Models       | `apps/api/app/models/`           | Lucid models extending `apps/api/database/schema.ts`                                                                    |
| Transformers | `apps/api/app/transformers/`     | `serialize.withoutWrapping(...)` shapes returned to the client                                                          |
| Abilities    | `apps/api/app/abilities/main.ts` | Bouncer policies (`user.updateOrganization`, `organization.deleteOrganization`, ...)                                    |
| Mails        | `apps/api/app/mails/`            | One class per transactional mail; templates in `apps/api/resources/views/emails/`                                       |
| Exceptions   | `apps/api/app/exceptions/`       | `errors.ts` (domain errors) and `handler.ts` (HTTP mapping)                                                             |
| Ace commands | `apps/api/commands/`             | `node ace billing:sync`                                                                                                 |

MCP is mounted outside `/api/v1` because MCP clients address the API root: `POST /mcp` and `GET /mcp` in `apps/api/start/routes.ts`.

## AI layer and the shared tool registry

| Piece                    | Path                                                                                              | Role                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Provider registry        | `apps/api/config/ai.ts`                                                                           | `AI_PROVIDERS`, `AI_ALIASES` (`chat`, `fast`, `reasoning`, `image`), `AI_CAPABILITIES`, per-alias pricing, timeouts                       |
| Service                  | `apps/api/app/services/ai.ts`                                                                     | `AiService`: `generateText`, `streamText`, `generateObject`, `generateImage`; quota check, metering, timeouts                             |
| Models and stub          | `apps/api/app/services/ai_models.ts`                                                              | `languageModelOf(alias)`, `imageModelOf(alias)`, the deterministic `stub` provider used by tests                                          |
| Usage                    | `apps/api/app/services/ai_usage.ts`                                                               | `usedCredits`, quota thresholds, usage events                                                                                             |
| Chat                     | `apps/api/app/services/chat.ts`                                                                   | Chat system prompt, tool wiring, conversation persistence                                                                                 |
| Tool registry (contract) | `apps/api/app/tools/registry.ts`                                                                  | `ToolDefinition` (`name`, `descriptionKey`, `schema`, `minRole`, `scope`, `execute`), `ToolRegistry.call` with role and scope enforcement |
| Tool registration        | `apps/api/app/tools/main.ts`                                                                      | `toolRegistry.register(...)` for every tool                                                                                               |
| Tools                    | `apps/api/app/tools/{list_members,organization_info,organization_plan,ai_usage,generate_text}.ts` | One file per tool, shared by chat and MCP                                                                                                 |

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

| Piece         | Path                               | Role                                                                                                                                                                                    |
| ------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pages         | `apps/web/src/pages/*Page.tsx`     | One page per route, with a colocated `*.test.tsx`                                                                                                                                       |
| Layouts       | `apps/web/src/layouts/`            | `AppLayout` (signed in), `PublicLayout` (public site)                                                                                                                                   |
| Components    | `apps/web/src/components/`         | `apps/web/src/components/ui/` (design system), `apps/web/src/components/patterns/` (data table, form, page header), `apps/web/src/components/app/` (shell), plus one folder per feature |
| API client    | `apps/web/src/lib/api.ts`          | Typed client built from the API registry (`@dash/api/registry`); CSRF and locale headers, `urlFor`                                                                                      |
| Feature hooks | `apps/web/src/lib/*.ts`            | One file per feature (`organizations.ts`, `api-keys.ts`, `billing.ts`, `chat.ts`, `onboarding.ts`)                                                                                      |
| Localization  | `apps/web/src/locales/{en,es}/`    | 14 catalogs per locale; `es` must satisfy the shape of `en`                                                                                                                             |
| Providers     | `apps/web/src/providers/`          | Theme, palette, consent, app providers                                                                                                                                                  |
| Tokens        | `apps/web/src/styles/palettes.css` | Six palettes (`line`, `ink`, `ocean`, `forest`, `plum`, `ember`) in light and dark                                                                                                      |
| Global styles | `apps/web/src/index.css`           | Tailwind 4 theme, fonts, base layer                                                                                                                                                     |

The web app never talks to the database: it calls the API through `apps/web/src/lib/api.ts`, whose types are generated from the AdonisJS registry (`node ace codegen` in `apps/api`).

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

| Suite          | Path                         | Needs a database | Command                            |
| -------------- | ---------------------------- | ---------------- | ---------------------------------- |
| API unit       | `apps/api/tests/unit/`       | no               | `node ace test unit`               |
| API functional | `apps/api/tests/functional/` | yes              | `node ace test functional`         |
| Web unit       | `apps/web/src/**/*.test.tsx` | no               | `vitest run`                       |
| Installer      | `packages/create-app/test/`  | no               | `node --test "test/**/*.test.js"`  |
| Harness        | `plugins/dsh/scripts/`       | no               | `node --test "scripts/*.test.mjs"` |
| End to end     | `e2e/specs/`                 | yes (full stack) | `npm run test:e2e`                 |

- API tests use Japa (`apps/api/tests/bootstrap.ts`); functional tests use the `Browser` helper in `apps/api/tests/helpers/browser.ts` to keep a signed-in session.
- The end-to-end suite needs the Compose stack: `docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d --wait`.

## CI

`.github/workflows/ci.yml` runs on pull requests and on pushes to `main`:

| Job              | What it does                                                                    |
| ---------------- | ------------------------------------------------------------------------------- |
| `lint-typecheck` | `node ace codegen`, `npm run format:check`, `npm run lint`, `npm run typecheck` |
| `test`           | Postgres service, `node ace migration:run --force`, `npm test`                  |
| `build`          | `npm run build`                                                                 |
| `e2e`            | Compose stack, `node ace db:seed`, `npm run test:e2e`                           |
| `installer`      | Generates a project with `create-dash-starter` and checks it, harness included  |

Before CI, `.githooks/pre-commit` checks the staged files of every commit (format, lint, typecheck, fast tests, staged secrets). `docs/harness.md` describes it.

## Where each kind of change lives

| Change                  | Files                                                                                                                                       | Imitate                                                                                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API endpoint            | `apps/api/start/routes.ts`, `apps/api/app/controllers/`, `apps/api/app/validators/`, `apps/api/app/services/`, `apps/api/app/transformers/` | `apps/api/app/controllers/organization_controller.ts`, `apps/api/app/validators/organization.ts`, `apps/api/app/services/organizations.ts`, `apps/api/app/transformers/organization_transformer.ts` |
| Database change         | `apps/api/database/migrations/`, `apps/api/database/schema.ts` (regenerated)                                                                | the newest migration in `apps/api/database/migrations/`                                                                                                                                             |
| Authorization rule      | `apps/api/app/abilities/main.ts`                                                                                                            | `updateOrganization` in `apps/api/app/abilities/main.ts`                                                                                                                                            |
| API key or MCP feature  | `apps/api/app/services/api_keys.ts`, `apps/api/app/services/mcp.ts`, `docs/mcp.md`                                                          | `apps/api/app/services/api_keys.ts`                                                                                                                                                                 |
| AI tool or provider     | `apps/api/app/tools/<tool>.ts`, `apps/api/app/tools/main.ts`, `apps/api/config/ai.ts`, `docs/ai.md`                                         | `apps/api/app/tools/list_members.ts`                                                                                                                                                                |
| AI behaviour            | `apps/api/app/services/ai.ts`, `apps/api/app/services/ai_usage.ts`                                                                          | `generateText` in `apps/api/app/services/ai.ts`                                                                                                                                                     |
| Web page                | `apps/web/src/pages/`, `apps/web/src/lib/`, `apps/web/src/locales/{en,es}/`                                                                 | `apps/web/src/pages/MembersPage.tsx`, `apps/web/src/lib/organizations.ts`, `apps/web/src/locales/en/organizations.ts`                                                                               |
| Web component           | `apps/web/src/components/`                                                                                                                  | `apps/web/src/components/api-keys/api-keys-settings.tsx`                                                                                                                                            |
| Design token or palette | `apps/web/src/styles/palettes.css`                                                                                                          | the `line` palette block                                                                                                                                                                            |
| End-to-end journey      | `e2e/specs/`, `e2e/support/`                                                                                                                | `e2e/specs/auth.spec.ts`, `e2e/support/app.ts`                                                                                                                                                      |
| Installer behaviour     | `packages/create-app/src/`, `packages/create-app/template.json`                                                                             | `packages/create-app/src/env.js`                                                                                                                                                                    |
| Harness                 | `plugins/dsh/agents/`, `plugins/dsh/skills/`, `plugins/dsh/scripts/`, `plugins/dsh/hooks/hooks.json`, `docs/harness.md`                     | `plugins/dsh/agents/backend-dev.md`, `plugins/dsh/skills/backend/SKILL.md`, `plugins/dsh/scripts/protect-files.mjs`                                                                                 |
| Planning                | `openspec/changes/<change>/`                                                                                                                | `openspec/changes/add-dev-harness/`                                                                                                                                                                 |

A change that adds a shared contract (a new registry, a new workspace, a new response type used by both sides) updates this document in the same change.
