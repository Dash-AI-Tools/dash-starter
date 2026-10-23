# Tasks

## 1. House-style API stubs

- [ ] 1.1 [backend] Eject the stubs of `make:controller`, `make:model`, `make:migration`, `make:validator`, `make:service`, `make:transformer`, `make:test`, `make:middleware`, `make:exception`, `make:event`, `make:listener`, `make:seeder` and `make:factory` into `apps/api/stubs/` with `node ace eject`, and rewrite each one from the file `docs/architecture.md` names to imitate for its layer
- [ ] 1.2 [backend] Add an API unit test that generates one file per stub in a temporary copy of `apps/api` and runs Prettier, ESLint and `tsc --noEmit` on them; verify it passes and fails when a stub emits an unused import

## 2. The scripts

- [ ] 2.1 [tooling] Add `plugins/dsh/scripts/layers.json` (layer, generator, cwd, file to imitate, registration files) and `context.mjs <layer>`; add a test that every row matches the "Where each kind of change lives" table of `docs/architecture.md`
- [ ] 2.2 [tooling] Add `gen.mjs <layer> <name>` per design decision 2: runs the generator in its workspace, prints only the created paths, refuses an unknown layer (naming the file to imitate) and an existing target; tests with an injected runner cover every layer, an unknown layer, an existing file and the offline failure of shadcn
- [ ] 2.3 [tooling] Add `check.mjs [--changed | <workspace>...]` on top of `checks.mjs`: one line per step, failure lines only, a bounded length with a `… N more` note and the command to rerun untrimmed; tests on recorded outputs of TypeScript, ESLint, Japa, Vitest and node:test
- [ ] 2.4 [tooling] Add `i18n.mjs <web|api> <namespace> <key> <en> <es>`: preflight both catalogs, refuse a duplicate in either, insert, format; tests cover the web and the API catalogs, a duplicate and a missing namespace with no writes
- [ ] 2.5 [tooling] Add the root scripts `gen`, `check`, `i18n` and `context`, and verify `npm run gen -- controller probes`, `npm run check -- --changed`, `npm run i18n -- web billing probeTitle Probe Sonda` and `npm run context -- api-endpoint` on a scratch branch, then discard the scratch files

## 3. The agents

- [ ] 3.1 [docs] Add the "Generate first" section to `backend-dev`, `frontend-dev`, `ai-dev`, `mcp-dev`, `e2e-tester` and `feature-orchestrator` and to the skills `backend`, `frontend`, `feature`, `ai-capability` and `mcp-capability`, then run `node plugins/dsh/scripts/opencode.mjs sync`; verify `opencode.mjs check` and the plugin tests pass
- [ ] 3.2 [tooling] Extend the plugin test that checks the agent definitions: every code-writing agent names `npm run gen` and `npm run check`

## 4. Shipping and documentation

- [ ] 4.1 [installer] Confirm `apps/api/stubs/` and the new scripts travel to a generated project and that the stubs rebrand like the rest of the API; extend `packages/create-app/test/install.test.js`
- [ ] 4.2 [docs] Document the scripts and the stubs in `docs/harness.md`, the generator column in `docs/architecture.md`, and an entry in `docs/log.md`
- [ ] 4.3 [docs] Record in `docs/harness.md` the measured comparison of design decision 7 (tool calls and tokens of the same scaffold by imitation and with the scripts)

## 5. Verification

- [ ] 5.1 Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` and `openspec validate add-harness-generators --strict`; all pass
- [ ] 5.2 Generate a project with the installer, scaffold one API layer of each kind with `npm run gen`, and run its lint, typecheck and tests without editing the generated files
