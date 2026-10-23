---
type: Guide
title: Testing
description: The fast checks, the database suites, the end-to-end stack and how a scenario becomes a test.
tags: [testing, japa, vitest, playwright, ci]
status: stable
generated: { by: opencode/deepseek-v4.1-flash-free, at: 2026-10-23T00:00:00Z }
---

# Testing

## The checks

Run from the repository root; each command fans out to every workspace.

| Command                | What it proves                                                               |
| ---------------------- | ---------------------------------------------------------------------------- |
| `npm run format:check` | Prettier can format every file                                               |
| `npm run lint`         | ESLint accepts every workspace                                               |
| `npm run typecheck`    | TypeScript accepts the API, the web app, the UI kit and the end-to-end suite |
| `npm test`             | The API, web, UI kit, core tools, installer and harness suites               |
| `npm run test:e2e`     | The journeys drive a real browser against the stack                          |

`npm run dev` is not needed for the first four.

## The suites

| Suite          | Path                                              | Needs a database | Command                            |
| -------------- | ------------------------------------------------- | ---------------- | ---------------------------------- |
| API unit       | `apps/api/tests/unit/`                            | no               | `node ace test unit`               |
| API functional | `apps/api/tests/functional/`                      | yes              | `node ace test functional`         |
| Web unit       | `apps/web/src/**/*.test.tsx`                      | no               | `vitest run`                       |
| UI kit         | `packages/ui/src/**/*.test.{ts,tsx}`              | no               | `vitest run`                       |
| Core tools     | `packages/core-tools/test/`                       | no               | `node --test "test/**/*.test.js"`  |
| Installer      | `packages/create-app/test/`                       | no               | `node --test "test/**/*.test.js"`  |
| Install script | `packages/create-app/test/install-script.test.js` | no               | `node --test "test/**/*.test.js"`  |
| Harness        | `plugins/dsh/scripts/`                            | no               | `node --test "scripts/*.test.mjs"` |
| End to end     | `e2e/specs/`                                      | the full stack   | `npm run test:e2e`                 |

The API functional tests use Japa and the `Browser` helper in
`apps/api/tests/helpers/browser.ts` to keep a signed-in session. The web tests use
Vitest and Testing Library; `apps/web/src/test/setup.ts` provides the browser APIs the
components touch.

The UI kit has its own Vitest setup, `packages/ui/src/test/setup.ts`. Its suite also
fails when a primitive has no story, imports the web app, or when a workflow or an image
builds Storybook. The core tools run on local fixtures and never reach the network.
The install script test runs `install.sh` with stub `curl` and `npm` on the `PATH`, and
its interactive case needs `python3` for a pseudo-terminal; it is skipped without it.

## The test database

The API suite uses `dash_test`, not the development database. Create it once:

```bash
docker compose exec db psql -U dash -d dash -c "CREATE DATABASE dash_test"
cd apps/api && NODE_ENV=test node ace migration:run --force
```

A worktree has its own database container, so it needs the same two commands once.

## The end-to-end stack

The journeys use a stack of their own, on other ports, so they never disturb the
development session:

```bash
docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d --wait
docker compose -f docker-compose.yml -f docker-compose.e2e.yml exec api node ace db:seed

npm run test:e2e
```

| Service    | URL                     |
| ---------- | ----------------------- |
| Web app    | <http://localhost:5174> |
| API        | <http://localhost:3334> |
| Mailpit    | <http://localhost:8026> |
| PostgreSQL | `localhost:5434`        |

`E2E_WEB_URL`, `E2E_MAILPIT_URL`, `E2E_CREEM_WEBHOOK_SECRET` and `E2E_DEMO_MODE` are
read from the root `.env` and override the defaults. `e2e/README.md` lists the helpers
and every journey.

## A scenario becomes a test

An OpenSpec change describes behavior as `#### Scenario:` blocks. Every scenario is
covered by at least one test before the change is archived:

- API behavior: a functional test under `apps/api/tests/functional/`.
- Web behavior: a colocated `*.test.tsx` next to the page or component.
- A journey across pages: a spec under `e2e/specs/`.

The review of a change maps each scenario to its test; a missing row is a failing
review.

## Continuous integration

`.github/workflows/ci.yml` runs the same checks on every pull request and on `main`:

| Job              | What it does                                                                                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lint-typecheck` | `node ace codegen`, format, lint, typecheck                                                                                                                                        |
| `test`           | Postgres service, migrations, `npm test`                                                                                                                                           |
| `build`          | `npm run build`; the web build must hold no Storybook asset                                                                                                                        |
| `e2e`            | The Compose stack, the seed, `npm run test:e2e`                                                                                                                                    |
| `installer`      | `shellcheck install.sh`; generates a project with the installer and checks it; then runs `core:check`, `remove:showcase` and both generators on it, with lint, typecheck and tests |

The commit gate runs a smaller, faster version of the same checks on the staged files;
[the harness](../harness.md) describes it.

## When a test fails

- **`Unexpected module status 3`** on the API tests: the Node version. Run `nvm use`.
- **`database "dash_test" does not exist`**: create it with the command above.
- **`relation "plans" does not exist`**: run the test migrations.
- **The web tests cannot find `File` or `FormData`**: the Vitest setup did not load;
  check `apps/web/vite.config.ts`.
- **Playwright finds no tests or cannot load them**: the dependencies of the worktree
  are missing. Run `npm ci` in the checkout that runs the suite.
