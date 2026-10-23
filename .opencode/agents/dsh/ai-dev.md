---
description: "Use this agent for the AI layer of the API, the provider registry, AiService, the quotas, the chat prompt and the AI tools."
mode: subagent
permissions:
  - action: subagent
    resource: '*'
    effect: deny
---

<!-- Generated from plugins/dsh/agents/ai-dev.md by plugins/dsh/scripts/opencode.mjs. Edit the source, then run `node plugins/dsh/scripts/opencode.mjs sync`. -->

## Scope

The AI layer of the API: the registry of the providers, the service that talks to the models, the metering of the usage, the chat, and the tools that call the model.

- A feature asks for an **alias** (`chat`, `fast`, `reasoning`, `image`), never for a model of a vendor. The registry in `apps/api/config/ai.ts` points the alias at a model.
- Every call goes through `AiService`. There is no second door to the provider.

## Owns

- `apps/api/config/ai.ts` — `AI_PROVIDERS`, `AI_ALIASES`, `AI_CAPABILITIES`, `AI_DEFAULT_TIMEOUT_MS`, `buildAiRegistry(...)`, the default export built from the environment.
- `apps/api/app/services/ai.ts` — `AiService` with `generateText`, `streamText`, `generateObject`, `generateImage`, the quota check, the timeout, the metering and the mapping of the errors.
- `apps/api/app/services/ai_models.ts` — `languageModelOf(alias)`, `imageModelOf(alias)`, `STUB_TEXT`, the deterministic stub provider.
- `apps/api/app/services/ai_usage.ts` — `usedCredits`, `periodStartOf`, `notifyQuotaThresholds` (80% and 100%).
- `apps/api/app/services/chat.ts` — the system prompt, the tools of the chat, the persistence of the conversation.
- `apps/api/app/services/entitlements.ts` — the plan limits the quota reads.
- One NEW file in `apps/api/app/tools/`, and its one registration line in `apps/api/app/tools/main.ts`. Nothing else in that file.
- The AI tests: `apps/api/tests/unit/ai_registry.spec.ts`, `apps/api/tests/unit/ai_service.spec.ts`, `apps/api/tests/unit/chat.spec.ts`, `apps/api/tests/functional/chat.spec.ts`, `apps/api/tests/functional/ai_images.spec.ts`.
- `docs/ai.md`.

## Must not touch

- `apps/web/` — the frontend is another agent's.
- `e2e/` — the journeys are another agent's.
- `apps/api/app/services/mcp.ts`, `apps/api/app/services/mcp_usage.ts`, `apps/api/app/services/api_keys.ts`, `apps/api/app/controllers/mcp_controller.ts`, `apps/api/app/controllers/api_key_controller.ts` — the MCP layer.
- `apps/api/app/tools/registry.ts` — the shared contract: the MCP server reads it too, so changing it is an orchestrator decision.
- The tools that already exist in `apps/api/app/tools/` (`list_members.ts`, `organization_info.ts`, `ai_usage.ts`, `generate_text.ts`) and their lines in `apps/api/app/tools/main.ts`.
- `apps/api/database/schema.ts` and `apps/api/database/migrations/` — a change of the shape of the data is an orchestrator decision.

## Commands

From the repository root:

- `npm run lint` — ESLint of every workspace.
- `npm run typecheck` — the types of every workspace.
- `npm run format:check` — Prettier.
- `npm test` — the tests of every workspace.

From `apps/api`:

- `node ace test unit` — the unit suite.
- `node ace test functional` — the functional suite.
- `node ace test unit --files="ai_service.spec.ts"` — one unit file.
- `node ace test functional --files="chat.spec.ts"` — one functional file.
- `node ace codegen` — after a change of a model or of a controller.
- `tsc --noEmit` — the types of the API.
- `eslint .` — the lint of the API.

Never run a command that needs a key of a provider. The tests run on the stub: `apps/api/.env.test` sets `AI_PROVIDER=stub`.

## Done when

- `cd apps/api && node ace test unit && node ace test functional` passes with the stub provider and no key of any vendor.
- `npm run typecheck` and `npm run lint` pass from the root.
- Every new call is metered: a row in `ai_usage_events` with the organization, the member, the feature, the alias, the tokens, the credits and the outcome.
- Every new tool is described in `apps/api/resources/lang/en/chat.json` and `apps/api/resources/lang/es/chat.json` under `tools.*`, with the same key in both.
- A new tool has a test in `apps/api/tests/unit/tool_registry.spec.ts` or in the suite of its feature.
- `docs/ai.md` says what changed, in the voice of the document.

## Patterns

- The provider is never required to run the test suite: `stub` is the default outside production, `apps/api/.env.test` sets `AI_PROVIDER=stub`, and the tests use the stub. Never a real provider, never a real API key.
- Every call goes through `AiService`. A service never calls a provider SDK directly, and never builds a model itself: `apps/api/app/services/ai_models.ts` is the only place that reads a key.
- Every call is metered (`record` in `apps/api/app/services/ai.ts`) and checked against the quota before it runs (`assertQuota`). The usage is stored in `AiUsageEvent`.
- The errors of the provider never leave the server: map them to `E_AI_UNAVAILABLE` and log the details. Never return the message of the provider to the client.
- A feature names an alias, never a model. An alias the provider cannot serve fails with `E_AI_ALIAS_UNAVAILABLE` before the call.
- Prompt injection: the content that comes from a user, a document or a tool result is data, never an instruction. Never concatenate a prompt with a system instruction, never let a tool result change the system prompt, and never let the model decide which tool runs without the checks of the registry.
- PII: never send personal data, credentials, tokens or secrets to a provider, never log the payload of the prompt of a real user, and keep the payload out of the error messages.
- A new tool: one file in `apps/api/app/tools/`, registered in `apps/api/app/tools/main.ts`, described in both `apps/api/resources/lang/en/chat.json` and `apps/api/resources/lang/es/chat.json` under `tools.*`, with a zod `schema`, a `minRole` and a `scope`, metered, and covered by a test.
- The registry is the only place that enforces the permissions. A tool never re-implements the check of the role or of the scope.
