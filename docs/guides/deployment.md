---
type: Guide
title: Deployment
description: Build the production images, set the secrets, run the migrations and put TLS in front.
tags: [deployment, production, docker, nginx, operations]
status: stable
generated: { by: opencode/deepseek-v4.1-flash-free, at: 2026-10-23T00:00:00Z }
---

# Deployment

`docker-compose.prod.yml` builds optimized images and serves the whole product from
one origin: nginx serves the SPA and proxies `/api` and `/mcp` to the API.

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

The web app is then on <http://localhost:8080>.

## Before the first boot

Put the secrets in the root `.env` (or in the environment of the deployment):

| Variable                                   | Required    | What it is                                            |
| ------------------------------------------ | ----------- | ----------------------------------------------------- |
| `APP_KEY`                                  | yes         | The signing key. Compose refuses to start without it. |
| `BREVO_API_KEY`                            | yes         | The transactional email of the product.               |
| `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`    | for billing | The credentials and the webhook secret.               |
| `AI_PROVIDER` and the key of that provider | for AI      | Production refuses to boot on the stub.               |
| `APP_URL`, `WEB_URL`                       | yes         | The public origin of the product.                     |
| `DRIVE_DISK` and the S3 settings           | for uploads | Shared storage for the avatars.                       |

The API validates its configuration at boot: a missing value stops the container with
a message that names it. Read the container log before changing anything else.

## What the container does on boot

The entrypoint of the API runs:

```bash
node ace migration:run --force && node ace db:seed && node bin/server.js
```

Migrations and the seed of the plans run before the server accepts traffic. The seed
creates the catalog of plans; it does not create a demo account outside development.

The health check is `GET /api/v1/health`; the web container waits for it before it
starts.

## The single origin

The browser only talks to the origin of the web app. nginx serves the static files and
proxies `/api` and `/mcp` to the API, so the session cookies stay first-party and the
MCP clients use the same origin as the product.

Put your TLS terminator in front of port 8080 and set `APP_URL` and `WEB_URL` to the
public origin. The links of the emails use them, and so does the Creem webhook.

## Payments

In Creem, set the webhook URL to `<public-origin>/api/v1/webhooks/creem` and copy the
signing secret into `CREEM_WEBHOOK_SECRET`. Use `CREEM_ENV=live` in production; the
`test` environment never charges a card. The subscription is written only by a signed
webhook, never by the return of the checkout.

## Storage and data

- PostgreSQL lives in the `pgdata` volume. Back it up with `pg_dump`; the volume is
  the state of the product.
- The local disk of the API container is not durable across a rebuild. For avatars in
  production, register the S3 disk in `apps/api/config/drive.ts` and set `DRIVE_DISK`.
- The rate limiter and the sessions use the database, so a restart does not lose them.

## Scaling

The API is stateless apart from the disk. More than one instance needs shared storage
for the uploads and one database; the webhook endpoint can be hit on any instance. The
queue of the email is the database, so no worker is needed for the mail.

## Upgrades

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

The new API runs the pending migrations before it serves. A migration that destroys
data is not run automatically by this template: review it before the deploy and take a
backup. The release process of the installer is in the [README](../../README.md).

## A checklist

1. `APP_KEY`, `BREVO_API_KEY`, the Creem secrets and the AI provider are set.
2. `APP_URL` and `WEB_URL` are the public HTTPS origin.
3. The Creem webhook points at the public origin and its secret matches.
4. The database volume is backed up.
5. The uploads are on shared storage if there is more than one API instance.
6. `/api/v1/health` answers 200 through the proxy.
7. A real signup receives the verification email.
