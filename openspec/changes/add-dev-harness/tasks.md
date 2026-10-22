# Tasks

## 1. Plugin loading spike

- [ ] 1.1 Create the minimal plugin skeleton: `plugins/dsh/.claude-plugin/plugin.json` (`name: "dsh"`), root `.claude-plugin/marketplace.json` (marketplace `dash-starter`, plugin source `./plugins/dsh`), `.claude/settings.json` with `extraKnownMarketplaces` (directory source) and `enabledPlugins: { "dsh@dash-starter": true }`; verify `claude plugin validate` passes for both manifests
- [ ] 1.2 Add a throwaway `skills/ping` and `agents/ping` and verify in a fresh session that `/dsh:ping` runs and that spawning the agent works; record the working agent-spawn form (`dsh:ping` or `ping`) and whether the relative marketplace path loaded without a manual install, then delete the throwaway files
- [ ] 1.3 If either check failed, apply the D1 fallback and note it for `docs/harness.md`; verify the plugin loads in a fresh session using the chosen method

## 2. Architecture reference and entry point

- [ ] 2.1 Write `docs/architecture.md` from the discovery in design.md: workspaces, API layers and request flow, AI layer and shared tool registry, MCP, web structure, persistence and migrations, config/env, localization, tests, CI, "where each kind of change lives" table with the file to imitate, and per-workspace build/test/lint/format/typecheck commands; verify every path in it exists (scripted `ls` check) and every command exits 0 on this checkout
- [ ] 2.2 Write `CLAUDE.md` with a short section pointing to `docs/architecture.md`, `docs/harness.md` and the OpenSpec workflow (plus the Node/nvm requirement); verify it stays under 40 lines and duplicates no architecture content
- [ ] 2.3 Gitignore `.claude/worktrees/` and `.claude/dsh-allow`; verify `git check-ignore` matches both

## 3. Specialist agents

- [ ] 3.1 Write `plugins/dsh/agents/backend-dev.md` and `frontend-dev.md` with Scope, Owns, Must not touch, Commands, Done when and Patterns (files to imitate, e.g. `organization_controller.ts` + `validators/organization.ts` + `services/organizations.ts` + `organization_transformer.ts` + `tests/functional/organizations.spec.ts`; `pages/MembersPage.tsx` + `lib/organizations.ts` + `locales/{en,es}`); verify with a script that each required section exists and every path named exists
- [ ] 3.2 Write `ai-dev.md` and `mcp-dev.md` (shared tool registry rule, quotas/metering, stub provider in tests, prompt-injection and PII guardrails, `docs/ai.md` / `docs/mcp.md`); same verification
- [ ] 3.3 Write `docs-writer.md`, `e2e-tester.md` (Playwright in `e2e/`, `docker-compose.e2e.yml`, Mailpit and signed-webhook helpers) and `security-reviewer.md` (read-only tools, checklist incl. tenant isolation via `org` middleware, Vine validation, Bouncer abilities, webhook signature, MCP scopes, `npm audit`, optional semgrep/gitleaks when installed, report format); same verification
- [ ] 3.4 Write `feature-orchestrator.md` (OpenSpec loop, tag→agent map, sequencing and parallel rules, contract rule for `app/tools/registry.ts`, scenario-coverage table, final report format); same verification

## 4. Commands

- [ ] 4.1 Write skills `feature`, `backend`, `frontend`, `mcp-capability`, `ai-capability` (`disable-model-invocation: true`, `argument-hint`), each spawning the agent form recorded in 1.2; verify each appears as `/dsh:<name>` in a fresh session
- [ ] 4.2 Write skill `review`: format check, lint, typecheck, API tests (with the test database), web/installer/plugin tests, E2E against the current checkout's e2e stack, `dsh:security-reviewer`, scenario coverage; report table with step, command, result; verify it runs end to end on the current branch and reports each step
- [ ] 4.3 Write skill `docs` (spawns `dsh:docs-writer` with the current diff); verify on a diff that adds an MCP tool that it proposes a `docs/mcp.md` entry
- [ ] 4.4 Write skill `parallel-features` following D7 (overlap table, contracts first, worktrees, status table, merge order, rebase procedure); verified in group 7

## 5. Guardrail hooks

- [ ] 5.1 Add `plugins/dsh/package.json` (workspace, `test: node --test`) and register `plugins/*` in the root workspaces; verify `npm test` at the root runs the plugin suite
- [ ] 5.2 Implement `scripts/protect-files.mjs` + tests: blocks Edit/Write/MultiEdit/NotebookEdit and Bash writes to `.env`, `.env.*` (not `*.example`), `apps/api/.env.docker`, `*.pem`, `*.key`, `package-lock.json`, `.claude/dsh-allow`; honours `env`/`lockfile` entries in `.claude/dsh-allow`; verify tests for blocked, allowed and example paths pass
- [ ] 5.3 Implement `scripts/format-lint.mjs` + tests: Prettier on the file, ESLint from the owning workspace, block-with-output on lint errors, no linter for files outside workspaces; verify tests and a live edit with an unused variable in `apps/web/src`
- [ ] 5.4 Measure whether `node ace test unit` passes with Postgres stopped; implement the shared `scripts/checks.mjs` (`affectedWorkspaces`, `isSecretPath`, `runChecks`) and `scripts/stop-check.mjs` on top of it + tests (changed files → workspaces, typecheck + fast tests, skip when no changes or `stop_hook_active`); verify tests and a live session that introduces a type error is blocked
- [ ] 5.5 Wire the three scripts in `plugins/dsh/hooks/hooks.json` with `${CLAUDE_PLUGIN_ROOT}`; verify in a fresh session that editing `apps/api/.env` is refused and editing `.env.example` is allowed
- [ ] 5.6 Add `.githooks/pre-commit` (POSIX sh → Node) using `checks.mjs` on the staged set: Prettier check, ESLint per workspace, typecheck + fast tests of affected workspaces, refusal of staged secret files; tests for staged-path selection and secret refusal; verify live that an unformatted file, a type error and a force-added `apps/api/.env` are each refused, and `--no-verify` bypasses
- [ ] 5.7 Add root `"prepare": "git config core.hooksPath .githooks || true"`; verify a fresh clone + `npm install` sets `core.hooksPath`, and `npm ci` inside the Compose web container still succeeds without `.git`

## 6. Side-by-side stacks

- [ ] 6.1 Make project names and host ports env-driven in `docker-compose.yml` and `docker-compose.e2e.yml` (defaults unchanged), keeping `E2E_*` URLs consistent; verify `docker compose config` with no variables equals today's ports, and the e2e suite still passes on defaults
- [ ] 6.2 Implement `plugins/dsh/scripts/worktree.mjs add|remove <change-id> <slot>` + tests (worktree under `.claude/worktrees/`, branch `feat/<change-id>`, copied env files, slot ports appended to the worktree `.env`); verify two worktrees can run their e2e stacks at the same time
- [ ] 6.3 Document the variables in the root README and `e2e/README.md`; verify the documented commands work as written

## 7. Parallel features check

- [ ] 7.1 Run `/dsh:parallel-features` on two small throwaway changes that both touch `apps/web/src/locales/en/common.ts` and each add a migration; verify the overlap table flags both conflicts, the plan sequences the migrations, two worktrees run their reviews concurrently, and the merge procedure lands both; then remove the throwaway changes, branches and worktrees

## 8. Installer ships the harness

- [ ] 8.1 Update `packages/create-app/template.json` exclusions per D8; add installer tests that a generated project contains `plugins/dsh`, `.claude-plugin/marketplace.json`, `.claude/settings.json`, `CLAUDE.md`, `docs/architecture.md`, `docs/harness.md` with no template placeholder, and lacks `settings.local.json`, `worktrees` and local tool state; verify `npm test -w packages/create-app` passes
- [ ] 8.2 Set `core.hooksPath .githooks` in the installer right after `initRepository`; installer test asserts the generated repository uses `.githooks` and contains `.githooks/pre-commit`; verify `npm test -w packages/create-app` passes
- [ ] 8.3 Extend the CI `installer` job to assert the harness files and git hooks exist in the generated project; verify the job's steps locally

## 9. Harness guide

- [ ] 9.1 Write `docs/harness.md`: what each agent and command does and when to use it, the single-feature, scoped-change and parallel-features workflows, the OpenSpec loop, Claude Code hooks and how to allow protected edits, the git pre-commit gate (what it checks, `--no-verify`, team-wide activation through `prepare`), the plugin trust/enable step (and the fallback from 1.3 if used), and how to adapt the harness when the stack changes; verify every command and path it names exists

## 10. Dry run

- [ ] 10.1 Run `/dsh:feature real-dashboard-metrics`; verify it proposes a separate, strictly valid OpenSpec change with layer-tagged tasks and stops for review
- [ ] 10.2 After approval, let the orchestrator implement it through the specialists; verify the dashboard home shows the organization's real member count, credits, MCP calls, seats and activity, `/dsh:review` passes and every scenario of that change maps to a test
- [ ] 10.3 Fix in the harness every gap the dry run exposed and record what worked and what was adjusted in `docs/harness.md` ("Dry run notes"); verify the fixed agents/skills by re-running the step that failed

## 11. Integration verification

- [ ] 11.1 Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, the e2e suite and `openspec validate add-dev-harness --strict`; all pass
