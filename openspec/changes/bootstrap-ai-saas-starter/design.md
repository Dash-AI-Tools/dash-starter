# Design

## Context

See proposal.md for motivation. Current state that shapes the approach:

- The former API folder: AdonisJS 7 skeleton (Lucid + Postgres, `@adonisjs/auth` with both `api` token and `web` session guards, shield, CORS, VineJS, Tuyau registry generation, Japa with `unit`/`functional` suites but no tests). Only signup/login/profile/logout routes exist, using access tokens.
- The former web folder: Vite + React 19 + react-router 8 + Tailwind 4 + shadcn (`base-nova` style on `@base-ui/react`) SPA. Auth and data go through Supabase (`src/lib/supabase.ts`), which the working tree is already deleting. It has a hand-rolled typed i18n provider (`src/lib/i18n.tsx`, `en` object with `es` mirror) and ~30 domain pages of the former product.
- `docker-compose.yml` runs Postgres 17, the API image and an nginx-served web image on different ports (CORS between 5173 and 3333). Root `package.json` only proxies the web app; CI only lints/builds the web app. Vite builds into a committed root `dist/`.

Constraints: stack stays Adonis + React + Docker Compose; English and Spanish everywhere; Brevo for email; Creem for payments; AI must work with any vendor including Chinese models.

## Goals / Non-Goals

**Goals:**
- A monorepo that a generated product can evolve without fighting template structure: one owner per concern (API owns auth, tenancy, billing, AI, email; web owns presentation).
- Every external integration has a local/test fallback so a fresh project boots and passes tests with zero third-party keys.
- Typed contract between web and API generated from Adonis routes (Tuyau), not hand-maintained.

**Non-Goals:**
- SSR/SEO beyond static meta tags for the SPA; social/OAuth login; SSO/SAML; platform super-admin UI (plans are edited in DB or seeders); usage-based overage billing; multiple currencies per plan; consuming external MCP servers from chat; mobile apps; Kubernetes manifests.

## Decisions

### D1. Monorepo layout with npm workspaces
`apps/api` (moved from the former API folder, git history preserved via `git mv`), `apps/web` (from the former web folder), `packages/create-app` (installer), `e2e/` (Playwright). Root scripts fan out with `npm run <x> --workspaces --if-present`. Root `dist/` is deleted; Vite builds to `apps/web/dist`.
*Alternatives:* pnpm/turbo (extra tooling for two apps, not justified); keeping folders as-is (product-specific names leak into every generated project).

### D2. SPA + JSON API on one origin, cookie sessions
Keep the SPA (user choice). Switch auth to the existing `web` session guard with HTTP-only `SameSite=Lax` cookies; shield CSRF enabled for API routes, with the SPA reading the XSRF cookie and sending `X-XSRF-TOKEN`. Same origin is achieved by Vite dev proxy (`/api`, `/mcp` → API) and nginx in production. The `api` access-token guard is removed for users; tokens are reused only for organization API keys (D9).
*Alternatives:* bearer tokens in localStorage (XSS-exfiltratable); Inertia (rewrites the frontend, user declined).

### D3. Tenancy: org slug in the URL, membership middleware, Bouncer policies
Tables carry `organization_id`. Org-scoped routes live under `/api/v1/orgs/:orgSlug/...`; an `org` middleware resolves the organization **through the caller's membership** (not by slug alone), returning 404 when absent, and binds `ctx.organization` and `ctx.membership`. Role checks use `@adonisjs/bouncer` abilities keyed on `owner > admin > member`. Feature queries start from `ctx.organization.related(...)` so a missing scope is structurally hard. Web routes mirror it: `/app/:orgSlug/*`.
*Alternatives:* `X-Org-Id` header (invisible in URLs, harder to share links); Postgres RLS (strong, but duplicates Bouncer rules and complicates Lucid).

### D4. Typed client and data fetching
Use Tuyau (already wired in `adonisrc.ts`) to generate the route registry consumed by a typed client in `apps/web`; wrap calls with TanStack Query. A single fetch wrapper adds CSRF header, `Accept-Language`, maps 401 → login redirect, 422 → field errors, 402/429 → typed quota/rate errors.

### D5. Localization
- **Web:** keep the existing typed-dictionary approach (`TranslationKey = keyof typeof en`) but split into per-namespace modules under `apps/web/src/locales/{en,es}/` with `es` declared as `satisfies Messages` of the `en` shape, so a missing key is a type error. Add interpolation and plurals via `Intl.PluralRules`; dates/numbers via `Intl`. Locale stored in `locale` cookie and user record; `<html lang>` updated on change.
- **API:** `@adonisjs/i18n` with `resources/lang/{en,es}/*.json`, request locale detected by middleware (user → cookie → `Accept-Language` → default), VineJS messages provider from i18n, exceptions rendered with `code` + localized `message`. Emails use the same catalogs.
- **DB content:** localized columns are `jsonb` `{ en, es }`, validated by a Vine rule requiring all supported locales.
- **Completeness test:** a Japa unit test diffs API catalogs; the web relies on TypeScript.
*Alternatives:* i18next (runtime-only missing-key detection; existing typed approach is stricter and already in use).

### D6. Email via `@adonisjs/mail`
Brevo transport in production, SMTP → Mailpit in dev, `mail.fake()` in tests. Each email is a `BaseMail` class with Edge templates using i18n; sent with `mail.sendLater` so requests never wait on delivery. Retries wrap the transport (3 attempts, exponential backoff); attempts logged with provider message id. Env validation requires `BREVO_API_KEY` when `NODE_ENV=production`.
*Alternatives:* calling Brevo's SDK directly (re-implements templating/queueing the mail package already provides). A Redis-backed job queue is deferred: in-process `sendLater` is acceptable for the template and noted as a risk.

### D7. AI provider: Vercel AI SDK behind an `AiService`
Use the AI SDK (`ai` core package, server-side in Adonis) because it is provider-agnostic and covers text, streaming, `generateObject` with schemas, image generation and tool calling with one interface. Providers: `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`, `@ai-sdk/deepseek`, `@openrouter/ai-sdk-provider`, and `@ai-sdk/openai-compatible` for Qwen (DashScope compatible mode), Moonshot Kimi, Zhipu GLM, Ollama and any custom base URL. `config/ai.ts` builds a provider registry from env and maps aliases (`chat`, `fast`, `reasoning`, `image`) to `provider:model` plus declared capabilities and credit prices. A `stub` provider (AI SDK mock model) is selected when no key is configured outside production.
`AiService` is the only entry point: `generateText`, `streamText`, `generateObject`, `generateImage`, each taking `{ organization, user, feature, alias }`. It (1) checks the credit entitlement before calling, (2) applies timeout/abort, (3) records an `ai_usage_events` row in `finally` with tokens and credits computed from alias pricing, (4) emits threshold notifications at 80%/100%. Images are stored with `@adonisjs/drive` (local disk in dev, S3-compatible in prod).
*Alternatives:* LiteLLM proxy (extra Python service in Compose); OpenRouter only (single vendor dependency, no local models); vendor SDKs directly (N integrations).

### D8. AI chat
`conversations` and `messages` tables (org-scoped, `user_id` owner, message `parts` as `jsonb` in AI SDK UI message format). Endpoint `POST /api/v1/orgs/:orgSlug/chat` streams the AI SDK UI message stream; web uses `@ai-sdk/react` `useChat`. Markdown rendered with `react-markdown` + `rehype-sanitize`. Title generated with the `fast` alias after the first exchange.

### D9. Shared tool registry for chat and MCP
One `ToolRegistry` in the API defines each product tool once: name, localized description, Vine/zod input schema, required role (for chat) and scope (for MCP), and an `execute(ctx)` that receives the organization and actor. Chat adapts tools to AI SDK `tool()`; MCP adapts them to MCP `registerTool`. Permission checks live in the registry wrapper, so both surfaces enforce the same rules.

### D10. MCP server
`@modelcontextprotocol/sdk` `McpServer` with Streamable HTTP transport in stateless mode, mounted at `POST /mcp` via an Adonis controller bridging the Node request/response. Auth: `Authorization: Bearer <key>`; keys use Adonis `DbAccessTokensProvider` attached to the `Organization` model (`api_keys` table, hashed secret, abilities = scopes, `last_used_at`, `expires_at`), reusing the framework's token hashing/verification instead of custom crypto. Rate limiting with `@adonisjs/limiter` (database store on Postgres, keys `mcp:key:<id>` and `mcp:org:<id>`, limits from entitlements). Metering via `mcp_usage_events`, counted per billing period; quota checked before execution.

### D11. Billing data model and entitlements
Tables: `plans` (key, `name`/`description`/`features` jsonb, `is_public`, `is_active`, `is_default_free`, `sort_order`, `entitlements` jsonb), `plan_prices` (plan_id, `interval` enum month|year, `amount_cents`, `currency`, `creem_product_id`, `is_active`; partial unique index on `(plan_id, interval) WHERE is_active`), `subscriptions` (organization_id unique, plan_price_id, creem ids, `status`, `current_period_end`, `cancel_at_period_end`, `grace_until`, `last_event_at`), `billing_events` (provider event id unique, payload, processed_at). Partial unique index enforces a single `is_default_free`. `EntitlementService.for(organization)` resolves the effective plan (active/trialing/grace subscription → its plan, else default free) and is the only reader of limits; `-1` means unlimited. Usage periods are the subscription period, or calendar month on the free plan. Plans are seeded by an idempotent seeder; `node ace billing:sync` creates missing Creem products from active prices and reports drift.

### D12. Creem integration
A thin `CreemClient` over `fetch` (API key header, test vs production base URL from env) covering: create checkout (product id, `request_id`, `metadata: { organizationId, planPriceId }`, customer email, success URL), customer portal link, cancel, upgrade/change product, create product. Webhook controller verifies `creem-signature` (HMAC-SHA256 of raw body with `CREEM_WEBHOOK_SECRET`, timing-safe compare) before parsing, inserts into `billing_events` (unique id → idempotent), then applies the event in a transaction with `SELECT … FOR UPDATE` on the subscription and ignores events older than `last_event_at`. Success redirect never mutates state.
*Alternatives:* the community SDK (small API surface; a fetch client keeps dependencies and version churn low and is easy to fake in tests).

### D13. Frontend structure and UI kit
`apps/web/src`: `routes/` (react-router route modules, lazy-loaded), `features/<name>/` (auth, onboarding, organizations, billing, chat, api-keys, profile), `components/ui/` (shadcn primitives), `components/patterns/` (DataTable on TanStack Table, Form on react-hook-form + zod resolver, charts on shadcn chart/Recharts, CommandPalette on cmdk, EmptyState, PageHeader), `lib/` (api client, i18n, consent, theme). Navigation is declared once in `nav.ts` with `minRole`, consumed by sidebar and command palette. Showcase route at `/app/:orgSlug/dev/components`, included only when `import.meta.env.DEV || VITE_ENABLE_SHOWCASE`.

### D14. Cookie consent
Own small module (no third-party CMP): `consent` cookie `{v, categories, ts}`, React context, `useConsent(category)`, and a `ConsentScript` component that injects registered third-party scripts only when granted. Policy version constant shared with `/privacy`. No analytics vendor is bundled; the template registers an example no-op script.

### D15. Installer
`packages/create-app` published as `create-dash-starter`, built with `@clack/prompts` and `giget` to download the template tarball for the git tag equal to the installer version (so installer and template stay in lockstep). Steps: validate empty dir → prompts/flags → download → apply replacements from a manifest `template.json` (placeholder tokens + file globs) → remove `packages/create-app`, `openspec/changes`, template CI job → write `.env` files from examples with generated secrets → `git init` + commit → optional `gh repo create --private --source . --push` → optional `npm install`, `docker compose up -d`, migrate, seed.

### D16. Testing and CI
API: Japa unit + functional suites with `testUtils.db().withGlobalTransaction()`, `mail.fake()`, stub AI provider, fake Creem client bound through the IoC container. Web: Vitest + Testing Library + MSW. E2E: Playwright in `e2e/` against the dev Compose stack, Mailpit API to read verification/invite links, signed simulated Creem webhooks, `@axe-core/playwright` for a11y. Lint: Adonis ESLint config for API, typescript-eslint + react-hooks for web, shared Prettier. CI: GitHub Actions jobs `lint-typecheck`, `test` (Postgres service), `build`, `e2e` (Compose), `installer` (template repo only).

## Risks / Trade-offs

- [In-process `sendLater` loses queued emails on crash] → Acceptable for template; document adding a queue (Redis + job worker) as the first scaling step; sends are logged so gaps are detectable.
- [Creem API/webhook event names may differ from assumptions] → Isolate in `CreemClient` and one event-mapping function covered by fixture-based tests; verify against docs.creem.io during implementation.
- [Chinese providers via OpenAI-compatible mode may lack tools/structured output/images] → Aliases declare capabilities; `AiService` fails fast on capability mismatch; stub covers tests.
- [Credit accounting race: concurrent calls can overshoot quota] → Pre-check plus post-record means bounded overshoot of in-flight calls; acceptable and documented; hard limits possible later with row locks.
- [Limiter on Postgres adds DB load under heavy MCP traffic] → Store is configurable; switch to Redis via env when needed.
- [Large rewrite of existing frontend] → Reuse `components/ui/button.tsx`, theme tokens in `index.css`, i18n mechanism and landing layout; delete domain pages instead of porting.
- [Placeholder legal text mistaken for real terms] → Visible "template" notice until the operator removes it (spec'd).

## Migration Plan

Greenfield template; no production data. Steps: `git mv` apps into `apps/`, delete the former product's domain and Supabase, reset migrations to the new schema (existing two Adonis migrations are replaced by fresh ones since no deployed database depends on them). Rollback = revert the change branch.

## Open Questions

- Default plan catalog values (names, prices, limits) shipped in the seeder — placeholder values (Free / Pro / Business, USD) are used until the product owner sets real ones; changing them is data, not code.
- Template placeholder product name — `Dash` is assumed; the installer replaces it regardless.
