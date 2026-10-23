# Dash Starter

A monorepo with an AdonisJS API (`apps/api`), a React web app (`apps/web`), an end-to-end suite (`e2e`) and the `create-dash-starter` installer (`packages/create-app`).

## Requirements

- Node `>=24.22.1` (`.nvmrc`): run `nvm use` before any install or command, otherwise the API test suite fails on an unsupported Node internals call.
- Docker for the local stack: `docker compose up -d --wait`.

## Where things are documented

| Document                    | What it holds                                                                                                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/architecture.md`      | Workspaces, layers, request flow, the shared tool registry, persistence, config, localization, tests, CI, and the file to imitate for each kind of change. Read it before coding. |
| `docs/harness.md`           | The `dsh` plugin: agents, commands, guardrail hooks, the git pre-commit gate, parallel features, OpenCode and how to adapt them.                                                  |
| `docs/ai.md`, `docs/mcp.md` | The AI layer and the MCP server.                                                                                                                                                  |
| `openspec/`                 | The planning of every change.                                                                                                                                                     |

## Working with OpenSpec

Every feature is a change under `openspec/changes/<change-id>/` with a proposal, spec deltas, a design and tasks.

- Propose: `openspec new change <change-id>`, then write the artifacts and validate them with `openspec validate <change-id> --strict`.
- Implement: work through the tasks of the change and check them off; each task carries a layer tag (`[backend]`, `[frontend]`, `[ai]`, `[mcp]`, `[docs]`, `[e2e]`) that says who does it.
- Verify: every `#### Scenario` of the deltas is covered by a test.
- Archive: `openspec archive <change-id>` syncs the deltas into `openspec/specs/`.

A change that adds, removes or moves a workspace, a layer or a shared contract updates `docs/architecture.md` in the same change.

## Conventions

- Imitate the existing code: the file to imitate for each kind of change is in `docs/architecture.md`.
- Every user-facing string exists in English and Spanish (`apps/web/src/locales/{en,es}/`, `apps/api/resources/lang/{en,es}/`).
- No new dependency without a reason; the harness scripts are plain Node.
- The format, lint, typecheck and test commands are in `docs/architecture.md`.
