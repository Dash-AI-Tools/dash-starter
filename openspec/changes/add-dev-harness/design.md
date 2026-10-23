# Design

## Context

See proposal.md for motivation. What the discovery found (and what the harness must encode):

- **Workspaces** (npm workspaces, Node `>=24.22.1` via `.nvmrc` + `engine-strict`): `apps/api` (AdonisJS 7, Lucid/Postgres, VineJS, Japa), `apps/web` (React 19, Vite, react-router, Tailwind 4, shadcn on Base UI, TanStack Query, Vitest), `e2e` (Playwright), `packages/create-app` (installer, `node:test`). Root scripts fan out: `npm run lint|typecheck|test|build`, `npm run format|format:check` (Prettier), `npm run test:e2e`.
- **API layering**: `start/routes.ts` (all routes, `/api/v1`, org routes under `orgs/:orgSlug` + `org` middleware) → `app/controllers/*_controller.ts` → `app/validators/*.ts` (Vine) → `app/services/*.ts` (domain) → `app/models/*.ts` (Lucid) → `app/transformers/*_transformer.ts` (response shape). Abilities in `app/abilities/main.ts`, mails in `app/mails/`, catalogs in `resources/lang/{en,es}`, migrations in `database/migrations` (17), seeders in `database/seeders`, ace commands in `commands/`. Tests: `tests/unit/*.spec.ts`, `tests/functional/*.spec.ts` (DB-backed), helpers in `tests/helpers/`.
- **AI layer**: `config/ai.ts` (provider registry, aliases, stub), `app/services/ai.ts` (`AiService`: quota, metering, timeouts), `ai_models.ts`, `ai_usage.ts`, `chat.ts`. **Tools**: `app/tools/registry.ts` (`ToolDefinition`, role + scope checks), `app/tools/main.ts`, one file per tool (`list_members.ts`, `organization_info.ts`, `ai_usage.ts`, `generate_text.ts`) — shared by chat and MCP.
- **MCP**: `app/controllers/mcp_controller.ts`, `app/services/mcp.ts`, `mcp_usage.ts`, `api_keys.ts`; docs in `docs/mcp.md`.
- **Web**: `src/pages/*Page.tsx` (+ colocated `*.test.tsx`), `src/components/{ui,patterns,app,<feature>}`, `src/lib/*.ts` (typed client `api.ts`, feature hooks), `src/locales/{en,es}/*.ts` (`es satisfies` en shape), `src/styles/palettes.css` + `index.css` tokens, `src/providers/`.
- **Stack**: `docker-compose.yml` (project `dash-starter`, ports 5433/8025/1025/3333/5173), `docker-compose.e2e.yml` (project `dash-e2e`, 5434/8026/1026/3334/5174), `docker-compose.prod.yml`. Env: root `.env`, `apps/api/.env`, `apps/api/.env.docker` (tracked, dev container env).
- **CI**: `.github/workflows/ci.yml` jobs `lint-typecheck`, `test`, `build`, `e2e`, `installer`.
- **Planning**: OpenSpec initialized (`openspec/specs/` holds 20 capabilities, archive in `openspec/changes/archive/`).
- **Claude Code state today**: `.claude/settings.local.json` (personal), `.claude/worktrees/` (not gitignored), no `CLAUDE.md`, no project agents/skills. The installer excludes `.claude/**`.
- No semgrep/gitleaks installed; `npm audit` is available.

## Goals / Non-Goals

**Goals:**
- Every instruction in the harness names real paths and commands from the list above, so agents imitate existing code instead of inventing structure.
- Thin, stack-agnostic orchestration (feature flow, OpenSpec phases, worktrees, review) with stack-specific knowledge concentrated in `docs/architecture.md` and each agent's "owns/commands" block, so a stack change edits a few blocks, not the whole harness.
- Zero new dependencies: hooks and scripts are plain Node (already required).

**Non-Goals:**
- Installing semgrep, gitleaks or other scanners (separate, asked decision).
- A harness for agents other than Claude Code and OpenCode (D10).
- Automatic merging to `main` or pushing without the developer.

## Decisions

### D1. Delivered as a project-local plugin `dsh`
The `/dsh:` namespace the developer asked for is the plugin namespace, so the harness is a plugin at `plugins/dsh/` (`.claude-plugin/plugin.json` with `name: "dsh"`, `agents/`, `skills/`, `hooks/hooks.json`, `scripts/`). A repo marketplace at `.claude-plugin/marketplace.json` (name `dash-starter`) lists it with source `./plugins/dsh`; `.claude/settings.json` declares the marketplace in `extraKnownMarketplaces` (directory source) and enables `dsh@dash-starter`. Commands become `/dsh:<skill>`, agents `dsh:<agent>`.
Two facts are not confirmed by the docs and are settled by a spike first (task 1): a relative directory marketplace in `extraKnownMarketplaces`, and spawning plugin agents by `dsh:<agent>`. Fallbacks: if the relative path fails, `docs/harness.md` gives the one-time `claude plugin marketplace add ./` + `claude plugin install dsh@dash-starter --scope project`; if namespaced spawning fails, skills instruct spawning by the agent's bare name and the spike records the working form.
*Alternatives:* plain `.claude/agents` + `.claude/skills` (no `dsh:` namespace — rejected by the developer's naming choice); a user-level plugin (would not travel with the repo).

### D2. Agents: one template, repo-specific blocks
Every `plugins/dsh/agents/<name>.md` has frontmatter (`name`, `description` stating when to use it, `tools`, `model: inherit`) and the same five sections: **Scope**, **Owns**, **Must not touch**, **Commands**, **Done when**, plus a short **Patterns** list pointing at the files to imitate. Ownership:

| Agent | Owns | Must not touch |
|---|---|---|
| backend-dev | `apps/api/{start/routes.ts,app/controllers,app/validators,app/services,app/models,app/transformers,app/middleware,app/abilities,app/mails,app/exceptions,commands,database,resources/lang,tests}` | `apps/web`, `e2e`, `app/tools`, `config/ai.ts`, AI/MCP services |
| frontend-dev | `apps/web/src/**` (pages, components, lib, locales, providers) | `apps/api`, `e2e`, `src/styles/palettes.css` tokens without approval |
| ai-dev | `apps/api/config/ai.ts`, `app/services/{ai,ai_models,ai_usage,chat}.ts`, `app/tools/<new tool>.ts`, AI tests, `docs/ai.md` | `apps/web`, MCP transport/keys, migrations unless tasked |
| mcp-dev | `app/services/{mcp,mcp_usage,api_keys}.ts`, `app/controllers/{mcp,api_key}_controller.ts`, `app/tools/<new tool>.ts`, MCP tests, `docs/mcp.md` | `apps/web` (except via frontend task), AI provider config |
| docs-writer | `docs/**`, `README.md`, `apps/*/README.md`, `e2e/README.md`, `CLAUDE.md` | any code |
| e2e-tester | `e2e/specs`, `e2e/support` | app code (reports bugs instead) |
| security-reviewer | nothing (read-only tools + `npm audit`) | every file |
| feature-orchestrator | the change's `tasks.md` checkboxes and artifacts (with approval) | layer code (delegates it) |

`app/tools/registry.ts` and `app/tools/main.ts` are a shared contract: ai-dev and mcp-dev add tool files and register them in `main.ts`; changing `registry.ts` itself is a contract change the orchestrator schedules first.

### D3. Commands as plugin skills
`plugins/dsh/skills/<name>/SKILL.md` with `disable-model-invocation: true` (explicit commands only) and `argument-hint`. `feature`, `backend`, `frontend`, `mcp-capability`, `ai-capability`, `parallel-features`, `review`, `docs`. `feature` runs the OpenSpec loop (D5) and spawns `dsh:feature-orchestrator`; scoped skills spawn one specialist with the change id and the tasks of its layer; `review` and `docs` are runbooks executed in the main session plus `dsh:security-reviewer` / `dsh:docs-writer`.

### D4. Hooks as dependency-free Node scripts
`plugins/dsh/hooks/hooks.json` wires three scripts in `plugins/dsh/scripts/` (Node ESM, reading the hook JSON on stdin):
- `protect-files.mjs` — PreToolUse on `Edit|Write|MultiEdit|NotebookEdit` (`tool_input.file_path`) and `Bash` (commands that write those files: redirection into them, `npm install|i|add|uninstall <pkg>`). Blocks `.env`, `.env.*` except `*.example`, `*.pem`, `*.key`, `apps/api/.env.docker`, `package-lock.json`, with exit 2 and a reason. Allowance: a developer-created file `.claude/dsh-allow` listing `env` and/or `lockfile`, created by the developer with `! echo lockfile > .claude/dsh-allow` (a `!` shell command does not go through tool hooks); the allowance file itself is protected from agent edits.
- `format-lint.mjs` — PostToolUse on file edits: `npx prettier --write <file>`; if the file is under `apps/api`, `apps/web`, `e2e` or `packages/create-app`, `npx eslint <file>` from that workspace; lint errors return `decision: "block"` with the output so the agent fixes them.
- `stop-check.mjs` — Stop: skip when `stop_hook_active` or `git status --porcelain` shows no changes; map changed paths to workspaces; run `npm run typecheck -w <ws>` and the fast tests (`apps/web`: `npx vitest related --run <changed files>`; `apps/api`: `node ace test unit` if it runs without the database, otherwise typecheck only — verified in task 5; `packages/create-app`: `npm test -w`); on failure return `decision: "block"` with the trimmed output.
Unit tests for all three live next to them (`*.test.mjs`, `node --test`); `plugins/dsh` becomes an npm workspace with a `test` script so `npm test` runs them.

### D4b. Git pre-commit gate for every committer
Claude Code hooks only see Claude sessions; a commit by a developer or another agent bypasses them. A tracked `.githooks/pre-commit` (POSIX `sh`, calling Node) covers every committer:
- Enabled by a root `"prepare": "git config core.hooksPath .githooks || true"` script, so `npm install` activates it with no new dependency (no husky/lefthook). `|| true` keeps installs working where git or a repository is absent (the Compose containers run `npm ci` without `.git`).
- Checks the staged set (`git diff --cached --name-only --diff-filter=ACMR`): `prettier --check` on staged files, ESLint per owning workspace, typecheck and fast unit tests of the affected workspaces, and refusal of staged secret files (same patterns as `protect-files.mjs`, minus `.example`).
- One implementation: `plugins/dsh/scripts/checks.mjs` exports `affectedWorkspaces(paths)`, `isSecretPath(path)` and `runChecks(workspaces, { files })`; `stop-check.mjs` and `.githooks/pre-commit` both call it, so the commit gate and the stop check cannot drift. It checks the working tree, not a stash of the index — a partially staged file is checked as it is on disk; documented, and acceptable because the gate is a guard, not CI.
- Escape hatch: `git commit --no-verify`; CI remains the authority.
- Installer: `prepare` runs during the installer's `npm install`, before `git init`, so it sets nothing there; the installer runs `git config core.hooksPath .githooks` right after `initRepository`.
*Alternatives:* husky/lefthook + lint-staged (new dependencies; the stash-based staged checking is nicer but not needed); Claude-only `git commit` interception via a PreToolUse Bash matcher (misses humans and other agents).

### D5. OpenSpec loop inside `/dsh:feature`
1. Find `openspec/changes/<name>`; if missing, propose it (`/opsx:propose` flow), with tasks tagged `[backend]`, `[frontend]`, `[ai]`, `[mcp]`, `[docs]`, `[e2e]`, then `openspec validate <name> --strict`, then stop for review.
2. Apply: the orchestrator groups tasks by tag, runs independent specialists in parallel where their owned paths do not overlap, sequential otherwise (contracts → backend → frontend/ai/mcp → e2e → docs); each specialist checks off its tasks only after its task's verification passes.
3. Verify: `/dsh:review`, including scenario coverage — the orchestrator lists every `#### Scenario` of the change's deltas and the test that covers it (like `verification.md` from the bootstrap change), and fails on gaps.
4. Archive: offer `/opsx:archive <name>` (sync specs), then `/dsh:docs`.

### D6. Side-by-side stacks
`docker-compose.yml`: `name: ${COMPOSE_PROJECT_NAME:-dash-starter}`, ports `${DB_HOST_PORT:-5433}:5432`, `${MAILPIT_HOST_PORT:-8025}:8025`, `${SMTP_HOST_PORT:-1025}:1025`, `${API_HOST_PORT:-3333}:3333`, `${WEB_HOST_PORT:-5173}:5173`; `docker-compose.e2e.yml` the same with `E2E_*` variables (defaults 5434/8026/1026/3334/5174, name `dash-e2e`). URLs that embed ports (`E2E_WEB_URL`, `E2E_MAILPIT_URL`, API `APP_URL`/`WEB_URL` overrides) derive from the same variables. `plugins/dsh/scripts/worktree.mjs <change-id> <slot>` creates `.claude/worktrees/<change-id>` on branch `feat/<change-id>`, copies the developer's `.env` files from the main checkout (a sanctioned script, not an agent file edit), and appends the slot's project names and ports (slot n → base port + 10·n) to the worktree's root `.env`; `remove` tears it down. `.claude/worktrees/` is gitignored.
*Alternative:* serialized E2E on one shared stack (rejected by the developer).

### D7. Parallel features
`/dsh:parallel-features <ids...>`: (1) overlap analysis — union of paths named in each change's tasks/design, plus contract classes (routes/transformers ↔ `apps/web/src/lib` types, migrations, `app/tools/registry.ts`/`main.ts`, `resources/lang` + `src/locales`, tokens) — reported as a table with conflicts; (2) a contracts change or commit merged first if needed; (3) `worktree.mjs` per change, one `dsh:feature-orchestrator` per worktree; (4) status table (tasks x/y, blockers, questions) on request and at each merge; (5) merge order: contracts, then features by dependency; each merge = rebase on updated base in its worktree → resolve → `/dsh:review` → fast-forward merge → next. Locale catalogs and route files are the expected conflict hot spots; the procedure resolves them by keeping both sides' keys/routes and rerunning typecheck.

### D8. Installer ships the harness
`template.json` `exclude` drops `.claude/**` and adds `.claude/settings.local.json`, `.claude/worktrees/**`, `.claude/.headroom*`, `.claude/dsh-allow`; plugin, marketplace, settings, `CLAUDE.md` and the two docs are copied and rebranded by the existing token replacement (the marketplace name and the `enabledPlugins` key change together; the plugin name `dsh` is not a template token and stays). Installer tests assert presence, absence and no leftover placeholders.

### D9. Dry run as its own change
After the harness lands, `/dsh:feature real-dashboard-metrics` proposes a separate change (API endpoint for the dashboard summary of the organization, the dashboard home consuming it instead of made-up numbers, unit/functional/e2e tests). Findings that need harness edits are fixed in this change before archive; the report lists what worked and what was adjusted.

### D10. OpenCode from the same files
OpenCode is supported from the Claude Code plugin, which stays the only source. What OpenCode V2 (2.1.3, checked against the binary and a real run; the V2 docs are at `opencode.ai/v2/docs`, `opencode.ai/docs` is V1) reads natively, and what the harness generates for it:

| Piece | OpenCode V2 | The harness |
|---|---|---|
| Rules | `AGENTS.md` only: `CLAUDE.md` is no longer a fallback in V2 | root `opencode.json` with `instructions: ["CLAUDE.md"]`, so there is no `AGENTS.md` to keep in step |
| Agents | `.opencode/agents/**.md` (a subdirectory is a namespace: `dsh/backend-dev`), frontmatter `description`, `mode`, `model`, `permissions` (ordered `{action, resource, effect}`); `.claude/agents` and plugin agents are not read | generated into `.opencode/agents/dsh/`: `mode: subagent`, a `deny` rule for each Claude Code tool the agent lacks (`Edit`/`Write` → `edit`, `Bash` → `shell`, `Agent` → `subagent`), the body as the prompt |
| Commands | `.opencode/commands/**.md` (`/dsh/feature`), frontmatter `description`, `agent`, `model`, `subagent`, `$ARGUMENTS`; `.claude/commands` is not read | the skills generated into `.opencode/commands/dsh/`, the argument hint in the description |
| Skills | `.opencode/skills`, `.claude/skills` and `.agents/skills`, never the skills of a Claude Code plugin | none: the skills of the plugin are explicit commands, so they become commands |
| Guardrails | a plugin in `.opencode/plugins/` exporting `{ id, setup(ctx) }`; `ctx.tool.hook("execute.before")` refuses a call by throwing, and the agent reads the message; `ctx.tool.hook("execute.after")` can add to the result; `ctx.event.subscribe()` sees `session.execution.succeeded` when the agent stops (V2 has no `session.idle`); `ctx.session.prompt()` resumes a session. V1 plugins do not load in V2 | `.opencode/plugins/dsh.js` loads `plugins/dsh/scripts/opencode-plugin.mjs`, which calls the exported functions of the three hook scripts |

- `plugins/dsh/scripts/opencode.mjs sync` writes the agents, the commands and the plugin module; `check` fails on a stale, missing or left over file, and a test of the plugin suite runs it, so an agent edited without `sync` fails `npm test`. The prompts are rewritten on the way (`dsh:<name>` → `dsh/<name>`, the Task tool → the subagent tool, the paths of the plugin's skills and agents → the generated ones).
- The plugin keeps the semantics of the Claude Code hooks: the refusal and its message come from `protect-files.mjs` with the same `.claude/dsh-allow`, and a patch counts by every file it adds, updates, deletes or moves to; the format and lint output of `format-lint.mjs` is added to the result of the edit; on a stop, a top-level session that ran a tool is checked with `stop-check.mjs`, and a failure resumes it once with the same message, as `stop_hook_active` lets a Claude Code session stop the second time. A subagent is not checked: its parent is.
- `opencode run` exits when the execution ends, so the stop check reports in the TUI and on a long-lived server, not in a one-shot run.
- Git tracks `.opencode/agents/dsh/`, `.opencode/commands/dsh/` and `.opencode/plugins/dsh.js`; the rest of `.opencode/` (personal commands and skills, plugin state, session logs) stays ignored. The installer ships the same files through `!` globs in `exclude`, read the same way by the core update, and the CI `installer` job runs `check` in the generated project: the token replacement rewrites the sources and the generated files alike.
*Alternatives:* hand-written OpenCode prompts (two copies that drift); an `AGENTS.md` that points at `CLAUDE.md` (one more file, and a pointer the model may not follow); `.claude/skills` for the commands (OpenCode would read them, but Claude Code would then list each command twice, once bare and once as `/dsh:`).

## Risks / Trade-offs

- [Plugin marketplace relative path or namespaced agent spawning does not work as assumed] → Spike first (task 1) with the documented fallbacks in D1.
- [Stop hook slows every session end] → Only touched workspaces, only fast suites, skipped when nothing changed or on the second stop (`stop_hook_active`).
- [Pre-commit adds a typecheck to every commit, and `prepare` enables hooks for everyone who installs] → Only affected workspaces; `--no-verify` for emergencies; documented in `docs/harness.md` and the README as a team-wide default.
- [Hooks run under a different Node than `.nvmrc`] → Scripts call `npm`/`npx` from `PATH`; `docs/harness.md` requires the nvm default to satisfy `.nvmrc` (already the case on this machine); `stop-check.mjs` prints the Node version on failure.
- [Bash-level protection is heuristic] → It covers the common writers (redirection, `npm install <pkg>`, `cp`/`mv` onto protected names); the Edit/Write block is exact. Documented as a guardrail, not a sandbox.
- [Harness drifts from the code as the template evolves] → `docs/architecture.md` is the single stack map; agents reference it, and the architecture-docs requirement makes boundary changes update it.
- [OpenCode changes its config or plugin API again (V1 → V2 broke the plugins)] → The version checked is in D10, the plugin touches only `ctx.tool.hook`, `ctx.event.subscribe` and `ctx.session`, and its tests drive those calls.
- [Shipping `.claude/settings.json` to generated projects enables a plugin teammates did not choose] → It only loads after Claude Code's folder-trust check, and `docs/harness.md` explains how to disable it.

## Migration Plan

Additive. Compose defaults are unchanged, so existing stacks and CI keep working. Rollback: remove `plugins/dsh`, `.claude-plugin/`, `.claude/settings.json`, the two docs and `CLAUDE.md`, and restore the `.claude/**` exclusion.

## Open Questions

- Whether the API `unit` suite runs without Postgres (decides the API part of the stop check); resolved by measurement in task 5, no design change either way.
