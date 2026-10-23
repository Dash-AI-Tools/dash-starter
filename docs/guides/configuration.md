---
type: Guide
title: Configuration
description: The two environment files, the variables that matter, the ports of the stack and when a change needs a restart or a rebuild.
tags: [configuration, environment, secrets, docker]
status: stable
generated: { by: opencode/deepseek-v4.1-flash-free, at: 2026-10-23T00:00:00Z }
---

# Configuration

There are two environment files. They are not interchangeable.

| File            | Read by                           | Holds                                                                                 |
| --------------- | --------------------------------- | ------------------------------------------------------------------------------------- |
| `.env`          | Docker Compose, on the host       | `APP_KEY` of Compose, `APP_URL`, `SUPPORT_EMAIL`, `DEMO_MODE`, project name and ports |
| `apps/api/.env` | The API, when it runs on the host | Everything the API validates at boot                                                  |

Inside Compose the API reads `apps/api/.env.docker` instead, and Compose injects
`APP_KEY` from the root `.env`. The database host is `db` and the SMTP host is
`mailpit` there, not `localhost`.

Every value is validated at boot: a missing or malformed variable stops the API with
a message naming it. `apps/api/.env.example` is the full list.

## The variables you are most likely to change

| Variable                                | Meaning                                                                                                                                              |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `APP_KEY`                               | Signing key. Required. Generate with `node ace generate:key --force`.                                                                                |
| `APP_URL`                               | Public origin of the web app, used in the links of the emails.                                                                                       |
| `WEB_URL`                               | Origin the API sends the browser to, for example after an invitation.                                                                                |
| `DEFAULT_LOCALE`                        | `en` or `es`. New visitors start in this language.                                                                                                   |
| `DB_*`                                  | PostgreSQL. The Compose defaults are `dash` / `dash` / `dash` on port 5433.                                                                          |
| `MAIL_TRANSPORT`                        | `smtp` (Mailpit locally), `brevo` (production) or `fake` (in-memory, tests).                                                                         |
| `MAIL_FROM`, `MAIL_FROM_NAME`           | The sender of every transactional email.                                                                                                             |
| `BREVO_API_KEY`                         | Required when `MAIL_TRANSPORT=brevo`.                                                                                                                |
| `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET` | Creem credentials and the secret that signs the webhooks.                                                                                            |
| `CREEM_ENV`                             | `test` outside production, `live` in production.                                                                                                     |
| `AI_PROVIDER`                           | Default provider of the aliases: `stub`, `anthropic`, `openai`, `google`, `deepseek`, `openrouter`, `qwen`, `kimi`, `glm`, `ollama` or `compatible`. |
| `AI_CHAT_PROVIDER`, `AI_CHAT_MODEL`     | The provider and the model of the `chat` alias; the other aliases follow the same pattern.                                                           |
| `DRIVE_DISK`                            | `local` or the S3 disk you register. Used by the avatars.                                                                                            |
| `LIMITER_STORE`                         | `database` by default; the store of the rate limiter.                                                                                                |
| `DEMO_MODE`                             | Root `.env` only. Shows the palette picker on the public site.                                                                                       |

The provider keys (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`,
`DEEPSEEK_API_KEY`, `OPENROUTER_API_KEY`, `QWEN_API_KEY`, `KIMI_API_KEY`, `GLM_API_KEY`,
`OLLAMA_*`, `COMPATIBLE_*`) are read only when an alias points at that provider.

## When a change takes effect

| Change                            | What it needs                                         |
| --------------------------------- | ----------------------------------------------------- |
| `apps/api/.env` on the host       | Restart `npm run dev`                                 |
| `apps/api/.env` in Compose        | Recreate the `api` service                            |
| Root `.env` ports or project name | `docker compose up -d` again                          |
| `DEMO_MODE`                       | Restart the web dev server, or rebuild the prod image |
| API code                          | Hot reload in development; rebuild in production      |
| Web code                          | Hot reload in development; rebuild in production      |

`DEMO_MODE` becomes `VITE_DEMO_MODE` at dev-server start or at build time, so it is
not read again on a page reload.

## The ports of the stack

The name of the Compose project and the ports the host publishes are variables of the
root `.env`, so a worktree can run its own stack next to yours.

| Variable                   | Default        | What it is                            |
| -------------------------- | -------------- | ------------------------------------- |
| `DEV_COMPOSE_PROJECT_NAME` | `dash-starter` | The name of the development stack     |
| `DB_HOST_PORT`             | `5433`         | The port of PostgreSQL                |
| `MAILPIT_HOST_PORT`        | `8025`         | The web UI of the catcher of the mail |
| `SMTP_HOST_PORT`           | `1025`         | The SMTP of the catcher of the mail   |
| `API_HOST_PORT`            | `3333`         | The API                               |
| `WEB_HOST_PORT`            | `5173`         | The web app                           |

`COMPOSE_PROJECT_NAME` is the override of Compose itself: when it is set, it names every
stack of the machine.

The end-to-end stack has the same variables with the `E2E_` prefix:
`E2E_COMPOSE_PROJECT_NAME` (`dash-e2e`), `E2E_DB_HOST_PORT` (`5434`),
`E2E_MAILPIT_HOST_PORT` (`8026`), `E2E_SMTP_HOST_PORT` (`1026`), `E2E_API_HOST_PORT`
(`3334`) and `E2E_WEB_HOST_PORT` (`5174`).

`node plugins/dsh/scripts/worktree.mjs add <change-id> <slot>` gives a feature its own
worktree, branch, environment files and stack, on the base ports plus ten times the
slot; [the harness](../harness.md#the-worktrees) explains it.

## Mail

- **Local and demo:** `MAIL_TRANSPORT=smtp` with Mailpit on port 1025; the inbox is
  <http://localhost:8025>.
- **Production:** `MAIL_TRANSPORT=brevo` and `BREVO_API_KEY`. The sender address must
  be verified in Brevo.
- **Tests:** `MAIL_TRANSPORT=fake`, which captures the messages in memory.

## Payments

The catalog of plans is in the database, the prices are mirrored in Creem, and the
subscription is written only by signed webhooks. Set the webhook URL in Creem to
`<public-origin>/api/v1/webhooks/creem` (the public origin of the API; in production
the web app and the API share one origin behind the proxy) and copy the signing secret
into `CREEM_WEBHOOK_SECRET`. See [billing](../billing.md).

## AI

`AI_PROVIDER=stub` is the default outside production and needs no key. In production an
unconfigured provider refuses to start, on purpose: a product does not ship on the
stub. See [the AI reference](../ai.md) for the aliases, the prices and the quotas.

## Storage

The avatars go to the disk named by `DRIVE_DISK`. `local` writes under `DRIVE_ROOT`;
the S3 disk is registered in `apps/api/config/drive.ts`. A production deployment with
more than one API instance needs shared storage.

## Secrets

`.env`, `apps/api/.env` and `.claude/dsh-allow` are ignored by git. The tracked
templates end in `.example`. Never commit a real key, a private key or a webhook
secret; the commit gate refuses the files it knows and the review is the second line.
