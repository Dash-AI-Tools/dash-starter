---
type: Reference
title: Development harness
description: The dsh plugin: commands, specialist agents, guardrails, the commit gate, worktrees and OpenCode.
tags: [harness, tooling, claude-code, opencode, reference]
status: stable
---

# The development harness

The harness is the `dsh` plugin of this repository: a set of specialist agents, a set of commands, some guardrails and a gate of the commit. It lives in `plugins/dsh/` and it is enabled for the project by `.claude/settings.json`. OpenCode gets the same agents, commands and guardrails, generated from the same files: see [OpenCode](#opencode).

It does not replace the way you work: it makes the way of the repository explicit, repeatable and checkable. A change still goes through OpenSpec, the specialists still write the code of their layer, and the guardrails still refuse what the repository refuses.

## The commands

Every command is a skill of the plugin, so it is called `/dsh:<name>`. They are explicit commands: the model never runs one on its own.

| Command                          | What it does                                                                                                                                                                       | When to use it                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `/dsh:feature <id>`              | Runs a feature end to end: proposes the change if it does not exist, applies its tasks with the specialists, reviews the result and reports.                                       | A feature that touches more than one layer.          |
| `/dsh:backend <id>`              | Implements the tasks tagged `[backend]` of a change with the API specialist.                                                                                                       | A change that only touches `apps/api`.               |
| `/dsh:frontend <id>`             | Implements the tasks tagged `[frontend]` of a change with the web specialist.                                                                                                      | A change that only touches `apps/web`.               |
| `/dsh:mcp-capability <id>`       | Adds an MCP tool, a scope or a key policy with the MCP specialist.                                                                                                                 | A change of the MCP server of `apps/api`.            |
| `/dsh:ai-capability <id>`        | Adds a provider, a model, a prompt or an AI tool with the AI specialist.                                                                                                           | A change of the AI layer of `apps/api`.              |
| `/dsh:parallel-features <id>...` | Develops several changes at the same time, each in its own branch and worktree, with the conflicts found before the work starts.                                                   | Several changes that could be developed in parallel. |
| `/dsh:review [id]`               | Checks the current diff with the formatter, the linter, the typechecker, the tests, the end-to-end suite and the security reviewer, and maps every scenario of a change to a test. | Before a commit or before a review.                  |
| `/dsh:docs [id]`                 | Brings the documentation in line with the current diff.                                                                                                                            | After a change that adds a capability or a contract. |

The scoped commands never propose a change: if the change does not exist, they stop and say so. Only `/dsh:feature` proposes.

## The agents

The specialists are subagents of the plugin, so they are called `dsh:<name>`. The commands spawn them; you can also spawn one directly when you know exactly which layer you need.

| Agent                      | Owns                                                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `dsh:feature-orchestrator` | One change end to end: it decides what gets built, delegates the tasks to the specialists, checks them off and reports.           |
| `dsh:backend-dev`          | The AdonisJS API of `apps/api`: routes, controllers, validators, services, models, transformers, migrations, abilities and tests. |
| `dsh:frontend-dev`         | The React web app of `apps/web`: pages, components, feature hooks, the typed client, the catalogs of the locales and the tests.   |
| `dsh:ai-dev`               | The AI layer of the API: the registry of the providers, the quotas, the chat and the AI tools.                                    |
| `dsh:mcp-dev`              | The MCP server of the API, the keys that authenticate it and the tools it exposes.                                                |
| `dsh:e2e-tester`           | The end-to-end journeys of `e2e/`, driven with a real browser against the Compose stack.                                          |
| `dsh:security-reviewer`    | The security of the current diff. It reads and reports; it never writes.                                                          |
| `dsh:docs-writer`          | The documentation of the repository: `docs/`, the READMEs and `CLAUDE.md`.                                                        |

Each agent reads `docs/architecture.md` before it touches a layer or a shared contract.

## The workflows

### One feature

```bash
/dsh:feature real-dashboard-metrics
```

The command runs the OpenSpec loop of the change and stops for the review of the proposal. When the proposal is approved, the orchestrator delegates the tasks of each layer to its specialist, runs the review and reports.

### One scoped change

```bash
/dsh:backend add-invoice-endpoint
```

The command takes the tasks tagged `[backend]` of the change and gives them to the API specialist. A task that needs another layer is reported as a missing task, not done.

### Several features at the same time

```bash
/dsh:parallel-features add-invoices add-bulk-import
```

The command reads the tasks and the design of every change, collects the paths each one names and reports the overlaps in a table: the same file, the same migration, the same locale key, the same route. Then it sequences the work, gives each change its own worktree and its own stack, and defines the order of the merge.

## The OpenSpec loop

The loop is the one of the repository, and the harness does not change it:

1. `openspec new change <id>` creates `openspec/changes/<id>/` with the proposal, the design, the tasks and the deltas of the specs.
2. The tasks are tagged with the layer that owns them (`[backend]`, `[frontend]`, `[ai]`, `[mcp]`, `[e2e]`, `[docs]`), so the specialists take only what is theirs.
3. `openspec instructions apply --change <id> --json` reports the files of the change and the line of every task: a task is checked off in `openspec/changes/<id>/tasks.md` at that line, and only after its verification passes.
4. `openspec validate <id> --strict` checks the change before it is archived.
5. `openspec archive <id>` moves the deltas into the specs of the main and leaves the history of the change in `openspec/changes/archive/`.

## The guardrails

The hooks of the plugin are plain Node scripts in `plugins/dsh/scripts/`, wired in `plugins/dsh/hooks/hooks.json`. They need no dependency and they run on every session.

| Hook          | What it refuses                                                                                                                                                                                                                                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PreToolUse`  | A write to a protected file: an environment file (`.env`, `.env.*` but not `*.example`), a private key (`*.pem`, `*.key`), the lockfile (`package-lock.json`) and the allowance file itself. A shell command counts too: a redirection, `tee`, `cp`, `mv`, or an `npm install` that rewrites the lockfile. |
| `PostToolUse` | A file that Prettier cannot format or that the linter of its workspace rejects. The output of the linter goes back to the agent.                                                                                                                                                                           |
| `Stop`        | A session that ends with a broken build: the workspaces that changed are typechecked and their fast tests are run. A failure keeps the session open.                                                                                                                                                       |

The fast tests are the ones that need no database: `vitest related` on the changed files of `apps/web`, and the whole suite of `packages/create-app` and of `plugins/dsh`. `apps/api` and `e2e` are only typechecked, because their suites need the stack. The workspaces are listed in `WORKSPACES` of `plugins/dsh/scripts/checks.mjs`.

### Allowing a protected edit

The allowance file is `.claude/dsh-allow`, at the root of the repository. It does not exist until you create it: it is in `.gitignore` and it never travels with the project. It carries one rule per line:

```bash
! echo env > .claude/dsh-allow
```

`env` releases the environment files, `lockfile` releases the lockfile. The file is written by you, with a `!` command, so the hook that protects it never sees the write.

The rules the release does not cover stay refused. The `key` rule has no allowance on purpose: a private key never belongs in an edit.

## The gate of the commit

`.githooks/pre-commit` is the gate: it checks the staged files before the commit lands and refuses it when it does not pass.

- The staged files that hold secrets, or that are generated, are refused. A file that is already in the history (`git ls-tree HEAD`) is not: the tracked `apps/api/.env.docker`, `apps/api/.env.test` and `package-lock.json` of the template can be committed.
- The workspaces of the staged files are typechecked and their fast tests are run, as in the `Stop` hook.
- The staged files are formatted and linted with the tools of their workspace.

The gate is active for the whole team because the root `package.json` has the script `"prepare": "git config core.hooksPath .githooks || true"`: `npm install` and `npm ci` point the hooks of the repository at `.githooks`. A developer who does not want it can commit with `--no-verify`:

```bash
git commit --no-verify -m "message"
```

The gate is a check, not a lock: `--no-verify` is a decision of the developer, and the review of the pull request is where it shows.

## The plugin on a new machine

The marketplace of the repository is local: `.claude-plugin/marketplace.json` points at `plugins/dsh/`, and `.claude/settings.json` declares the marketplace and enables the plugin for everybody who works on the repository.

On a machine that has never had it, install the plugin once:

```bash
claude plugin install dsh@<marketplace> --scope project
```

The name of the marketplace is the one of the project: `dash-starter` in this repository, and the slug of the project in a generated one. Two commands tell you where you stand:

```bash
claude plugin list
claude plugin details dsh@<marketplace>
```

The commands of the plugin are then `/dsh:feature`, `/dsh:review` and the rest.

## OpenCode

The harness works in OpenCode (V2, checked with 2.1.3) from the same files. The agents and the skills of `plugins/dsh` stay the only source: the OpenCode files are generated from them, and the guardrails run the same scripts.

| Claude Code                | OpenCode                       | Where it lives in OpenCode                                                        |
| -------------------------- | ------------------------------ | --------------------------------------------------------------------------------- |
| `/dsh:feature <id>`        | `/dsh/feature <id>`            | `.opencode/commands/dsh/feature.md`, and the same for every command               |
| `dsh:backend-dev`          | `dsh/backend-dev`              | `.opencode/agents/dsh/backend-dev.md`, a subagent, and the same for every agent   |
| The hooks of `hooks.json`  | The plugin `dsh`               | `.opencode/plugins/dsh.js`, which loads `plugins/dsh/scripts/opencode-plugin.mjs` |
| `CLAUDE.md`, read natively | `CLAUDE.md`, as an instruction | `opencode.json`: `"instructions": ["CLAUDE.md"]`                                  |

OpenCode namespaces by directory, so the commands are `/dsh/<name>` and the agents `dsh/<name>`: the prompts are rewritten to those forms, and to the subagent tool of OpenCode instead of the Task tool. An agent that lacks a tool in Claude Code is denied its action in OpenCode: `dsh/security-reviewer` cannot edit or spawn a subagent. OpenCode V2 reads `AGENTS.md` and not `CLAUDE.md`, so `opencode.json` names `CLAUDE.md` as an instruction file and there is no `AGENTS.md` to keep in step.

### The generated files

`.opencode/agents/dsh/`, `.opencode/commands/dsh/` and `.opencode/plugins/dsh.js` are written by a script, never by hand:

```bash
node plugins/dsh/scripts/opencode.mjs sync
node plugins/dsh/scripts/opencode.mjs check
```

`sync` writes them from `plugins/dsh/agents/` and `plugins/dsh/skills/`, and removes the ones whose source is gone. `check` fails when one of them is stale, missing or left over, and the plugin tests run it: an agent or a skill changed without `sync` fails `npm test -w @dash/dsh`. A running OpenCode reads the new files after `opencode reload`.

Git tracks the generated files. The rest of `.opencode/` stays ignored and never travels with the project: the commands and skills a developer installs for themselves (such as the ones of `openspec init`), the state of their plugins and their session logs.

### The guardrails in OpenCode

The plugin calls the scripts of the hooks of Claude Code, so the rules, the messages and the allowance are the same:

| OpenCode hook                         | Script              | What it does                                                                                                                                                                                                   |
| ------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `execute.before`                      | `protect-files.mjs` | Refuses a `write`, an `edit`, a `patch` or a `shell` call that writes a protected file. A patch counts by every file it adds, updates, deletes or moves to. `.claude/dsh-allow` releases it as in Claude Code. |
| `execute.after`                       | `format-lint.mjs`   | Formats and lints the edited files and adds the failure to the result of the edit, so the agent reads it in the same turn.                                                                                     |
| `session.execution.succeeded` (event) | `stop-check.mjs`    | When the agent of a top-level session stops, checks the changed workspaces and resumes the session once with the failures. A subagent is not checked: its parent is.                                           |

The allowance is written by you, as in Claude Code: `! echo env > .claude/dsh-allow` in the prompt of OpenCode runs a shell command that no tool hook sees. `opencode run` exits when the agent stops, so the stop check reports in the TUI and on a long-lived server, not in a one-shot run.

## The worktrees

A feature that is developed while another one is in review needs its own checkout, its own branch, its own environment files and its own stack. The script does all of it:

```bash
node plugins/dsh/scripts/worktree.mjs add <change-id> <slot>
cd .claude/worktrees/<change-id>
docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d --wait
docker compose -f docker-compose.yml -f docker-compose.e2e.yml exec api node ace db:seed
npm run test:e2e
```

The slot takes the base port plus ten times the slot, so slot 1 and slot 2 never fight for a port: slot 1 runs the suite on `http://localhost:5184` and slot 2 on `http://localhost:5194`, next to the stack of the main checkout. The script copies `.env` and `apps/api/.env` into the worktree, writes the names of the projects, the ports of the slot, `E2E_WEB_URL` and `E2E_MAILPIT_URL` in the `.env` of the worktree, and points `apps/api/.env` at the ports of the slot. The suite reads them from there. The stacks of a worktree have their own database, so the plans are seeded once, as in the main checkout.

The change id is the name of the directory and of the branch, so it never carries a path: a kebab-case name like `add-invoices`. The script refuses anything else, so a worktree can never leave `.claude/worktrees/`.

The worktree goes down with its stack and its branch:

```bash
node plugins/dsh/scripts/worktree.mjs remove <change-id> <slot>
```

## Adapting the harness

The harness follows the repository, so a change of the stack is a change of the harness.

| The stack changes                        | The harness changes                                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| A new workspace                          | The entry in `WORKSPACES` of `plugins/dsh/scripts/checks.mjs`, and the check of the workspace in `plugins/dsh/skills/review/SKILL.md`.     |
| A new layer of the API or of the web app | The agent that owns it in `plugins/dsh/agents/`, the tag of its tasks and the command that spawns it in `plugins/dsh/skills/`.             |
| A new protected file                     | The rule in `RULES` of `plugins/dsh/scripts/protect-files.mjs` and the check in `isSecretPath` of `plugins/dsh/scripts/checks.mjs`.        |
| A new check (a linter, a scanner)        | The check in `plugins/dsh/scripts/checks.mjs`, so the stop hook and the gate of the commit run it.                                         |
| A new command                            | The skill in `plugins/dsh/skills/<name>/SKILL.md`, a line in the table of this document, and `node plugins/dsh/scripts/opencode.mjs sync`. |
| A new agent                              | The agent in `plugins/dsh/agents/<name>.md`, a line in the table of this document, and `node plugins/dsh/scripts/opencode.mjs sync`.       |
| The stack of the containers changes      | The variables of the Compose files (`README.md` names them) and the slot arithmetic of `plugins/dsh/scripts/worktree.mjs`.                 |

`docs/architecture.md` is the map of the stack, and it is updated in the same change that moves it.

## Dry run notes

The dry run of the harness is the change `real-dashboard-metrics`: a feature proposed, applied and reviewed with the harness itself. What it showed is written here, so the next developer does not repeat it.

### What worked

- The proposal stopped at the right moment. `/dsh:feature` wrote the change, validated it with `openspec validate --strict` and waited for the review. The open questions it raised were real decisions: who may read the usage, the time zone of the days, the activity without an audit table.
- The specialists kept to their layer. The service, the controller, the route and the API tests were written by `dsh:backend-dev`; the hook, the page, the catalogs and the page tests by `dsh:frontend-dev`; the journey by `dsh:e2e-tester`. The web types come from `node ace codegen` after the route, so the frontend waits for the backend, as the plan says.
- The coverage held. Every `#### Scenario` of the delta has a test, and the review names the ones that do not.
- The guardrails kept the work clean: the formatter rewrote the files the agents wrote, and the format, lint, typecheck and test checks are green at the end.

### What was adjusted

- The stop check ran Vitest from the root of the repository, so it never loaded `apps/web/vite.config.ts` and could not resolve the `@/` alias: every changed web test failed. The check now runs Vitest from the workspace itself, with the paths relative to it. The step that failed was re-run after the fix and passes.
- The commit gate linted `plugins/dsh`, a workspace with no linter of its own: ESLint exits with "no configuration found" and the gate refused every commit that touched the plugin. The workspaces that have a linter are the only ones linted now, and the hook and the gate read the same list.
- The review found that the worktree script took the change id as a path: `remove ../.. 1` pointed at the checkout itself, and the fallback that deletes a worktree that git would not remove would have deleted everything. The id is now a kebab-case name, and the path is checked against `.claude/worktrees/` before anything is deleted.
- The spec of the stop check promised a "database-free unit suite" for the API, but its unit tests need the database as well: the API is checked with its typecheck only, and the spec says so now.

### What is still open

- The guard refuses the writes of the tools, but a shell command can still write a protected file (`echo env > .claude/dsh-allow`, `sed -i`). The design says the allowance file is written by the developer, with a `!` command; an agent that writes it with a shell gets around the hook. The `permissions.deny` rules of the project would be the second layer, and they are not in place yet.
- The gate of the commit refuses the files whose name says they carry a secret. A key pasted into a tracked file is not caught, and a scanner (`gitleaks`) would catch it when it is installed.
