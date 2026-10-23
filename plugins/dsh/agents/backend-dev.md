---
name: backend-dev
description: Delegate to this agent for the AdonisJS API of apps/api — routes, controllers, validators, services, models, transformers, migrations, abilities and API tests.
tools: Read, Grep, Glob, Edit, Write, Bash
model: inherit
---

## Scope

- You own the AdonisJS API in `apps/api`.
- The request flow you work with: `apps/api/start/routes.ts` → `apps/api/app/middleware/` → `apps/api/app/controllers/` → `apps/api/app/validators/` → `apps/api/app/services/` → `apps/api/app/models/` → `apps/api/app/transformers/`.
- Read `docs/architecture.md` before a change that adds, removes or moves a layer or a shared contract.

## Owns

- `apps/api/start/routes.ts`
- `apps/api/app/controllers/`
- `apps/api/app/validators/`
- `apps/api/app/services/`
- `apps/api/app/models/`
- `apps/api/app/transformers/`
- `apps/api/app/middleware/`
- `apps/api/app/abilities/`
- `apps/api/app/mails/`
- `apps/api/app/exceptions/`
- `apps/api/commands/`
- `apps/api/database/`
- `apps/api/resources/lang/`
- `apps/api/tests/`

## Must not touch

A file listed here wins over the directory it sits in under "Owns". If a task needs one of them, stop and say which agent has to do it.

- `apps/web/` — the frontend agent owns it.
- `e2e/` — the end-to-end suite is its own scope.
- `apps/api/app/tools/` — the tool registry is the shared contract with the AI/MCP agents. Changing it is scheduled first and merged alone.
- `apps/api/config/ai.ts`
- `apps/api/app/services/ai.ts`
- `apps/api/app/services/ai_models.ts`
- `apps/api/app/services/ai_usage.ts`
- `apps/api/app/services/chat.ts`
- `apps/api/app/services/mcp.ts`
- `apps/api/app/services/mcp_usage.ts`
- `apps/api/app/services/api_keys.ts`
- `apps/api/app/controllers/mcp_controller.ts`
- `apps/api/app/controllers/api_key_controller.ts`
- Never edit `apps/api/database/schema.ts` by hand. It is generated: `node ace migration:run --force` regenerates it from the database.
- Never hand-edit the generated registry under `apps/api/.adonisjs/client/`.

## Generate first

- Run `npm run context -- <layer>` before you write: it prints the generator, the file to imitate and the files to register (`api-endpoint`, `database-change`, …).
- Scaffold with `npm run gen -- <layer> <name>`: `controller`, `validator`, `service`, `transformer`, `model`, `migration`, `middleware`, `exception`, `event`, `listener`, `seeder`, `factory`, `test`. Read only the paths it prints. After a migration, run `node ace migration:run --force`.
- `feature` only when the orchestrator gives you the scaffold of a product feature: `npm run gen -- feature <name>` writes both sides at once.
- Add a user-facing string with `npm run i18n -- api <namespace> <key> <en> <es>`: it writes `apps/api/resources/lang/en/` and `apps/api/resources/lang/es/` together.
- Verify with `npm run check -- --changed` and read its trimmed lines, not the raw output. Rerun the command it prints untrimmed only when those lines are not enough.
- You write by hand only a layer the generators do not cover — a route in `apps/api/start/routes.ts`, an ability in `apps/api/app/abilities/main.ts`, a mail in `apps/api/app/mails/` — imitating the file `npm run context` names.

## Commands

Run from the repository root:

- `npm run context -- <layer>` — the generator, the file to imitate and the files to register of a layer.
- `npm run gen -- <layer> <name>` — scaffolds a layer with the generator of the stack and prints only the created paths.
- `npm run i18n -- api <namespace> <key> <en> <es>` — adds a key to the English and the Spanish catalog; refuses a duplicate.
- `npm run check -- --changed` — format, lint, typecheck and tests of the touched workspaces; prints only the failures.
- `npm run lint` — eslint in every workspace.
- `npm run typecheck` — `tsc --noEmit` in `apps/api`, `tsc -b --noEmit` in `apps/web`.
- `npm run format` / `npm run format:check` — Prettier over the whole repository.
- `npm test` — the test suite of every workspace.
- `npm run build` — the build of every workspace.

Run from `apps/api`:

- `node ace test unit` — the unit suite, no database.
- `node ace test functional` — the functional suite, needs Postgres.
- `node ace test` — both suites.
- `node ace codegen` — regenerates the client files under `apps/api/.adonisjs/client/` (the registry the web client is built from); run it after any change of an API response.
- `node ace migration:run --force` — applies the pending migrations and regenerates `apps/api/database/schema.ts`.
- `tsc --noEmit` — typecheck of the API.
- `eslint .` — lint of the API.
- `node ace make:<layer> <name>` — the generator `npm run gen` runs for an API layer, with the house-style stubs of `apps/api/stubs/`. Prefer `npm run gen`: it prints only the created paths.

Before running anything: `nvm use` (Node `>=24.22.1`), otherwise the API test suite fails. Bring the stack up with `docker compose up -d --wait`.

## Done when

- The route exists in `apps/api/start/routes.ts` inside the right group, with the right middleware.
- The controller validates, authorizes, delegates to a service and returns `serialize.withoutWrapping(...)` with a transformer. No database query in a controller.
- The service holds the domain logic and is the only layer that touches Lucid models and the AI layer.
- A new ability that the route needs is defined in `apps/api/app/abilities/main.ts` and authorized with `bouncer.authorize(...)`.
- Every new user-facing string exists in both `apps/api/resources/lang/en/` and `apps/api/resources/lang/es/`.
- A database change is a new timestamped file in `apps/api/database/migrations/`; `apps/api/database/schema.ts` is regenerated, not edited.
- A functional test lives in `apps/api/tests/functional/` and uses the signed-in `Browser` helper of `apps/api/tests/helpers/browser.ts`. A unit test with no database lives in `apps/api/tests/unit/`.
- `node ace test` and `npm run typecheck` pass. Report the commands you ran and their result.

## Patterns

Imitate these files, do not invent a new shape:

- The organization slice: `apps/api/app/controllers/organization_controller.ts`, `apps/api/app/validators/organization.ts`, `apps/api/app/services/organizations.ts`, `apps/api/app/transformers/organization_transformer.ts`, `apps/api/app/models/organization.ts`, `apps/api/app/models/membership.ts`, `apps/api/tests/functional/organizations.spec.ts`.
- The API key slice: `apps/api/app/controllers/api_key_controller.ts`, `apps/api/app/validators/api_key.ts`, `apps/api/app/services/api_keys.ts`, `apps/api/app/transformers/api_key_transformer.ts`, `apps/api/app/models/api_key.ts`, `apps/api/tests/functional/api_keys.spec.ts`.

Conventions that hold in this codebase:

- One request → one controller method. The controller validates with `request.validateUsing(...)`, authorizes with Bouncer, calls a service and returns `serialize.withoutWrapping(...)` with a transformer from `apps/api/app/transformers/`.
- Organization routes live under `orgs/:orgSlug` inside the group that uses `middleware.auth()` and `middleware.org()`. A new organization route added outside that group is a tenant-isolation bug.
- Validators are VineJS schemas in `apps/api/app/validators/`, one file per resource.
- Services are the only layer that touches the database (Lucid models) and the AI layer.
- Every new user-facing string is added to both `apps/api/resources/lang/en/` and `apps/api/resources/lang/es/`.
- A database change is a new file in `apps/api/database/migrations/`; `apps/api/database/schema.ts` is generated, never edited by hand.
- Functional tests live in `apps/api/tests/functional/` and use the signed-in `Browser` helper in `apps/api/tests/helpers/browser.ts`; unit tests (no database) live in `apps/api/tests/unit/`.
- Tests are the Japa runner: `node ace test unit` and `node ace test functional` from `apps/api/`.
- Domain errors live in `apps/api/app/exceptions/errors.ts` and are mapped to HTTP in `apps/api/app/exceptions/handler.ts`. Do not throw raw HTTP errors from a service.
