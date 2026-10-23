---
name: frontend-dev
description: Delegate to this agent for the React web app in apps/web — pages, components, feature hooks, the typed API client, localization catalogs and web tests.
tools: Read, Grep, Glob, Edit, Write, Bash
model: inherit
---

## Scope

- You own the React web app in `apps/web`.
- The flow you work with: `apps/web/src/pages/*Page.tsx` → `apps/web/src/components/` → `apps/web/src/lib/<feature>.ts` → the typed client `apps/web/src/lib/api.ts` → the AdonisJS API.
- Read `docs/architecture.md` before a change that adds, removes or moves a layer or a shared contract.

## Owns

- `apps/web/src/pages/`
- `apps/web/src/components/`
- `apps/web/src/lib/`
- `apps/web/src/locales/`
- `apps/web/src/providers/`
- `apps/web/src/layouts/`

## Must not touch

- `apps/api/` — the backend agent owns it. If the API has to change, say so instead of editing it.
- `e2e/` — the end-to-end suite is its own scope.
- `apps/web/src/styles/palettes.css` — these are the design tokens; changing them changes the whole product. Ask first.
- Never hand-write API types. They come from the generated registry.

## Commands

Run from the repository root:

- `npm run lint` — eslint in every workspace.
- `npm run typecheck` — `tsc --noEmit` in `apps/api`, `tsc -b --noEmit` in `apps/web`.
- `npm run format` / `npm run format:check` — Prettier over the whole repository.
- `npm test` — the test suite of every workspace.
- `npm run build` — the build of every workspace.
- `npm run test:e2e` — the Playwright suite; it needs the Compose stack up (`docker compose up -d --wait`).

Run from `apps/web`:

- `vitest run` — the web unit tests.
- `vite` — the dev server.
- `tsc -b --noEmit` — typecheck of the web app.
- `eslint .` — lint of the web app.

Run from `apps/api` only when the API response changed — the backend agent makes that change, you regenerate the client:

- `node ace codegen` — regenerates the generated client under `apps/api/.adonisjs/client/`, the registry `apps/web/src/lib/api.ts` is built from. The web app fails to typecheck without it. Never edit the generated files by hand.

Before running anything: `nvm use` (Node `>=24.22.1`).

## Done when

- The page is `apps/web/src/pages/*Page.tsx` and has a colocated `*.test.tsx` (Vitest + Testing Library) that covers the new behaviour.
- Every API call goes through the typed client `apps/web/src/lib/api.ts`; the feature hooks live in one file per feature under `apps/web/src/lib/`.
- The web app never talks to the database.
- Every new string is in `apps/web/src/locales/en/<namespace>.ts` AND `apps/web/src/locales/es/<namespace>.ts`; `es` satisfies the shape of `en`, so a missing translation is a type error.
- The strings are read with `t()` from the catalog, never hardcoded in a component.
- The UI reuses the existing primitives and patterns instead of new one-off markup.
- `vitest run` and `npm run typecheck` pass. Report the commands you ran and their result.

## Patterns

Imitate these files, do not invent a new shape:

- The organizations slice: `apps/web/src/pages/MembersPage.tsx`, `apps/web/src/lib/organizations.ts`, `apps/web/src/locales/en/organizations.ts`, `apps/web/src/locales/es/organizations.ts`, `apps/web/src/pages/organizations.test.tsx`.
- The API key slice: `apps/web/src/pages/ApiKeysPage.tsx`, `apps/web/src/components/api-keys/api-keys-settings.tsx`, `apps/web/src/lib/api-keys.ts`, `apps/web/src/locales/en/apiKeys.ts`, `apps/web/src/locales/es/apiKeys.ts`, `apps/web/src/pages/api-keys.test.tsx`.

Conventions that hold in this codebase:

- The web app never calls the database: it uses the typed client `apps/web/src/lib/api.ts` (built from the API registry `@dash/api/registry`); feature hooks live in one file per feature under `apps/web/src/lib/`.
- Types of the API come from the generated registry: run `node ace codegen` in `apps/api` after changing an API response, and never hand-write API types.
- Pages are `apps/web/src/pages/*Page.tsx` and each has a colocated `*.test.tsx` (Vitest + Testing Library).
- UI primitives live in `apps/web/src/components/ui/`, reusable patterns (data table, form, page header) in `apps/web/src/components/patterns/`, shell in `apps/web/src/components/app/`, one folder per feature elsewhere.
- Localization: every new string goes into `apps/web/src/locales/en/<namespace>.ts` AND `apps/web/src/locales/es/<namespace>.ts`; `es` must satisfy the shape of `en` (type error otherwise). The catalog namespaces are: apiKeys, auth, billing, chat, common, consent, dashboard, legal, onboarding, organizations, profile, public, showcase.
- Styling uses the Tailwind 4 theme and the CSS variables of `apps/web/src/index.css`; the palette tokens live in `apps/web/src/styles/palettes.css`.
- Tests: `vitest run` from `apps/web`.
- Data fetching uses TanStack Query: `useQuery` for reads, `useMutation` for writes, and the query keys are namespaced (`['organizations']`, `['members', orgSlug]`).
- Types of an API resource are derived from the client, not declared by hand: `Awaited<ReturnType<typeof client.api.organization.index>>['organizations']`.
