# End-to-end tests

The journeys of the product, driven with a real browser against the real stack: the API, the database, the catcher of the emails and the payment provider.

## The stack

The suite runs against the development stack with other ports, so both can live on the same machine. The `docker-compose.e2e.yml` file is the override that does it.

```bash
docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d
docker compose -f docker-compose.yml -f docker-compose.e2e.yml exec api node ace migration:run --force
docker compose -f docker-compose.yml -f docker-compose.e2e.yml exec api node ace db:seed
docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d --wait
```

The API is not healthy until the migrations run, because its probe reads the table of the sessions. That is why the stack is started, prepared and only then waited for.

| Service    | Port                  |
| ---------- | --------------------- |
| Web app    | http://localhost:5174 |
| API        | http://localhost:3334 |
| Mailpit    | http://localhost:8026 |
| PostgreSQL | localhost:5434        |

## Running the journeys

```bash
npm run test:e2e
```

The browser talks to the web app only: the dev server proxies `/api` and `/mcp` to the API, so the session cookies stay first-party.

| Variable                   | Default                 | Meaning                              |
| -------------------------- | ----------------------- | ------------------------------------ |
| `E2E_WEB_URL`              | `http://localhost:5174` | The origin of the web app            |
| `E2E_MAILPIT_URL`          | `http://localhost:8026` | The API of the catcher of the emails |
| `E2E_CREEM_WEBHOOK_SECRET` | `e2e-webhook-secret`    | The secret the signed webhooks carry |

## The journeys

| File                        | What it proves                                                 |
| --------------------------- | -------------------------------------------------------------- |
| `specs/auth.spec.ts`        | The signup, the verification of the address and the sign in    |
| `specs/onboarding.spec.ts`  | The setup of the organization and the invitation of a teammate |
| `specs/preferences.spec.ts` | The language of the site and the cookies                       |
| `specs/chat.spec.ts`        | The answer of the assistant and the rules of accessibility     |
| `specs/api-keys.spec.ts`    | A key of the API and a call to the MCP server                  |
| `specs/billing.spec.ts`     | A paid subscription, with a webhook signed by the provider     |

The helpers of `support/` know how to read the emails of the catcher, how to sign a webhook of the payment provider and how to check the accessibility of a page.
