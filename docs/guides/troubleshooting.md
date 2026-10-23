---
type: Guide
title: Troubleshooting
description: The failures a new checkout hits first, and the fix for each one.
tags: [troubleshooting, errors, docker, node, mail]
status: stable
generated: { by: opencode/deepseek-v4.1-flash-free, at: 2026-10-23T00:00:00Z }
---

# Troubleshooting

## The API tests crash with `Unexpected module status 3`

The Node version. Run `nvm use`; the project needs 24.22.1 or newer, and 24.2.0 has the
bug. `node -v` must print 24.22.1 or a later patch.

## `database "dash_test" does not exist`

The API functional tests use their own database. Create it once:

```bash
docker compose exec db psql -U dash -d dash -c "CREATE DATABASE dash_test"
cd apps/api && NODE_ENV=test node ace migration:run --force
```

A worktree has its own database container; run the same commands against it.

## `relation "plans" does not exist`

The database is up but the schema or the seed is missing.

```bash
docker compose exec api node ace migration:run --force
docker compose exec api node ace db:seed
```

## The API stops at boot naming a variable

The configuration is validated at boot. The variable is missing or malformed in
`apps/api/.env` (or in the environment of the container). `APP_KEY` is the usual one:
generate it with `node ace generate:key --force`.

## A port is already in use

Another stack, a worktree or a local service holds it. Change the published ports in
the root `.env` (`DB_HOST_PORT`, `MAILPIT_HOST_PORT`, `SMTP_HOST_PORT`, `API_HOST_PORT`,
`WEB_HOST_PORT`) and bring the stack up again. A worktree uses its own slot and does
not fight for the defaults.

## The verification email never arrives

- Local: open Mailpit at <http://localhost:8025>. If it is empty, check
  `MAIL_TRANSPORT=smtp` and `SMTP_HOST` (inside Compose it is `mailpit`, not
  `localhost`).
- Production: `MAIL_TRANSPORT=brevo` and a verified sender in Brevo.
- The link opens the web app. If the ports changed, `APP_URL` and `WEB_URL` must change
  with them, or the link points at the wrong origin.

## The invitation link opens the wrong origin

Same cause: `APP_URL` (the public web origin) and `WEB_URL` (the origin the API sends
the browser to) must match the stack the browser reaches. Restart the API after the
change.

## The AI answers with fixed text

`AI_PROVIDER=stub` is the default outside production. Point the alias at a provider
and a model in `apps/api/.env` and add that provider's key. In production the API
refuses to boot on the stub, on purpose. See [the AI reference](../ai.md).

## The palette picker does not appear

It only exists in demo mode. `DEMO_MODE=true` in the root `.env`, then restart the web
dev server or rebuild the production image: the value is read at start, not on reload.

## Payments stay in `processing`

The subscription is written by the webhook, not by the return of the checkout. Check
that Creem can reach `<public-origin>/api/v1/webhooks/creem`, that
`CREEM_WEBHOOK_SECRET` matches, and that the API log shows the event. Locally, expose
the API with a tunnel; the end-to-end suite simulates a signed webhook instead.

## The web app loads but every request fails

Check <http://localhost:3333/api/v1/health>. If the API is down, `docker compose ps`
and the API log say why. If the API is up, the web dev server must proxy `/api` and
`/mcp`; opening the web app from a different origin than the configured one breaks the
session cookies.

## The installer cannot download the template

The installer downloads the release tagged with its own version. If the tag does not
exist, use `--template <path>` with a local checkout, or install a published version.
A failed install leaves no half-written project: the installer writes into a new
directory.

## Start over

The development database is disposable. To keep the schema and lose the data, recreate
the database volume and boot again; to keep the data, do not remove the volume. In
production, never remove the volume without a backup: it holds every organization,
subscription and login.
