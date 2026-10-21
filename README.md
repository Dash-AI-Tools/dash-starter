# Dash Starter

A production-ready **AI SaaS starter**: accounts, organizations, billing, transactional email, a model-agnostic AI layer, in-app chat and an MCP server — wired together, in English and Spanish.

Use it as the starting point for your next AI product, or run the installer to generate a rebranded project in one command.

```bash
npx create-dash-starter my-product
```

---

## What is inside

| Path | What it is |
| --- | --- |
| `apps/api` | AdonisJS 7 API: auth, orgs, billing, email, AI, MCP, webhooks |
| `apps/web` | React 19 SPA: public site, dashboard, admin, chat, design system |
| `packages/create-app` | The `create-dash-starter` installer |
| `e2e` | Playwright end-to-end journeys against the running stack |

Every external integration has a local fallback, so the whole product boots and the whole test suite passes **with zero third-party keys**:

| Integration | Local / test fallback | Production |
| --- | --- | --- |
| Email | Mailpit (SMTP) in dev, in-memory fake in tests | Brevo transactional API |
| Payments | Creem test mode + signed simulated webhooks | Creem live |
| AI | Deterministic stub provider | Any configured provider |
| Storage | Local disk | S3-compatible |

---

## Requirements

- Node.js 22 or newer
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
node ace generate:key --force --name=APP_KEY   # run inside apps/api
```

Then boot the stack:

```bash
docker compose up -d
```

| Service | URL |
| --- | --- |
| Web app | http://localhost:5173 |
| API | http://localhost:3333 |
| API health | http://localhost:3333/api/v1/health |
| Mailpit inbox | http://localhost:8025 |
| Postgres | `localhost:5433` (`dash` / `dash` / `dash`) |

Run the migrations and seed the default plans:

```bash
docker compose exec api node ace migrate --force
docker compose exec api node ace db:seed --force
```

Sign up at http://localhost:5173/signup — the verification email lands in Mailpit.

### Running without Docker

```bash
npm run dev            # API on :3333, web on :5173
```

The Vite dev server proxies `/api` and `/mcp` to the API, so the browser only ever talks to one origin and session cookies stay first-party. Point `DB_*` in `apps/api/.env` at your own Postgres.

---

## Commands

Run at the repository root; each one fans out to every workspace.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the API and the web app with hot reload |
| `npm run build` | Build the API and the web app |
| `npm run lint` | Lint every workspace |
| `npm run format` | Format every workspace with Prettier |
| `npm run format:check` | Check formatting without writing |
| `npm run typecheck` | Type-check every workspace |
| `npm test` | Run the API (Japa) and web (Vitest) unit suites |
| `npm run test:e2e` | Run the Playwright suite against the running stack |

The API test database is `dash_test`. Create it once with:

```bash
createdb dash_test   # or: psql -U postgres -c "CREATE DATABASE dash_test"
```

---

## Configuration

All API configuration lives in `apps/api/.env` and is validated at boot: a missing or malformed value stops the API with a message naming the variable. See `apps/api/.env.example` for the full list.

The variables you are most likely to change:

| Variable | Meaning |
| --- | --- |
| `APP_KEY` | Signing key. Required. |
| `APP_URL` | Public URL of the API, used to build links in emails. |
| `DEFAULT_LOCALE` | `en` or `es`. |
| `MAIL_TRANSPORT` | `smtp`, `brevo` or `fake`. |
| `BREVO_API_KEY` | Required in production. |
| `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET` | Creem credentials and the webhook signing secret. |
| `AI_PROVIDER` | `stub`, `anthropic`, `openai`, `google`, `deepseek`, `openrouter` or `compatible`. |
| `AI_CHAT_MODEL` etc. | Alias → model mapping, as `<provider>:<model-id>`. |

See `docs/ai.md`, `docs/billing.md` and `docs/mcp.md` for the details of each integration.

---

## The installer

```bash
npx create-dash-starter my-product
```

The installer downloads the template release matching its own version, rebrands every placeholder, writes the `.env` files with fresh secrets, initializes git and — optionally — creates a GitHub repository and boots the stack.

Flags (all optional, all work with `--yes` for a non-interactive run):

```
--name <name>          Product name, e.g. "Acme AI"
--slug <slug>          Kebab-case slug, e.g. acme-ai
--description <text>   One-line description
--locale <en|es>       Default locale
--email <address>      Support email
--template <path|url>  Use a local directory instead of the published release
--yes                  Accept every default without prompting
--no-install           Skip `npm install`
--no-boot              Skip `docker compose up`
--no-git               Skip `git init`
--github               Create a private GitHub repository with `gh`
```

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
  src/features/   auth, organizations, billing, chat, api-keys, profile
  src/locales/    en and es translation catalogs
  src/routes/     react-router route modules
packages/create-app   the installer
e2e                   Playwright journeys and helpers
```

---

## Contributing

```bash
npm run lint && npm run format:check && npm run typecheck && npm test
```

Changes land as conventional commits. The template is a starting point: delete what you do not need.
