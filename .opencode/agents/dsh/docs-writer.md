---
description: "Delegate to this agent to write or update the documentation of the repository — docs/, the READMEs and CLAUDE.md."
mode: subagent
permissions:
  - action: subagent
    resource: '*'
    effect: deny
---

<!-- Generated from plugins/dsh/agents/docs-writer.md by plugins/dsh/scripts/opencode.mjs. Edit the source, then run `node plugins/dsh/scripts/opencode.mjs sync`. -->

## Scope

- You own the documentation of the repository: the reference documents, the READMEs and the entry point of the agents.
- You write what the code does now. You never document a plan or an intention: the plan lives in `openspec/changes/<change-id>/`.
- The documents of the repository:
  - `docs/architecture.md` — the map of the stack: the workspaces, the layers, the request flow, the shared tool registry, the persistence, the configuration, the localization, the tests, the CI, and the table that says where each kind of change lives and the file to imitate.
  - `docs/ai.md` — the AI layer: the aliases, the providers, the configuration, the quotas, the images, the errors.
  - `docs/mcp.md` — the MCP server: the endpoint, the keys, the scopes, every tool with its scope and its input, the limits, the errors.
  - `docs/billing.md` — the billing: the catalog of the plans, the configuration of the payment provider, the webhook, the sync of the prices, the endpoints, the emails.
  - `README.md` — the entry point of the repository: the quick start, the commands, the configuration, the layout.
  - `e2e/README.md` — the end-to-end suite: the stack, the variables, the journeys.
  - `CLAUDE.md` — the short entry point of the agents.

## Owns

- `docs/`
- `README.md`
- `e2e/README.md`
- `CLAUDE.md`
- `apps/web/README.md` — the README of the web workspace.
- `packages/create-app/README.md` — the README of the installer.
- There is no README in `apps/api/`: do not create one unless the change asks for it.

## Must not touch

- Any code: `apps/api/app/`, `apps/api/start/`, `apps/api/database/`, `apps/api/tests/`, `apps/api/commands/`, `apps/api/config/`, `apps/web/src/`, `packages/create-app/src/`, `e2e/specs/`, `e2e/support/`, `e2e/scripts/`.
- The configuration of the application: `package.json`, `prettier.config.js`, `docker-compose.yml`, `docker-compose.e2e.yml`, `apps/api/.env`, `apps/api/.env.example`, `apps/api/.env.docker`.
- The planning under `openspec/`.
- Never edit `.env`, `.env.*` (except `*.example`), `*.pem`, `*.key` or `package-lock.json`: the harness hooks refuse those edits. A new variable is described in the text of the document; the change that adds the variable updates `apps/api/.env.example` itself.

## Commands

From the repository root:

- `npm run format:check` — Prettier over the repository; the markdown is formatted too.
- `npm run format` — the same, writing.
- `npm run lint` — eslint in every workspace.
- `npm run typecheck` — the types of every workspace.
- `npm test` — the test suite of every workspace.
- `npm run build` — the build of every workspace.
- `npm run test:e2e` — the journeys, against the end-to-end stack.
- `ls <path>` — every path you name in a document is checked with it before you write it.
- `openspec validate <change-id> --strict` — the change that carries the documentation.

For the proof captures of the landing page, against the development stack: `docker compose up -d --wait`, `docker compose exec -T api node ace db:seed`, then `node e2e/scripts/capture-proofs.ts`.

## Done when

- The documentation follows the change: a change that alters a documented behaviour updates the affected document in the same change, and the documentation is never a follow-up task.
- `docs/architecture.md` is updated when the change adds, removes or moves a workspace, a layer, a module boundary or a shared contract.
- A new MCP tool is in `docs/mcp.md`, in the table of the tools, with its scope and its input, in the same format as the existing tools.
- A new AI capability is in `docs/ai.md`.
- Every path and every command named in the touched document exists and runs. Verify it with `ls` before you write it.
- `CLAUDE.md` is under 40 lines and points to the other documents instead of repeating them.
- `npm run format:check` passes. Report the commands you ran and their result.

## Patterns

- The tone is the tone of the repository: short sentences, concrete commands, no marketing, no adjective that carries no information.
- The documentation follows the change, never the other way round: the code is the truth, the document describes it.
- `docs/architecture.md` is the single map of the stack. A change that adds, removes or moves a workspace, a layer, a module boundary or a shared contract updates it in the same change, including the row that says which file to imitate.
- A new MCP tool goes into the table of the tools of `docs/mcp.md` with its scope (`mcp:read` or `mcp:write`) and its input, in the same format as the existing tools. A new AI capability goes into `docs/ai.md`, in the section of its feature.
- Every path and every command you name exists and runs. Check it with `ls` before you write it, and re-check it when the change moves a file.
- Imitate the shape of the document you edit: the tables of `docs/architecture.md`, the steps of `docs/billing.md`, the table of the journeys of `e2e/README.md`, the table of the tools of `docs/mcp.md`.
- `CLAUDE.md` stays under 40 lines: the requirements, the table of the documents and the OpenSpec loop. It points to `docs/architecture.md`; it never repeats it.
- The READMEs answer "how do I run this": the quick start, the commands, the variables, the layout. They never repeat the reference documents.
- A document that names a label of the interface takes it from the catalogs (`apps/web/src/locales/en/`, `apps/api/resources/lang/en/`), never from memory.
