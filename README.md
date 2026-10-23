# Dash Starter

A production-ready **AI SaaS starter**: accounts, organizations, billing, transactional email, a model-agnostic AI layer, in-app chat and an MCP server — wired together, in English and Spanish.

Use it as the starting point for your next AI product.

---

## What is inside

| Path                  | What it is                                                       |
| --------------------- | ---------------------------------------------------------------- |
| `apps/api`            | AdonisJS 7 API: auth, orgs, billing, email, AI, MCP, webhooks    |
| `apps/web`            | React 19 SPA: public site, dashboard, admin, chat, design system |
| `packages/create-app` | The `create-dash-starter` installer                              |
| `e2e`                 | Playwright end-to-end journeys against the running stack         |
| `plugins/dsh`         | The development harness: Claude Code agents, commands and hooks  |
| `docs`                | The OKF documentation bundle: guides and reference               |

Every external integration has a local fallback, so the whole product boots and the whole test suite passes **with zero third-party keys**:

| Integration | Local / test fallback                          | Production                              |
| ----------- | ---------------------------------------------- | --------------------------------------- |
| Email       | Mailpit (SMTP) in dev, in-memory fake in tests | Brevo transactional API                 |
| Payments    | Creem test mode + signed simulated webhooks    | Creem live                              |
| AI          | Deterministic stub provider                    | Any configured provider                 |
| Storage     | Local disk                                     | Local disk, or the S3 disk you register |

---

## Documentation

The documentation is an [OKF v0.2](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) bundle in [`docs/`](docs/index.md): markdown with YAML frontmatter, readable by people and agents, and diffable in git.

| Start here                                                                                   | What it covers                                                     |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [What you get](docs/guides/what-you-get.md)                                                  | The product the template ships, feature by feature.                |
| [Getting started](docs/guides/getting-started.md)                                            | From a fresh clone to a signed-in account.                         |
| [Configuration](docs/guides/configuration.md)                                                | The environment files, mail, payments, AI, storage and secrets.    |
| [Customizing](docs/guides/customizing.md)                                                    | Name, palette, locales, removing features and the first change.    |
| [Testing](docs/guides/testing.md)                                                            | The suites, the test database and the end-to-end stack.            |
| [Deployment](docs/guides/deployment.md)                                                      | The production images, secrets, migrations and TLS.                |
| [Troubleshooting](docs/guides/troubleshooting.md)                                            | The failures a new checkout hits first.                            |
| [Architecture](docs/architecture.md)                                                         | The map of the repository and the file to imitate for each change. |
| [AI](docs/ai.md), [Billing](docs/billing.md), [MCP](docs/mcp.md), [Harness](docs/harness.md) | The internals of each integration.                                 |

---

## Requirements

- Node.js 24.22.1 or newer (`nvm use` reads `.nvmrc`; 24.2.0 crashes the API tests with
  `Unexpected module status 3`, and 22.x lacks the module hooks the TypeScript loader needs)
- Docker with Compose v2 (for the local stack)
- npm 10 or newer (workspaces)

---

## Quick start

```bash
git clone <your-repo> my-product
cd my-product
npm install

# Create the environment files
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

Generate a signing key for the API and for Compose:

```bash
cd apps/api && node ace generate:key --force
cd ../.. && node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"   # paste into the root .env as APP_KEY
```

Then boot the stack:

```bash
docker compose up -d
```

| Service       | URL                                         |
| ------------- | ------------------------------------------- |
| Web app       | http://localhost:5173                       |
| API           | http://localhost:3333                       |
| API health    | http://localhost:3333/api/v1/health         |
| Mailpit inbox | http://localhost:8025                       |
| Postgres      | `localhost:5433` (`dash` / `dash` / `dash`) |

The API container installs the dependencies and runs the migrations before it serves, so the web app starts on a database that is ready. Seed the default plans once:

```bash
docker compose exec api node ace db:seed
```

In development the seed also creates a demo account (`demo@example.test` / `supersecret`) with its own organization, so the product can be opened without signing up. The seeder is ignored in every other environment.

Sign up at http://localhost:5173/signup — the verification email lands in Mailpit.

### Running without Docker

```bash
npm run dev            # API on :3333, web on :5173
```

The Vite dev server proxies `/api` and `/mcp` to the API, so the browser only ever talks to one origin and session cookies stay first-party. Point `DB_*` in `apps/api/.env` at your own Postgres.

The API test suite uses a separate `dash_test` database. Create it once with:

```bash
docker compose exec db psql -U dash -d dash -c "CREATE DATABASE dash_test"
cd apps/api && NODE_ENV=test node ace migration:run --force
```

---

## Commands

Run at the repository root; each one fans out to every workspace.

| Command                | What it does                                       |
| ---------------------- | -------------------------------------------------- |
| `npm run dev`          | Start the API and the web app with hot reload      |
| `npm run build`        | Build the API and the web app                      |
| `npm run lint`         | Lint every workspace                               |
| `npm run format`       | Format every workspace with Prettier               |
| `npm run format:check` | Check formatting without writing                   |
| `npm run typecheck`    | Type-check every workspace                         |
| `npm test`             | Run the test suite of every workspace              |
| `npm run test:e2e`     | Run the Playwright suite against the running stack |

---

## End-to-end tests

The journeys live in `e2e/` and drive a real browser against the real stack: the API, the database, Mailpit and a signed webhook of the payment provider. They need the stack up, so they use their own ports and never touch the ones of your development session.

```bash
docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d --wait
docker compose -f docker-compose.yml -f docker-compose.e2e.yml exec api node ace db:seed

npm run test:e2e
```

| Service    | URL                   |
| ---------- | --------------------- |
| Web app    | http://localhost:5174 |
| API        | http://localhost:3334 |
| Mailpit    | http://localhost:8026 |
| PostgreSQL | localhost:5434        |

`e2e/README.md` documents the helpers, the variables (`E2E_WEB_URL`, `E2E_MAILPIT_URL`, `E2E_CREEM_WEBHOOK_SECRET`) and the journeys.

### The ports of the stack

The name of the Compose project and the ports the host publishes are variables, so a worktree can run its own stack next to yours. The defaults are the ones above.

| Variable                   | Default        | What it is                            |
| -------------------------- | -------------- | ------------------------------------- |
| `DEV_COMPOSE_PROJECT_NAME` | `dash-starter` | The name of the development stack     |
| `DB_HOST_PORT`             | `5433`         | The port of PostgreSQL                |
| `MAILPIT_HOST_PORT`        | `8025`         | The web UI of the catcher of the mail |
| `SMTP_HOST_PORT`           | `1025`         | The SMTP of the catcher of the mail   |
| `API_HOST_PORT`            | `3333`         | The API                               |
| `WEB_HOST_PORT`            | `5173`         | The web app                           |

`COMPOSE_PROJECT_NAME` is the override of Compose itself: when it is set, it names every stack of the machine.

The end-to-end stack has the same variables with the `E2E_` prefix: `E2E_COMPOSE_PROJECT_NAME` (`dash-e2e`), `E2E_DB_HOST_PORT` (`5434`), `E2E_MAILPIT_HOST_PORT` (`8026`), `E2E_SMTP_HOST_PORT` (`1026`), `E2E_API_HOST_PORT` (`3334`) and `E2E_WEB_HOST_PORT` (`5174`).

The harness gives a feature its own worktree, with its own branch, its own environment files and its own stack:

```bash
node plugins/dsh/scripts/worktree.mjs add <change-id> <slot>
cd .claude/worktrees/<change-id>
docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d --wait
```

The slot takes the base port plus ten times the slot, so slot 1 and slot 2 never fight for a port. `node plugins/dsh/scripts/worktree.mjs remove <change-id> <slot>` takes the worktree, its stack and its branch down. `docs/harness.md` explains the whole harness.

---

## Configuration

All API configuration lives in `apps/api/.env` and is validated at boot: a missing or malformed value stops the API with a message naming the variable. See `apps/api/.env.example` for the full list.

The variables you are most likely to change:

| Variable                                 | Meaning                                                                                                                                              |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `APP_KEY`                                | Signing key. Required.                                                                                                                               |
| `APP_URL`                                | Public URL of the API, used to build links in emails.                                                                                                |
| `DEFAULT_LOCALE`                         | `en` or `es`.                                                                                                                                        |
| `MAIL_TRANSPORT`                         | `smtp`, `brevo` or `fake`.                                                                                                                           |
| `BREVO_API_KEY`                          | Required in production.                                                                                                                              |
| `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`  | Creem credentials and the webhook signing secret.                                                                                                    |
| `AI_PROVIDER`                            | Default provider of the aliases: `stub`, `anthropic`, `openai`, `google`, `deepseek`, `openrouter`, `qwen`, `kimi`, `glm`, `ollama` or `compatible`. |
| `AI_CHAT_PROVIDER`, `AI_CHAT_MODEL` etc. | The provider and the model of each alias.                                                                                                            |

See `docs/ai.md`, `docs/billing.md` and `docs/mcp.md` for the details of each integration.

---

## Color palettes

The product ships six palettes: `line` (the default), `ink`, `ocean`, `forest`, `plum` and `ember`. Each one is a full set of design tokens for light and dark mode in `apps/web/src/styles/palettes.css`; components only read tokens, so a palette re-colours everything without code changes.

**Choose the palette of the product.** Every visitor sees one default palette. The installer asks for it (`--palette <id>`); to change it later, edit one line in `apps/web/src/lib/palettes.ts`:

```ts
export const DEFAULT_PALETTE: PaletteId = 'ocean'
```

An id that does not exist fails `npm run typecheck`.

**Signed-in users.** The top bar of the dashboard has the palette picker. A pick applies at once, is saved in the account (`users.palette`) and follows the user to every device; it overrides the default for that user only. A user who never picked one sees the default.

**Demo mode.** `DEMO_MODE=true` in the root `.env` shows a palette picker on the public site, so visitors without an account can try every palette. Their pick is remembered in their browser only; signing in replaces it with the palette saved in the account, or with the default. The template runs with it on; the installer turns it off in every new project. The web app reads it as `VITE_DEMO_MODE`, at dev-server start in Compose and at build time in the production image, so changing it needs a restart or a rebuild.

**Add a palette.** Add a light block (`[data-palette='<id>']`) and a dark block (`.dark[data-palette='<id>'], .dark [data-palette='<id>']`) to `palettes.css` with every token of the `line` blocks, add the id to `PALETTE_IDS`, its name to the `palette…` keys in `src/locales/{en,es}/common.ts` and the id to the `palette` enum of `apps/api/app/validators/profile.ts`. `npm test` fails until the palette defines every token, meets WCAG AA contrast and keeps its six station colours apart.

---

## The installer

```bash
npx create-dash-starter my-product
```

The installer downloads the template release matching its own version, rebrands every placeholder, writes the `.env` files with fresh secrets, initializes git with the commit gate of `.githooks` and — optionally — creates a GitHub repository and boots the stack.

Flags (all optional, all work with `--yes` for a non-interactive run):

```
--name <name>          Product name, e.g. "Acme AI"
--slug <slug>          Kebab-case slug, e.g. acme-ai
--description <text>   One-line description
--locale <en|es>       Default locale
--palette <id>         Default color palette: line, ink, ocean, forest, plum or ember
--email <address>      Support email
--template <path|url>  Use a local directory instead of the published release
--yes                  Accept every default without prompting
--no-install           Skip `npm install`
--no-boot              Skip `docker compose up`
--no-git               Skip `git init`
--github               Create a private GitHub repository with `gh`
```

### Releases

The installer and the template are released together: the version of the installer is the version of the template, and the installer downloads the release tagged `v<version>`. To publish a new version, bump the version of the root `package.json`, the version of `packages/create-app/package.json` and the version of `packages/create-app/template.json`, then tag the commit:

```bash
npm version 0.2.0 --workspaces --include-workspace-root --no-git-tag-version
git tag v0.2.0
git push origin v0.2.0
```

The tag is what the installer resolves, so a tag that does not exist makes the installer fail with a clear message instead of generating a project from an older release.

---

## Deployment

`docker-compose.prod.yml` builds optimized images, runs migrations before the API accepts traffic and serves the SPA, `/api` and `/mcp` from a single origin behind nginx.

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

The web app is then on http://localhost:8080.

---

## Project layout

```
apps/api
  app/            controllers, models, services, tools, mails, middleware
  config/         app, auth, database, mail, limiter, drive, ai
  database/       migrations and seeders
  resources/lang/ en and es message catalogs
  start/          env, kernel, routes
  tests/          Japa unit and functional suites
apps/web
  src/components/ ui primitives and patterns
  src/pages/      one page per route
  src/lib/        the typed API client and the hooks of each feature
  src/locales/    en and es translation catalogs
packages/create-app   the installer
plugins/dsh           the development harness: agents, commands, guardrails
e2e                   Playwright journeys and helpers
docs                  the OKF bundle: guides and reference
```

---

## Contributing

```bash
npm run lint && npm run format:check && npm run typecheck && npm test
```

`npm install` points git at `.githooks` (the `prepare` script), so every commit passes through `.githooks/pre-commit`: the staged files are formatted, linted, typechecked and tested, and a staged secret is refused. `git commit --no-verify` skips it. `docs/harness.md` describes the gate and the rest of the harness.

Changes land as conventional commits. The template is a starting point: delete what you do not need.
