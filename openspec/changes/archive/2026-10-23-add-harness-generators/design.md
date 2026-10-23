# Design

## Context

- The API is AdonisJS 7. `node ace list` exposes `make:controller`, `make:model`, `make:migration`, `make:validator`, `make:service`, `make:transformer`, `make:test`, `make:middleware`, `make:exception`, `make:event`, `make:listener`, `make:seeder`, `make:factory`, `make:command`, `make:provider` and `make:preload`, plus `eject` for the stubs. The repository has no `apps/api/stubs/`, so the generators produce the framework's default style, which differs from the house style (JSDoc that explains why, `#` aliases, transformers, the service-per-domain layout).
- The web app is React on Vite. Its primitives live in `@dash/ui`, and `apps/web/components.json` already points shadcn at `packages/ui`, so `npx shadcn add <primitive>` lands in the package. Pages, hooks and catalogs have no generator.
- The core tools already scaffold whole features (`npm run make:feature`) and custom components (`npm run make:component`), insert above markers and run the project's Prettier on what they write.
- OpenSpec scaffolds changes (`openspec new change`) and serves the instructions of each artifact (`openspec instructions`).
- The harness scripts are plain Node in `plugins/dsh/scripts/`; `checks.mjs` already knows the workspace map, the affected workspaces of a path list and how to run each check; `opencode.mjs` regenerates the OpenCode copies of the agents and skills.

## Goals / Non-Goals

**Goals:**

- Generated API files that need no rewrite.
- One entry point per job (`gen`, `check`, `i18n`, `context`), each printing the least an agent needs to read.
- The agents prefer those entry points, in Claude Code and in OpenCode.

**Non-Goals:**

- Generators for layers the stack does not cover (abilities, AI tools, web pages outside a feature, e2e journeys): they stay hand-written by imitation.
- An AST codemod engine; edits keep using markers and plain text.
- New dependencies, or a change to any runtime behavior.
- Measuring tokens automatically in CI; the measurement is a documented one-off.

## Decisions

### 1. House-style stubs through `node ace eject`

Eject only the stubs of the generators listed above into `apps/api/stubs/` and rewrite each one from the file the architecture guide names as the one to imitate. Ace resolves the project's `stubs/` before the framework's, so the plain `node ace make:*` commands, the ones every Adonis developer knows, already produce house-style code. A test generates one file per stub into a scratch copy and runs format, lint and typecheck on them, so a stub cannot drift from the conventions.

Alternative rejected: our own templates in the plugin. They duplicate what ace already does and an Adonis developer would not find them.

### 2. `gen` maps a layer to the generator that owns it

`node plugins/dsh/scripts/gen.mjs <layer> <name> [flags]` with a fixed table:

| Layer | Runs | Cwd |
| --- | --- | --- |
| `controller`, `model`, `migration`, `validator`, `service`, `transformer`, `middleware`, `exception`, `event`, `listener`, `seeder`, `factory`, `test` | `node ace make:<layer> <name>` | `apps/api` |
| `primitive` | `npx shadcn add <name>` | `apps/web` (writes into `packages/ui`) |
| `component` | `npm run make:component -- <name>` | root |
| `feature` | `npm run make:feature -- <name>` | root |
| `change` | `openspec new change <name>` | root |

It snapshots the file list before and after and prints only the created paths, so the agent never reads the generator's banner. It refuses an unknown layer with the file to imitate, from the `context` table, and refuses to run when the target exists. A migration then reminds the agent to run it, since `schema.ts` is generated. Root scripts expose it as `npm run gen -- <layer> <name>`.

### 3. `check` trims the output of the existing checks

`check.mjs [--changed | <workspace>...]` reuses `affectedWorkspaces` and `runChecks` of `checks.mjs`, prints `step workspace ok|failed` per step, and for a failed step keeps only the lines that name a failure (TypeScript `error TS`, ESLint rule lines, Japa and Vitest failing test titles with their assertion, node:test `not ok`), capped at a bounded number of lines with a `… N more` note. The stop hook and the pre-commit gate keep their own reporting; they can adopt the trimmer later.

### 4. `i18n` adds a key to both catalogs

`i18n.mjs <web|api> <namespace> <key> <en> <es>` appends the key above the closing line of `apps/web/src/locales/{en,es}/<namespace>.ts` (the `} as const` line) or into `apps/api/resources/lang/{en,es}/<namespace>.json`, preflights both files and refuses a key that exists in either, then formats them with the project's Prettier. The English type of the web catalogs makes a missing Spanish key a type error, so the pair can never split.

### 5. `context` and the architecture table share one source

The layer table (generator, file to imitate, registration files) lives as data in `plugins/dsh/scripts/layers.json`. `context.mjs <layer>` prints one row; a test asserts that every row matches the "Where each kind of change lives" table of `docs/architecture.md`, so the guide and the script cannot diverge without failing `npm test`.

### 6. The agents use the scripts

Each code-writing agent and its skill gets a short "Generate first" section that names `npm run gen`, `npm run check -- --changed`, `npm run i18n` and `npm run context`, and the rule to hand-write only an uncovered layer. `opencode.mjs sync` regenerates the OpenCode copies; its check already fails on drift.

### 7. Measuring the saving

The harness guide records one measured comparison: the same scaffold (a controller, a validator, a service, a transformer, a migration and two catalog keys) done by an agent by imitation and with the scripts, with the tool calls and the tokens of each, so the claim stays honest.

## Risks / Trade-offs

- An AdonisJS upgrade changes a stub's contract → the stub test fails on the next run; re-eject and port the house style.
- `npx shadcn add` needs the network → it is the only generator that does; `gen` says so when it fails offline, and the tests mock it.
- Trimming hides a useful line → a failing step prints the command to rerun it untrimmed.
- Agents ignore the scripts → the definitions name them in the commands section, and the dev-harness scenario checks it.
