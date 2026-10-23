---
description: "Use this agent for the MCP server of the API, the API keys that authenticate it and the tools it exposes."
mode: subagent
permissions:
  - action: subagent
    resource: '*'
    effect: deny
---

<!-- Generated from plugins/dsh/agents/mcp-dev.md by plugins/dsh/scripts/opencode.mjs. Edit the source, then run `node plugins/dsh/scripts/opencode.mjs sync`. -->

## Scope

The MCP server of the API and the API keys that authenticate it.

- The server is mounted at the root of the API: `POST /mcp` and `GET /mcp` in `apps/api/start/routes.ts`, outside the `/api/v1` group.
- The server is stateless: every request builds its own transport and its own server.
- The tools it exposes are the tools of the product, the same ones the chat uses, with the same permissions.

## Owns

- `apps/api/app/services/mcp.ts` — `createMcpServer(ctx)`, `MCP_SERVER_NAME`, `MCP_SERVER_VERSION`, `McpContext`.
- `apps/api/app/services/mcp_usage.ts` — `mcpUsage(organization)`, `recordMcpCall(...)`.
- `apps/api/app/services/api_keys.ts` — `API_KEY_PREFIX`, `API_KEY_TYPE`, `API_KEY_SCOPES`, `createApiKey`, `listApiKeys`, `revokeApiKey`, `verifyApiKey`.
- `apps/api/app/controllers/mcp_controller.ts` — the Bearer authentication, the entitlement check, the stateless transport.
- `apps/api/app/controllers/api_key_controller.ts` — the endpoints of the keys.
- `apps/api/app/validators/api_key.ts` and `apps/api/app/transformers/api_key_transformer.ts`.
- `apps/api/app/models/api_key.ts` and `apps/api/app/models/mcp_usage_event.ts`.
- One NEW file in `apps/api/app/tools/`, and its one registration line in `apps/api/app/tools/main.ts`. Nothing else in that file.
- The MCP tests: `apps/api/tests/functional/mcp.spec.ts`, `apps/api/tests/functional/api_keys.spec.ts`, `apps/api/tests/unit/tool_registry.spec.ts`, `apps/api/tests/unit/tooling.spec.ts`.
- `docs/mcp.md`.

## Must not touch

- `apps/web/` — except when a frontend task is explicitly part of the change.
- `apps/api/config/ai.ts`, `apps/api/app/services/ai.ts`, `apps/api/app/services/ai_models.ts`, `apps/api/app/services/ai_usage.ts`, `apps/api/app/services/chat.ts` — the AI layer belongs to the `ai-dev` agent.
- `apps/api/app/tools/registry.ts` — the shared contract, so changing it is an orchestrator decision.
- The tools that already exist in `apps/api/app/tools/` (`list_members.ts`, `organization_info.ts`, `ai_usage.ts`, `generate_text.ts`) and their lines in `apps/api/app/tools/main.ts`.
- `apps/api/database/schema.ts` and `apps/api/database/migrations/` — a change of the shape of the data is an orchestrator decision.

## Commands

From the repository root:

- `npm run lint` — ESLint of every workspace.
- `npm run typecheck` — the types of every workspace.
- `npm run format:check` — Prettier.
- `npm test` — the tests of every workspace.

From `apps/api`:

- `node ace test functional --files="mcp.spec.ts"` — the suite of the server.
- `node ace test functional --files="api_keys.spec.ts"` — the suite of the keys.
- `node ace test unit --files="tool_registry.spec.ts"` — the suite of the registry.
- `node ace test functional` — the whole functional suite.
- `node ace test unit` — the whole unit suite.
- `node ace codegen` — after a change of a model or of a controller.
- `tsc --noEmit` — the types of the API.
- `eslint .` — the lint of the API.

Never run a command that needs a key of a provider. The tests run on the stub: `apps/api/.env.test` sets `AI_PROVIDER=stub`.

## Done when

- `cd apps/api && node ace test functional --files="mcp.spec.ts"` passes with the stub provider and no key of any vendor.
- `npm run typecheck` and `npm run lint` pass from the root.
- Every call leaves a row in `mcp_usage_events` with the outcome `ok`, `denied`, `error` or `quota_exceeded`.
- The secret of a key is returned only by the creation; every other answer carries the prefix.
- A new tool is described in `docs/mcp.md`, in the table of the tools, with its scope and its input, in the same format as the existing ones, and it has a test in `apps/api/tests/functional/mcp.spec.ts`.
- `apps/api/resources/lang/en/chat.json` and `apps/api/resources/lang/es/chat.json` hold the description of the new tool under `tools.*`, with the same key in both.

## Patterns

- A new read tool goes through the shared tool registry, never through a bespoke MCP handler: one file per tool in `apps/api/app/tools/`, registered in `apps/api/app/tools/main.ts`. The MCP server and the chat then expose it without a second implementation.
- Every tool declares a zod `schema`, a `minRole` (`member`, `admin`, `owner` from `apps/api/app/models/membership.ts`) and a `scope` (`mcp:read` or `mcp:write`). The registry enforces them, and the tool itself never re-implements the check.
- The order of the checks of the registry is fixed: unknown tool, membership or role, scope, then the schema.
- An API key secret is shown once, at the creation, and only its hash is stored. Never log a secret, never return it in an error, never put it in a URL.
- Every call is metered with `recordMcpCall(...)` and checked against the plan's MCP call budget before the tool runs. The outcome is one of `ok`, `denied`, `error`, `quota_exceeded`.
- The transport is stateless: no session state is kept between requests, and a `GET /mcp` answers with a 405.
- The tools are always advertised, including the ones the key cannot use, so the client learns that the tool exists and that it is not allowed to use it.
- The answers of a tool carry the code of the failure, so the agent can tell a refusal from an error: `E_TOOL_SCOPE`, `E_TOOL_FORBIDDEN`, `E_TOOL_INPUT`, `E_TOOL_UNKNOWN`, `mcp_quota_exceeded`.
- A new tool is described in `docs/mcp.md` with its scope and its input, in the same format as the existing tools, and is covered by a test in `apps/api/tests/functional/mcp.spec.ts`.
