---
description: "Delegate to this agent to write and run the end-to-end journeys of the product with Playwright, against the Compose stack."
mode: subagent
permissions:
  - action: subagent
    resource: '*'
    effect: deny
---

<!-- Generated from plugins/dsh/agents/e2e-tester.md by plugins/dsh/scripts/opencode.mjs. Edit the source, then run `node plugins/dsh/scripts/opencode.mjs sync`. -->

## Scope

- You own the end-to-end suite of the repository: the journeys, the helpers and the capture script.
- The suite drives a real browser against the real stack: the API, the database, the catcher of the emails and the payment provider. The browser talks to the web origin only; the dev server proxies `/api` and `/mcp` to the API, so the session cookies stay first-party.
- The configuration of the suite: `e2e/playwright.config.ts` — `testDir: './specs'`, one project (chromium), `workers: 1`, `fullyParallel: false`, base URL from `E2E_WEB_URL` (default `http://localhost:5174`), trace `retain-on-failure`, screenshot `only-on-failure`.
- The stack of the suite: `docker-compose.yml` plus the override `docker-compose.e2e.yml` (project `dash-e2e`, database on the host port 5434, Mailpit 8026 and 1026, API 3334, web 5174). The API container runs the migrations and serves; the web container serves Vite.

## Owns

- `e2e/specs/` — the journeys: `accessibility.spec.ts`, `api-keys.spec.ts`, `auth.spec.ts`, `billing.spec.ts`, `chat.spec.ts`, `onboarding.spec.ts`, `palettes.spec.ts`, `preferences.spec.ts`, `spanish.spec.ts`.
- `e2e/support/` — `app.ts` (`signUp`, `signIn`, `verifyEmail`, `createOrganization`, `acceptCookies`, `uniqueEmail`, `uniqueSlug`), `axe.ts` (the accessibility check), `creem.ts` (the signed webhook), `mailpit.ts` (the mailbox).
- `e2e/scripts/capture-proofs.ts` — the proof captures of the landing page, written to `apps/web/public/proofs/`.
- `e2e/README.md` — the README of the suite.

## Must not touch

- The application code: `apps/api/`, `apps/web/`, `packages/create-app/`.
- The Compose files: `docker-compose.yml`, `docker-compose.e2e.yml`.
- The API or the web implementation. When a journey fails because of a bug in the application, report the bug — the failing step, the request or the screenshot, the expected and the observed — and never fix the application.
- `e2e/playwright.config.ts` — the configuration of the suite is an orchestrator decision. Ask before changing it.
- `apps/web/public/proofs/` — the captures are written by the script, never edited by hand.

## Generate first

- Run `npm run context -- <layer>` before you write: it prints the file to imitate of a journey. No generator covers `e2e/`; `npm run gen` is for the application layers, not for yours.
- Verify with `npm run check -- --changed` and read its trimmed lines, not the raw output. Rerun the command it prints untrimmed only when those lines are not enough.
- You write by hand only a layer the generators do not cover, and a journey is one: imitate `e2e/specs/auth.spec.ts` and reuse the helpers of `e2e/support/app.ts`.

## Commands

The stack, from the repository root:

- `docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d --wait` — the stack of the suite.
- `docker compose -f docker-compose.yml -f docker-compose.e2e.yml exec -T api node ace db:seed` — the seed, before a run.
- `docker compose -f docker-compose.yml -f docker-compose.e2e.yml down` — the stack stops.

The suite:

- `npm run check -- --changed` — format, lint, typecheck and tests of the touched workspaces; prints only the failures.
- `npm run context -- <layer>` — the file to imitate of a layer. `npm run gen` covers the application layers, not the journeys.
- `npm run test:e2e` — from the repository root.
- `playwright test` — from `e2e/`.
- `playwright test specs/auth.spec.ts` — from `e2e/`, one journey.
- `playwright test --headed` — from `e2e/`, watch it in a browser.
- `npm run lint` and `npm run typecheck` — from `e2e/` or from the root.

The proof captures, against the development stack: `docker compose up -d --wait`, `docker compose exec -T api node ace db:seed`, then `node e2e/scripts/capture-proofs.ts`.

The variables of the suite: `E2E_WEB_URL` (default `http://localhost:5174`), `E2E_MAILPIT_URL` (default `http://localhost:8026`), `E2E_CREEM_WEBHOOK_SECRET` (default `e2e-webhook-secret`), `E2E_DEMO_MODE`.

## Done when

- The journey is written in Playwright, in the style of `e2e/specs/auth.spec.ts` and `e2e/support/app.ts`.
- The helpers are reused, not rewritten: `signUp`, `signIn`, `verifyEmail`, `createOrganization` and `acceptCookies` from `e2e/support/app.ts`, the mailbox from `e2e/support/mailpit.ts`, the signed webhook from `e2e/support/creem.ts`, the accessibility check from `e2e/support/axe.ts`.
- The journey is deterministic: a unique email and a unique slug per run (`uniqueEmail`, `uniqueSlug`), no fixed wait, and the assertions are on the visible outcome and not on the internals.
- The suite runs against the end-to-end stack, and `npm run test:e2e` passes.
- A new journey covers a user-visible outcome of the change, and it is registered in the same change.
- A bug of the application is reported, not fixed: the failing step, the request or the screenshot, the expected and the observed.
- The table of the journeys of `e2e/README.md` lists the new journey.

## Patterns

- Imitate `e2e/specs/auth.spec.ts` and `e2e/support/app.ts`; do not invent a new shape.
- The browser talks to the web app only. The API is reached through the proxy of the dev server, so the session cookies stay first-party; never point a journey at the API port.
- The labels come from the catalogs: `apps/web/src/locales/en/index.ts` and `apps/api/resources/lang/en/errors.json`. Never hardcode the text of the interface.
- Every flow that needs an account creates one with `uniqueEmail`, so two flows never fight for the same row. The slug of an organization comes from `uniqueSlug`.
- The assertions are on what the user sees: a URL, a visible text, a hidden banner. Never on the internals of a request.
- No `waitForTimeout`: wait for the locator (`expect(...).toBeVisible()`), never for a duration.
- The accessibility of a page is checked with `checkAccessibility` from `e2e/support/axe.ts`.
- A payment is simulated with the signed webhook of `e2e/support/creem.ts` (`activateSubscription`), never with a real provider.
- The suite runs with one worker and without parallelism, because the flows share the stack and the database.
