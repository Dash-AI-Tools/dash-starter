---
type: Reference
title: Development harness
description: The dsh plugin: commands, specialist agents, the scripts and the API stubs, guardrails, the commit gate, worktrees and OpenCode.
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

## The scripts

Four plain Node scripts in `plugins/dsh/scripts/` scaffold, verify and localize a change with short output, so an agent reads a few lines instead of a generator banner or a full test log. The root `package.json` exposes them:

| Command                                                  | Script        | What it does                                                                                                       |
| -------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------ |
| `npm run context -- <layer>`                             | `context.mjs` | Prints one row of `plugins/dsh/scripts/layers.json`: the generator, the file to imitate and the files to register. |
| `npm run gen -- <layer> <name> [flags]`                  | `gen.mjs`     | Runs the generator of the layer in its workspace and prints only the files it created or changed.                  |
| `npm run check -- [--changed \| <workspace>...]`         | `check.mjs`   | Runs the format, the lint, the typecheck and the tests, and prints one line per step and only the failures.        |
| `npm run i18n -- <web\|api> <namespace> <key> <en> <es>` | `i18n.mjs`    | Adds a key to the English and the Spanish catalog together, then formats them.                                     |

### `context`

`layers.json` holds the rows of the table "Where each kind of change lives" of `docs/architecture.md` as data, plus the generator layers of `gen`. The argument is a row (`api-endpoint`, `database-change`, `web-page`, …), an alias of a row (`endpoint`, `db`, `page`, …) or a generator layer (`controller`, `migration`, …). The output is four lines:

```bash
npm run context -- database-change
```

```
layer: database-change (Database change)
generator: npm run gen -- <migration|model|seeder|factory> <name>
imitate: the newest migration in apps/api/database/migrations/
files: apps/api/database/migrations/, apps/api/database/schema.ts (regenerated)
```

A row with no generator says `generator: none, write it by imitation`. An unknown layer fails and lists the known ones. `plugins/dsh/scripts/context.test.mjs` asserts that every row of `layers.json` matches the table of `docs/architecture.md` (the change, the files, the generator and the file to imitate), so a change of one without the other fails `npm test -w @dash/dsh`.

### `gen`

| Layer                                                                                                                                                  | Runs                               | In         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | ---------- |
| `controller`, `validator`, `service`, `transformer`, `middleware`, `exception`, `event`, `listener`, `test`, `migration`, `model`, `seeder`, `factory` | `node ace make:<layer> <name>`     | `apps/api` |
| `primitive`                                                                                                                                            | `npx shadcn add <name> --yes`      | `apps/web` |
| `component`                                                                                                                                            | `npm run make:component -- <name>` | the root   |
| `feature`                                                                                                                                              | `npm run make:feature -- <name>`   | the root   |
| `change`                                                                                                                                               | `openspec new change <name>`       | the root   |

A `primitive`, `component`, `feature` or `change` name is kebab-case (`data-card`); an ace name may have folders (`admin/invoices`).

The flags after the name reach the generator only when `generators.<layer>.flags` of `layers.json` allows them:

| Layer        | Flags                                                                |
| ------------ | -------------------------------------------------------------------- |
| `controller` | `--resource`, `--api`, `--singular`, and action names (`index show`) |
| `validator`  | `--resource`                                                         |
| `middleware` | `--stack=<server\|router\|named>`                                    |
| `listener`   | `--event=<name>`                                                     |
| `test`       | `--suite=<name>`                                                     |
| `migration`  | `--create`, `--alter`                                                |
| `model`      | `--migration`, `--controller`, `--transformer`, `--factory`          |
| Any other    | none                                                                 |

Any other flag is refused with the flags the layer allows: `Refused: --api. validator accepts only --resource.` The overwrite flags (`--force`, `-f`, `--overwrite`, `-o`) and `--contents-from` are always refused: the generators never overwrite a file. Without `--stack`, `make:middleware` asks a question; `gen` reports that it created nothing and to pass the flag that answers it.

The output contract:

- On success, only the paths: one created path per line, then one `modified: <path>` line per changed file (`modified: apps/api/start/kernel.ts` for a named middleware). The paths are relative to the root of the repository. They cover the folders the generator can write and the files at the root; the snapshot skips `.claude`, `.serena`, `.opencode` and the `.env*` files.
- After a migration, one more line: `Next: node ace migration:run in apps/api, it regenerates database/schema.ts.`
- A row of the table is refused with the generator it names: `"api-endpoint" is a kind of change, not a generator layer: run npm run gen -- <controller|…> <name>.`
- A layer that no generator covers is refused with the file to imitate: `No generator covers "ability" (Authorization rule): write it by imitating updateOrganization in apps/api/app/abilities/main.ts, …`. Any other name lists the generator layers.
- An existing target is refused and nothing is written: `The target exists, nothing was generated`, with the path, or with the line of the generator that skipped it.
- A failing generator prints its command, its exit code, the last 15 lines of its output and the files it left behind.

Two generators depend on something outside the repository:

- `primitive` runs `npx shadcn add`, which fetches the primitive from the registry of shadcn: it needs the network, and its failure says so.
- `change` runs `openspec new change`: `openspec` must be on the `PATH` of the active Node. With nvm, a global `openspec` installed under another version is not found after `nvm use`; install it again under the version of `.nvmrc`.

### `check`

`npm run check` and `npm run check -- --changed` check the files that changed since the last commit, tracked or not; `npm run check -- <workspace>...` checks whole workspaces, named by their directory (`apps/web`), their last segment (`web`) or their package name (`@dash/web`). An unknown name fails and lists the known ones.

| Mode             | Steps per workspace                                                                                                                                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--changed`      | Prettier on the changed files only, then for each affected workspace: the lint, the typecheck, the fast tests of the `Stop` hook (`vitest related` for `apps/web`, the node suites).                                       |
| Named workspaces | Prettier on the workspace, the lint, the typecheck, and the tests: the node suites, and the full `npm test` of `apps/web` and `apps/api`. The API suite runs only when `apps/api` is named, because it needs the database. |

The output contract:

- One line per step: `<step> <workspace> ok` or `<step> <workspace> failed`. `nothing changed` when there is nothing to check.
- Under a failed step, only the lines that name a failure: `error TS` with its explanation, the ESLint file and its error lines, the titles and the assertions of the failing Japa, Vitest and node:test tests, the files Prettier would rewrite. Stack frames, code frames and npm noise are dropped.
- At most 30 lines per failed step, then `… N more`.
- Then `rerun: <command>`, the command that prints the same step untrimmed (`npm run typecheck -w @dash/web`, `npx prettier --check <files>`, `cd apps/web && npx vitest related --run <files>`).

The exit code is 0 when every step passed. The stop hook and the gate of the commit keep their own reporting.

### `i18n`

```bash
npm run i18n -- web billing receiptsTitle Receipts Recibos
```

`web` writes `apps/web/src/locales/{en,es}/<namespace>.ts`, above the `} as const` line, and takes a camelCase key. `api` writes `apps/api/resources/lang/{en,es}/<namespace>.json`, and a dotted key (`errors.notFound`) nests the message. The namespace is the file name of the catalog (`apiKeys`) and must stay inside the locale folder. Each part of a key is letters, digits, `_` or `-`; `__proto__`, `constructor` and `prototype` are refused. Both files are read and formatted with the Prettier of the repository before either is written: a missing namespace, a key that exists in either catalog or a format failure fails with `Nothing was written.`, so a pair never splits. The written files are printed, one per line.

## The stubs of the API

`node ace make:*` writes from the stubs of `apps/api/stubs/make/` before the ones of the framework, so `npm run gen` and a plain `node ace make:<layer>` both produce code in the style of the repository. The stubs were ejected with `node ace eject` and rewritten from the files `docs/architecture.md` names to imitate:

| Generator          | Stubs                                                                                  | What they write                                                                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `make:controller`  | `controller/main.stub`, `resource.stub`, `api.stub`, `actions.stub`                    | A singular controller (`probe_controller.ts`), HTTP only: validate, authorize, call a service, serialize.                                                         |
| `make:service`     | `service/main.stub`                                                                    | `app/services/<plural>.ts` exporting functions, with a `list<Plural>(organization)` query scoped to the organization.                                             |
| `make:migration`   | `migration/create.stub`, `alter.stub`                                                  | Create: `id`, `organization_id` (cascade), the timestamps and an index on `organization_id, created_at`. Alter: a no-op with an example of a column in a comment. |
| `make:exception`   | `exception/main.stub`                                                                  | An `E_<NAME>` constant built with `createError`, the form of `apps/api/app/exceptions/errors.ts`.                                                                 |
| `make:model`       | `model/main.stub`                                                                      | A model extending its schema class of `#database/schema`.                                                                                                         |
| `make:validator`   | `validator/main.stub`, `resource.stub`                                                 | VineJS validators, one file per resource.                                                                                                                         |
| `make:transformer` | `transformer/main.stub`                                                                | A transformer that picks its fields by name.                                                                                                                      |
| `make:test`        | `test/main.stub`                                                                       | A Japa group; a functional test points at the `Browser` of `apps/api/tests/helpers/browser.ts`.                                                                   |
| The others         | `middleware/`, `event/`, `listener/main.stub`, `for_event.stub`, `seeder/`, `factory/` | The files of the framework, with a JSDoc that states the rule of the layer: a listener delegates to a service, a seeder writes through one.                       |

`apps/api/tests/unit/stubs.spec.ts` keeps them honest. It copies the API to `apps/api/build/stubs-check/`, runs one generator per variant of the stubs in the copy, and checks the generated files with Prettier, ESLint and `tsc --noEmit`. A second test replaces the service stub with one that imports what it never uses and proves the lint fails. The copy is removed after the run.

### After an AdonisJS upgrade

An upgrade can change the variables a stub receives. The stub test then fails on the next `node ace test unit`. To bring a stub back in line:

1. Move the house stub aside and eject the new one, from `apps/api`: `node ace eject make/<generator>` for the stubs of `@adonisjs/core`, `node ace eject make/<generator> --pkg=@adonisjs/lucid` for `migration`, `model`, `seeder` and `factory`.
2. Port the house style of the old stub onto the new one, keeping the variables of the new one.
3. Run `node ace test unit --files=stubs` from `apps/api`, with the stack up, until it passes.

## Generate first

Every agent that writes code (`backend-dev`, `frontend-dev`, `ai-dev`, `mcp-dev`, `e2e-tester`, `feature-orchestrator`) and the skills `backend`, `frontend`, `feature`, `ai-capability` and `mcp-capability` carry a "Generate first" section: `npm run context` before writing, `npm run gen` to scaffold, `npm run i18n` for a string, `npm run check -- --changed` to verify, and a hand-written file only for a layer the generators do not cover, imitating the file `context` names. `plugins/dsh/scripts/agents.test.mjs` fails when one of those agents, in `plugins/dsh/agents/` or in `.opencode/agents/dsh/`, does not name `npm run gen` and `npm run check` in its commands.

## Measured comparison

Measured on 2026-10-23. Two fresh general-purpose subagents, same model, no shared context, each in its own copy of the repository with its own throwaway Postgres database, got the same prompt except the line on the method. The scaffold: a migration for a `notes` table (run with `node ace migration:run`, which regenerates `database/schema.ts`), a model `Note`, a validator with `createNoteValidator`, a service `notes.ts` with `listNotes(organization)`, a transformer `NoteTransformer` (`id`, `title`), a controller `NoteController` with `index`, and two keys of the `dashboard` namespace of the web catalogs (`notesTitle`, `notesEmpty`, in English and Spanish). The model is not in the list of the design: it was added because a transformer types against a model, and both runs had it. Done meant `eslint .` and `tsc --noEmit` in `apps/api`, the web typecheck and Prettier on the touched files all exit 0.

- By imitation: the copy before this change, with no stubs and no scripts, told to imitate the files of the table of `docs/architecture.md`.
- With the scripts: the copy with this change, told to use `npm run context`, `gen`, `i18n` and `check`.

| Method           | Tool calls | Tokens | Time   | Bytes written                     | Checks   |
| ---------------- | ---------- | ------ | ------ | --------------------------------- | -------- |
| By imitation     | 7          | 59,518 | 64.8 s | 2,350 in 6 files, plus 2 catalogs | all pass |
| With the scripts | 10         | 57,075 | 75.9 s | 3,313 in 6 files, plus 2 catalogs | all pass |

The tokens and the tool calls are the totals the Agent tool reports at the end of a run: input and output across the turns of the subagent. The extra bytes of the scripts are the JSDoc of the stubs. The validator of the scripts run came out as `validators/note.ts`, the singular name of the generator, instead of the requested `notes.ts`.

There was one run per method, so the differences (4% fewer tokens, 3 more tool calls, 11 s more) are within the noise between runs: this measurement shows no token saving. On a scaffold this small, a capable agent already batches its reads and its writes. What the scripts changed is the output: the house-style JSDoc and the query scoped to the organization come from the stubs instead of the memory of the agent, and the two catalogs are written in one call with the check for a duplicate key. The saving the change expects, fewer raw check outputs to read, only shows when a check fails, and neither run had a failing check. The measurement to repeat is a larger feature, or a run with failing checks.

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

| The stack changes                        | The harness changes                                                                                                                           |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| A new workspace                          | The entry in `WORKSPACES` of `plugins/dsh/scripts/checks.mjs`, and the check of the workspace in `plugins/dsh/skills/review/SKILL.md`.        |
| A new layer of the API or of the web app | The agent that owns it in `plugins/dsh/agents/`, the tag of its tasks and the command that spawns it in `plugins/dsh/skills/`.                |
| A new protected file                     | The rule in `RULES` of `plugins/dsh/scripts/protect-files.mjs` and the check in `isSecretPath` of `plugins/dsh/scripts/checks.mjs`.           |
| A new check (a linter, a scanner)        | The check in `plugins/dsh/scripts/checks.mjs`, so the stop hook and the gate of the commit run it.                                            |
| A new command                            | The skill in `plugins/dsh/skills/<name>/SKILL.md`, a line in the table of this document, and `node plugins/dsh/scripts/opencode.mjs sync`.    |
| A new agent                              | The agent in `plugins/dsh/agents/<name>.md`, a line in the table of this document, and `node plugins/dsh/scripts/opencode.mjs sync`.          |
| A new generator or layer                 | The row in `plugins/dsh/scripts/layers.json` and the same row in the table "Where each kind of change lives" of `docs/architecture.md`.       |
| An AdonisJS upgrade                      | The stubs of `apps/api/stubs/make/`: see [After an AdonisJS upgrade](#after-an-adonisjs-upgrade).                                             |
| The stack of the containers changes      | The variables of the Compose files (`docs/guides/configuration.md` names them) and the slot arithmetic of `plugins/dsh/scripts/worktree.mjs`. |

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
