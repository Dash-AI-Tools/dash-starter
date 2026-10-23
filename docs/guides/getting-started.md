---
type: Guide
title: Getting started
description: From the install script or a clone to a running product with a signed-in account, and the commands of the repository.
tags: [install, setup, docker, quickstart, commands]
status: stable
generated: { by: opencode/deepseek-v4.1-flash-free, at: 2026-10-23T00:00:00Z }
---

# Getting started

## What you need

- Node.js 24.22.1 or newer. `nvm use` reads `.nvmrc`; Node 24.2.0 crashes the API
  tests with `Unexpected module status 3` and Node 22 lacks the module hooks the
  TypeScript loader needs.
- Docker with Compose v2.
- npm 10 or newer, for the workspaces.

## 1. Create the project

With the installer, which rebrands the template, writes the secrets and can boot the
stack:

```bash
curl -fsSL https://raw.githubusercontent.com/Dash-AI-Tools/dash-starter/main/install.sh | bash -s -- my-product
cd my-product
```

The script downloads the latest release of the template once, into a temporary
directory it removes on exit, installs the installer of that release and runs it with
every argument you gave. The questions are asked in your terminal. Every flag is
optional; `curl -fsSL … | bash -s -- --help` prints them.

To read the script before it runs:

```bash
curl -fsSLo install.sh https://raw.githubusercontent.com/Dash-AI-Tools/dash-starter/main/install.sh
less install.sh
bash install.sh my-product
```

| Variable             | What it does                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `DASH_VERSION`       | The release to install, for example `DASH_VERSION=0.1.0`. Default: the latest GitHub release.                                  |
| `DASH_TEMPLATE_REPO` | A fork, as `github:owner/repo`. The script downloads the release from it, and the project records it as the source of updates. |

The variables go before `bash`, so the script sees them:
`curl -fsSL … | DASH_VERSION=0.1.0 bash -s -- my-product`.

- **Prerequisites.** `curl`, `tar`, `npm`, and Node at least the version of the
  `.nvmrc` of the release. The script checks them before it creates anything. `git`
  and Docker are optional: without `git` the project gets no repository and no first
  commit, and without Docker the stack is not booted.
- **Windows.** Run the one-liner in WSL.
- **Without a terminal** (CI, a script), the questions cannot be asked: pass `--yes`
  and the flags of the project, or the script stops before it downloads anything.

The installer also writes the update metadata of the project: the release it came from,
the identity it applied and a checksum of every core file. It holds no secret, the
installer's first commit includes it, and it is what `npm run core:update` reads. Keep it
committed; [updating](./updating.md) explains it.

Or from a clone of the template (a clone has no update metadata, so it cannot run
`npm run core:update`):

```bash
git clone <your-repo> my-product
cd my-product
npm install
```

## 2. Write the environment files

From a clone, copy both templates:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

The root `.env` holds the secrets and the ports of Compose; `apps/api/.env` holds the
configuration the API reads when it runs on the host. Inside Compose the API reads
`apps/api/.env.docker` and takes `APP_KEY` from the root.

Generate the signing key of the API:

```bash
cd apps/api && node ace generate:key --force && cd ../..
```

Generate the `APP_KEY` of the root `.env` (Compose needs its own value):

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

Paste the output as `APP_KEY` in `.env`.

## 3. Boot the stack

```bash
docker compose up -d --wait
```

| Service       | URL                                         |
| ------------- | ------------------------------------------- |
| Web app       | <http://localhost:5173>                     |
| API           | <http://localhost:3333>                     |
| API health    | <http://localhost:3333/api/v1/health>       |
| Mailpit inbox | <http://localhost:8025>                     |
| PostgreSQL    | `localhost:5433` (`dash` / `dash` / `dash`) |

The API container installs the dependencies and runs the migrations before it serves,
so the first start takes a few minutes. Wait for `docker compose ps` to report every
service as healthy.

Seed the plans once:

```bash
docker compose exec api node ace db:seed
```

In development the seed also creates a demo account: `demo@example.test` /
`supersecret`, with its own organization. The demo data is ignored in every other
environment.

### Without Docker

```bash
npm run dev            # API on :3333, web on :5173
```

Point `DB_*` in `apps/api/.env` at your own Postgres. The Vite dev server proxies `/api`
and `/mcp` to the API, so the browser only ever talks to one origin and the session
cookies stay first-party.

## 4. Sign in

Open <http://localhost:5173>, sign up at <http://localhost:5173/signup>, and read the
verification email in Mailpit. Or sign in with the demo account.

The verification link opens the web app, so the stack must be the one the browser
reaches: changing the ports changes `APP_URL`, `WEB_URL` and `E2E_WEB_URL` too.

## 5. Run the checks

```bash
npm run lint && npm run format:check && npm run typecheck && npm test
```

That needs the `dash_test` database. [Testing](./testing.md) creates it.

`npm install` points git at `.githooks` (the `prepare` script), so every commit passes
through `.githooks/pre-commit`: the staged files are formatted, linted, typechecked and
tested, and a staged secret is refused. `git commit --no-verify` skips it;
[the harness](../harness.md) describes the gate. Changes land as conventional commits.

## The commands

Run at the repository root; each one fans out to every workspace.

| Command                            | What it does                                                              |
| ---------------------------------- | ------------------------------------------------------------------------- |
| `npm run dev`                      | Start the API and the web app with hot reload                             |
| `npm run build`                    | Build the API and the web app                                             |
| `npm run lint`                     | Lint every workspace                                                      |
| `npm run format`                   | Format every workspace with Prettier                                      |
| `npm run format:check`             | Check formatting without writing                                          |
| `npm run typecheck`                | Type-check every workspace                                                |
| `npm test`                         | Run the test suite of every workspace                                     |
| `npm run test:e2e`                 | Run the Playwright suite against the running stack                        |
| `npm run storybook`                | Serve the stories of the UI kit on <http://localhost:6006> (local only)   |
| `npm run make:feature -- <name>`   | Scaffold a feature in the API and the web app, outside the core           |
| `npm run make:component -- <name>` | Scaffold a component, its test and its story in `packages/ui/src/custom/` |
| `npm run remove:showcase`          | Remove the in-app component showcase                                      |
| `npm run core:check`               | Report what a core update would change, without writing                   |
| `npm run core:update`              | Update the core files from a template release                             |

The core tools take their arguments after `--`, for example
`npm run core:check -- --to 0.2.0`. Each prints its options with `--help`.
[Extending](./extending.md) covers the generators, [customizing](./customizing.md#remove-the-showcase)
the showcase removal and [updating](./updating.md) the core update.

## Next steps

- [What you get](./what-you-get.md): a tour of the product.
- [Configuration](./configuration.md): mail, payments, AI, storage.
- [Customizing](./customizing.md): name, palette, locales, features.
- [Extending](./extending.md): features and components outside the core.
- [Architecture](../architecture.md): read this before the first change.
