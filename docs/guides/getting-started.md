---
type: Guide
title: Getting started
description: From a fresh clone or the installer to a running product with a signed-in account.
tags: [install, setup, docker, quickstart]
status: stable
generated: { by: opencode/deepseek-v4.1-flash-free, at: 2026-10-23T00:00:00Z }
---

# Getting started

## What you need

- Node.js 24.22.1 or newer. `nvm use` reads `.nvmrc`; Node 24.2.0 crashes the API
  tests and Node 22 lacks the module hooks the TypeScript loader needs.
- Docker with Compose v2.
- npm 10 or newer.

## 1. Create the project

With the installer, which rebrands the template, writes the secrets and can boot the
stack:

```bash
npx create-dash-starter my-product
cd my-product
```

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

## 4. Sign in

Open <http://localhost:5173>, sign up, and read the verification email in Mailpit.
Or sign in with the demo account.

The verification link opens the web app, so the stack must be the one the browser
reaches: changing the ports changes `APP_URL`, `WEB_URL` and `E2E_WEB_URL` too.

## 5. Run the checks

```bash
npm run lint && npm run format:check && npm run typecheck && npm test
```

That needs the `dash_test` database. [Testing](./testing.md) creates it.

## Next steps

- [What you get](./what-you-get.md): a tour of the product.
- [Configuration](./configuration.md): mail, payments, AI, storage.
- [Customizing](./customizing.md): name, palette, locales, features.
- [Extending](./extending.md): features and components outside the core.
- [Architecture](../architecture.md): read this before the first change.
