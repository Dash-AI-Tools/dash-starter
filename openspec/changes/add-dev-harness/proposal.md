# Proposal

## Why

Features in this starter span four layers with strict conventions (Adonis controllers/validators/services/transformers, React pages on a typed client, one tool registry shared by AI chat and MCP, EN/ES catalogs everywhere) plus OpenSpec planning. Today every agent session rediscovers that from scratch. A harness derived from the real architecture lets Claude Code build features end to end, scoped or in parallel, with the same guardrails each time, and it ships with every product generated from the template.

## What Changes

- `docs/architecture.md`: layers, module boundaries, data flow, conventions, where each kind of change lives, and the real build/test/lint/format/typecheck commands per workspace.
- A project-local Claude Code plugin named `dsh` (repo marketplace, enabled in `.claude/settings.json`), so every command and agent is namespaced `/dsh:<name>` / `dsh:<agent>`:
  - Agents: `feature-orchestrator`, `backend-dev`, `frontend-dev`, `mcp-dev`, `ai-dev`, `docs-writer`, `e2e-tester`, `security-reviewer`, each with scope, owned paths, forbidden paths, commands and definition of done.
  - Commands: `/dsh:feature`, `/dsh:backend`, `/dsh:frontend`, `/dsh:mcp-capability`, `/dsh:ai-capability`, `/dsh:parallel-features`, `/dsh:review`, `/dsh:docs`.
  - Hooks: format + lint touched files after edits; typecheck + fast unit tests of affected workspaces before stopping; block edits to env/secret files and lockfiles unless explicitly allowed.
- A git pre-commit gate (`.githooks/pre-commit`, enabled by an npm `prepare` script, no new dependency) that applies to every committer, not only Claude: format, lint, typecheck and fast tests of affected workspaces, and refusal of staged secrets; it shares its check logic with the Claude stop hook.
- OpenSpec-driven workflow encoded in the commands: propose → validate → apply (tasks tagged by layer) → verify (every scenario covered by a test) → archive.
- Parallel features: one change, branch and git worktree per feature; overlap analysis; shared contracts merged first; merge order and rebase procedure; status reports.
- Per-worktree Docker stacks: Compose project name and host ports become env-overridable (defaults unchanged), so each worktree can run its own full `/dsh:review` including E2E.
- `docs/harness.md` and a short `CLAUDE.md` pointing to the architecture doc, the harness and the workflow.
- The installer ships the harness in generated projects (rebranded like the rest of the template) instead of excluding `.claude/**`; user-local Claude files and worktrees stay out.
- Dry run: implement "real dashboard metrics" (replace the made-up KPI/activity data on the dashboard home with organization data) through `/dsh:feature` as its own OpenSpec change, and report what needed adjusting.

## Capabilities

### New Capabilities
- `architecture-docs`: the architecture reference that agents and humans consult, and the obligation to keep it in sync with module boundaries.
- `dev-harness`: the `dsh` plugin: its agents, commands, ownership boundaries and definitions of done.
- `harness-guardrails`: the Claude Code hooks that format, lint, check and protect files during agent work, and the git pre-commit gate that applies to every committer.
- `spec-driven-workflow`: how every feature moves through OpenSpec phases inside the harness, including layer-tagged tasks and scenario-to-test coverage.
- `parallel-feature-development`: concurrent features in isolated worktrees with overlap analysis, contract-first merging and status reporting.

### Modified Capabilities
- `project-installer`: generated projects include the development harness and have the git hooks enabled (adds a requirement; the existing exclusions of installer internals and change history stay).
- `dev-environment`: stacks can run side by side with distinct project names and ports (adds a requirement; the one-command default stack is unchanged).

## Impact

- New: `plugins/dsh/` (plugin manifest, `agents/`, `skills/`, `hooks/` and hook scripts), `.claude-plugin/marketplace.json`, `.claude/settings.json`, `.githooks/pre-commit`, `CLAUDE.md`, `docs/architecture.md`, `docs/harness.md`.
- Root `package.json` gains a `prepare` script that sets `core.hooksPath`; every `npm install` enables the commit gate (team-wide default, bypassable with `--no-verify`).
- Changed: `docker-compose.yml`, `docker-compose.e2e.yml` (env-driven project name and ports), `e2e/playwright.config.ts` and `e2e/support/*` already read URLs from env and stay compatible; `.gitignore` (`.claude/worktrees/`); `packages/create-app/template.json` (ship harness, keep `settings.local.json`, worktrees and local tool state out).
- No new npm dependencies or external tools. The security reviewer uses `npm audit` and uses semgrep/gitleaks only if already installed; adding them is a separate decision.
- Dry run adds a separate OpenSpec change for real dashboard metrics (API endpoint, web dashboard, tests, e2e).
