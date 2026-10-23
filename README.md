# Dash Starter

A production-ready **AI SaaS starter**: accounts, organizations, billing, transactional email, a model-agnostic AI layer, in-app chat and an MCP server — wired together, in English and Spanish.

The monorepo holds the API (`apps/api`, AdonisJS 7), the web app (`apps/web`, React 19), the UI kit (`packages/ui`), the core update and the generators (`packages/core-tools`), the end-to-end journeys (`e2e`), the development harness (`plugins/dsh`) and the documentation (`docs`). Every external integration has a local fallback, so the product boots and the test suite passes with zero third-party keys. [What you get](docs/guides/what-you-get.md) tours the product; [architecture](docs/architecture.md) maps the code.

---

## Quick start

Requirements:

- Node.js per `.nvmrc`: run `nvm use` before any install or command.
- Docker with Compose v2.
- npm 10 or newer.

In a checkout of the project:

```bash
nvm use
npm install
cp .env.example .env
cp apps/api/.env.example apps/api/.env
(cd apps/api && node ace generate:key --force)
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"   # paste into the root .env as APP_KEY

docker compose up -d --wait
docker compose exec api node ace db:seed
```

| Service       | URL                                         |
| ------------- | ------------------------------------------- |
| Web app       | http://localhost:5173                       |
| API           | http://localhost:3333                       |
| API health    | http://localhost:3333/api/v1/health         |
| Mailpit inbox | http://localhost:8025                       |
| Postgres      | `localhost:5433` (`dash` / `dash` / `dash`) |

Sign up at http://localhost:5173/signup and read the verification email in Mailpit, or sign in with the demo account `demo@example.test` / `supersecret`. To run the API and the web app on the host instead, point `DB_*` in `apps/api/.env` at a Postgres and run `npm run dev`.

[Getting started](docs/guides/getting-started.md) explains each step, the commands and the checks.

---

## The installer

Create a new product from the latest release of the template:

```bash
curl -fsSL https://raw.githubusercontent.com/Dash-AI-Tools/dash-starter/main/install.sh | bash -s -- my-product
```

[`packages/create-app/README.md`](packages/create-app/README.md) lists the flags, the environment variables, the prerequisites and the release contract.

---

## Documentation

The documentation is an [OKF v0.2](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) bundle in [`docs/`](docs/index.md): markdown with YAML frontmatter, readable by people and agents.

| Page                                              | What it covers                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [Index](docs/index.md)                            | The entry point of the bundle and the five-minute path.                              |
| [Guides](docs/guides/index.md)                    | The list of the guides.                                                              |
| [What you get](docs/guides/what-you-get.md)       | The product, feature by feature, the repository and the local fallbacks.             |
| [Getting started](docs/guides/getting-started.md) | From the installer or a clone to a signed-in account; the commands and the checks.   |
| [Configuration](docs/guides/configuration.md)     | The environment files, the ports of the stack, mail, payments, AI, storage, secrets. |
| [Customizing](docs/guides/customizing.md)         | Name, palettes, locales, removing features and the showcase, the first change.       |
| [Extending](docs/guides/extending.md)             | The feature registries, `make:feature`, `make:component` and Storybook.              |
| [Updating](docs/guides/updating.md)               | The update metadata, `core:check` and `core:update`.                                 |
| [Testing](docs/guides/testing.md)                 | The suites, the test database, the end-to-end stack and CI.                          |
| [Deployment](docs/guides/deployment.md)           | The production images, secrets, migrations and TLS.                                  |
| [Troubleshooting](docs/guides/troubleshooting.md) | The failures a new checkout hits first.                                              |
| [Architecture](docs/architecture.md)              | The map of the repository, the layout and the file to imitate for each change.       |
| [AI](docs/ai.md)                                  | The aliases, the providers, the quotas, the images and the errors.                   |
| [Billing](docs/billing.md)                        | The plans, Creem, the webhook, the price sync and the emails.                        |
| [MCP](docs/mcp.md)                                | The endpoint, the API keys, the scopes and every tool.                               |
| [Harness](docs/harness.md)                        | The `dsh` plugin: agents, commands, guardrails, the commit gate and the worktrees.   |
| [Change log](docs/log.md)                         | The changes to the documentation, newest first.                                      |
| [The installer](packages/create-app/README.md)    | Flags, environment variables, the update metadata and the releases.                  |
