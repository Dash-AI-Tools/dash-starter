# Proposal

## Why

The `dsh` agents write every new file by hand: they read the "Imitate" file of `docs/architecture.md`, then type a controller, a migration or a test from memory of it, and they read the full output of every lint, typecheck and test run. That is where most of the tokens of a feature go, and it is the part the stack already does for free: AdonisJS has a `make:*` generator for almost every API layer, shadcn adds primitives, OpenSpec scaffolds changes and the core tools scaffold features and components. The harness should drive those generators with the house style already in place and hand the agents only what they need to read.

## What Changes

- Eject the AdonisJS stubs the API uses into `apps/api/stubs/` and rewrite them in the house style (the imports, the comment style, the transformer and service patterns of the repository), so `node ace make:controller|model|migration|validator|service|transformer|test|middleware|exception|event|listener|seeder|factory` produces files that need no rewrite.
- A `gen` script in the plugin that maps a layer to the generator of the stack that owns it (`node ace make:*`, `npx shadcn add`, `npm run make:feature`, `npm run make:component`, `openspec new change`), runs it in the right workspace and prints only the paths it created.
- A `check` script that runs format, lint, typecheck and the tests of the workspaces a change touched and prints only the failures, trimmed, reusing `checks.mjs`.
- An `i18n` script that adds a key to the English and the Spanish catalog of a namespace in one call, on the web side and on the API side, refusing a key that already exists.
- A `context` script that prints, for a layer, the generator to run, the file to imitate and the files to register, from one table shared with `docs/architecture.md`.
- The agents, the skills and the generated OpenCode files tell the specialists to generate first, to read the trimmed outputs, and to fall back to hand-writing only where no generator exists.
- A measurement in the harness guide: the tokens and the tool calls of the same scaffold done by hand and with the scripts.

## Capabilities

### New Capabilities

- `harness-generators`: the stack generators, the house-style stubs and the token-lean scripts (`gen`, `check`, `i18n`, `context`) the harness drives.

### Modified Capabilities

- `dev-harness`: the specialist agents and the scoped flows generate code through the stack and read trimmed outputs.

## Impact

- New: `apps/api/stubs/**`, `plugins/dsh/scripts/{gen,check,i18n,context}.mjs` and their tests.
- Changed: `plugins/dsh/agents/*.md`, `plugins/dsh/skills/*/SKILL.md`, the generated `.opencode/` files, `docs/harness.md`, `docs/architecture.md`, `package.json` (root scripts), the installer test that the harness travels.
- No change to the runtime behavior of the API or the web app, no new dependency (every generator is already installed).
