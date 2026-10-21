# Tasks

## 1. Repository restructure and cleanup

- [x] 1.1 `git mv` the former API and web folders to `apps/api` and `apps/web`; rename packages to `@dash/api` / `@dash/web`; verify `git log --follow apps/api/package.json` shows history
- [x] 1.2 Delete the former product's domain code: all pages except Login/Signup/Home, `lib/supabase.ts`, `lib/archetypes.ts`, `lib/skills.ts`, `components/FormRenderer.tsx`, `components/NotificationBell.tsx`, `supabase/`, `PRD.md`, `PRODUCT.md`, `plan.md`, file `1`, root `dist/`; remove `@supabase/supabase-js`; verify that a search of `apps` for Supabase and the former product name returns only intended placeholders
- [x] 1.3 Set Vite `outDir` back to `apps/web/dist`, add `dist` to `.gitignore`; verify `npm run build -w @dash/web` writes there
- [x] 1.4 Create root npm workspaces (`apps/*`, `packages/*`, `e2e`) with fan-out scripts `dev`, `build`, `lint`, `format`, `format:check`, `typecheck`, `test`, `test:e2e`; verify `npm install` at root succeeds and each script runs
- [x] 1.5 Add `template.json` manifest listing placeholder tokens (`Dash`, `dash`, `dash-starter`, support email) and file globs; verify every listed token occurs in the repo

## 2. Dev environment and configuration

- [x] 2.1 Write `docker-compose.yml` (dev: postgres, api with `node ace serve --hmr` and source mount, web with Vite and mount, mailpit) and `docker-compose.prod.yml` (built images, nginx proxying `/api` and `/mcp`, migrate-before-start entrypoint); verify `docker compose up` serves web, API and Mailpit at documented URLs
- [x] 2.2 Configure Vite dev proxy for `/api` and `/mcp`; remove CORS dependency for same-origin; verify a browser request from the web origin to `/api/v1/health` succeeds without CORS headers
- [x] 2.3 Extend `start/env.ts` with all new variables (mail, Brevo, Creem, AI providers/aliases, drive, limiter) and production-only required rules; update `.env.example` files; add unit test asserting boot fails without `APP_KEY` and without `BREVO_API_KEY` in production
- [x] 2.4 Add `GET /api/v1/health` checking DB connectivity and wire Compose health checks; add functional test for 200 and simulated DB failure
- [x] 2.5 Document setup, commands and URLs in root `README.md`; verify commands run as written on a clean clone

## 3. Localization foundation

- [x] 3.1 API: install/configure `@adonisjs/i18n` with `resources/lang/{en,es}`, locale-detection middleware (user → cookie → Accept-Language → default), VineJS messages provider and exception handler returning `{ code, message }` localized; functional test for Spanish 422 response with stable rule code
- [x] 3.2 API: Japa unit test that fails when `en` and `es` catalogs have different keys; verify it fails on a deliberately missing key
- [x] 3.3 API: Vine rule `localizedText` requiring all supported locales for jsonb fields; unit test
- [x] 3.4 Web: refactor `lib/i18n.tsx` into `locales/{en,es}/<namespace>.ts` with `es satisfies Messages`, interpolation, plurals (`Intl.PluralRules`), `formatDate/formatNumber/formatCurrency` helpers, `<html lang>` sync and cookie persistence; Vitest tests for plurals, formatting and fallback; verify removing an `es` key fails `npm run typecheck`
- [x] 3.5 Web: language switcher component preserving current route; component test

## 4. Web foundation: API client, theming, UI kit

- [x] 4.1 Generate Tuyau client from API routes and add `lib/api.ts` fetch wrapper (credentials, XSRF header, Accept-Language, 401/422/402/429 mapping) with TanStack Query provider; Vitest + MSW tests for each status mapping
- [x] 4.2 Theme tokens in `index.css` (light/dark/system) and theme provider persisted to user preference/localStorage; test toggling applies `dark` class
- [x] 4.3 Add shadcn primitives for the full inventory in the `ui-components` spec (button, inputs, select, combobox, checkbox, radio, switch, date picker, file upload, dialog, sheet, dropdown/context menu, tabs, tooltip, popover, toast via sonner, badge, avatar, card, skeleton, pagination, breadcrumb, command); verify typecheck and lint pass
- [x] 4.4 Build `patterns/Form` (react-hook-form + zod, 422 mapping, pending state) with tests for server error mapping
- [x] 4.5 Build `patterns/DataTable` (TanStack Table, server pagination/sort/filter, URL state, selection, column visibility, loading/empty/error) with tests for URL round-trip and empty state
- [x] 4.6 Build chart components (line, bar, area, pie) using theme tokens and locale formatting; test Spanish number formatting
- [x] 4.7 Build `EmptyState`, `PageHeader`, `CommandPalette` primitives; dialog focus-trap test
- [x] 4.8 Showcase route rendering every component and variant, gated by `DEV || VITE_ENABLE_SHOWCASE`; test that production build excludes it

## 5. Authentication

- [x] 5.1 Replace user migrations: users (`full_name`, `email` unique citext, `password`, `email_verified_at`, `locale`, `theme`, `avatar_path`, `terms_version`, `terms_accepted_at`, `last_organization_id`); remove access-token user auth; switch default guard to `web` session; configure shield CSRF; verify migrations run fresh
- [x] 5.2 Signup endpoint with Vine validator (terms required), auto-login, verification email; functional tests for success, duplicate email, terms missing
- [x] 5.3 Login/logout with generic error and safe same-origin `redirectTo`; functional tests
- [x] 5.4 Email verification (signed URL, 24h expiry, resend) and `verified` middleware; tests for valid, expired, resend
- [x] 5.5 Password reset (request with identical response, single-use 60-min token, invalidate other sessions); tests including reuse rejection
- [x] 5.6 Configure `@adonisjs/limiter` (database store) and apply auth limits per IP and email; test 429 after 5 failed logins
- [x] 5.7 Web: login, signup, verify-email, forgot/reset password pages built on `patterns/Form`, localized; `RequireAuth` route guard with return-to; Vitest tests for guard redirect

## 6. Transactional email

- [x] 6.1 Install `@adonisjs/mail`; configure Brevo transport (prod), SMTP Mailpit (dev), fake (tests); retry wrapper with logging; unit test retry on transient error
- [x] 6.2 Shared responsive Edge layout with i18n, plain-text alternative, product name/logo/footer placeholders
- [x] 6.3 Mail classes for the full catalog in the `transactional-email` spec, each rendered in recipient locale and sent with `sendLater`; functional tests using `mail.fake()` asserting subject locale for `en` and `es`

## 7. Organizations and tenancy

- [ ] 7.1 Migrations and models: organizations (name, slug unique, logo_path, default_locale, onboarded_at, onboarding_state jsonb), memberships (role enum, unique org+user), invitations (email, role, token hash, expires_at, accepted_at, revoked_at); verify migration and model relations
- [ ] 7.2 `org` middleware resolving org via caller membership (404 otherwise) and Bouncer abilities by role; functional tests for cross-tenant 404 and member 403 on admin route
- [ ] 7.3 Create organization endpoint with slug suggestion and uniqueness; tests
- [ ] 7.4 Members endpoints: list, change role (admin cannot touch owner), remove, leave, last-owner protection; tests for each rule
- [ ] 7.5 Invitations: create (verified inviter, seat check via entitlements), revoke, list, accept with email match, signup-prefill flow; tests including mismatch and seat limit
- [ ] 7.6 Settings: update name/slug/logo/default locale, transfer ownership, delete org (cancels subscription via billing service); tests
- [ ] 7.7 Web: members page (DataTable), invite dialog, organization settings page, invitation accept page; component tests for role-based visibility

## 8. Dashboard shell and profile

- [ ] 8.1 App layout: collapsible sidebar (persisted), mobile drawer, top bar with breadcrumbs, search trigger, notifications slot, user menu with cookie-preferences entry; test drawer at mobile width
- [ ] 8.2 `nav.ts` single declaration with `minRole`; sidebar and command palette consume it; test member sees no Billing/API keys
- [ ] 8.3 Org switcher with "create organization"; remember last org on server; test switching navigates to new slug
- [ ] 8.4 Command palette with search-provider registry and a members search provider backed by an API search endpoint; tests for Cmd+K and grouped results
- [ ] 8.5 Dashboard home with KPI cards, chart, recent-activity table and getting-started checklist; render test
- [ ] 8.6 Not-found, error boundary and 401 redirect handling; tests
- [ ] 8.7 Profile page: name/avatar (drive, type/size limits), email change with verification, password change, locale/theme preferences, account deletion with ownership guard; API functional tests and web component tests
- [ ] 8.8 Terms re-acceptance gate when `terms_version` is outdated; test

## 9. Organization onboarding

- [ ] 9.1 API onboarding state endpoints (save step, complete) persisting progress; tests for resume
- [ ] 9.2 Web onboarding wizard (details, use case, invites skippable, plan selection with preselect from pricing query) and redirect for users without memberships or with pending invites; component tests for resume and skip
- [ ] 9.3 Completion: mark onboarded, send welcome email, land on dashboard with checklist; functional test

## 10. Billing plans and Creem payments

- [ ] 10.1 Migrations/models for plans, plan_prices (partial unique active per interval), subscriptions, billing_events; partial unique default free plan; tests that DB rejects two active monthly prices
- [ ] 10.2 Idempotent plan seeder (Free/Pro/Business, monthly+yearly, `en`/`es` content, entitlements incl. seats, AI credits, MCP access/calls/rpm); test re-run produces no duplicates
- [ ] 10.3 `EntitlementService.for(org)` with effective-plan resolution (active/trialing/grace → plan, else free) and `-1` unlimited; unit tests for each state
- [ ] 10.4 Public `GET /api/v1/plans` localized; functional test for `es`
- [ ] 10.5 `CreemClient` (checkout, portal, cancel, change product, create product; test/prod base URL) bound in container with a fake for tests; unit tests against recorded fixtures
- [ ] 10.6 Checkout endpoint (admin, verified, no active subscription) returning redirect URL with metadata; tests
- [ ] 10.7 Webhook endpoint: raw-body HMAC verification, idempotent `billing_events`, transactional apply with row lock and out-of-order guard, lifecycle mapping (active, paid/renewed, past_due with 7-day grace, canceled, expired); tests for invalid signature, duplicate, out-of-order, each lifecycle event; verify event names against docs.creem.io
- [ ] 10.8 Change plan/interval and cancel endpoints with seat-based downgrade guard; portal link endpoint; tests
- [ ] 10.9 `node ace billing:sync` creating missing Creem products and reporting drift; test with fake client
- [ ] 10.10 Billing emails (started, payment failed, canceled) wired to webhook transitions; tests with `mail.fake()`
- [ ] 10.11 Web: billing settings page (plan, status, renewal, usage meters, change plan, cancel, portal, processing state after return, past-due banner); component tests
- [ ] 10.12 Document plan configuration and Creem setup (keys, webhook URL, test mode, sync command) in `docs/billing.md`

## 11. Public site, legal pages and cookie consent

- [ ] 11.1 Public layout (header with language switcher/auth-aware links, footer with terms/privacy/cookie preferences/contact) and per-page localized title/meta/OG; component tests
- [ ] 11.2 Rewrite landing page as generic placeholder template (hero, features, pricing teaser, FAQ, CTA) reusing current layout and tokens; render test in both locales
- [ ] 11.3 Pricing page from `/api/v1/plans` with interval toggle, yearly savings, unavailable-interval state and plan hand-off to signup/onboarding; component tests
- [ ] 11.4 `/terms` and `/privacy` (with cookie table) in both locales, version + date, template notice; terms version constant shared with signup; render tests
- [ ] 11.5 Consent module: cookie `{v, categories, ts}` with 12-month expiry, context/hook, banner (accept/reject/customize), preferences dialog, `ConsentScript` gating, version bump re-prompt; Vitest tests for gating, expiry and version bump

## 12. AI provider

- [ ] 12.1 Install AI SDK core and providers (anthropic, openai, google, deepseek, openrouter, openai-compatible); `config/ai.ts` registry from env with aliases, capabilities and credit pricing, plus stub provider fallback outside production; unit tests for alias resolution, capability mismatch error and stub selection
- [ ] 12.2 `ai_usage_events` migration/model and `AiService` (`generateText`, `streamText`, `generateObject`, `generateImage`) with quota pre-check (402 `ai_quota_exceeded`), timeout, usage recording in `finally`, error mapping; unit tests with mock model for success, error and quota
- [ ] 12.3 Image storage via `@adonisjs/drive` with org-scoped access URLs; functional test
- [ ] 12.4 80%/100% threshold detection sending quota emails once per period; test
- [ ] 12.5 Document provider configuration including DeepSeek, Qwen, Kimi, GLM, OpenRouter, Ollama and custom endpoints in `docs/ai.md`; verify stub and one OpenAI-compatible config boot

## 13. Tool registry and AI chat

- [ ] 13.1 `ToolRegistry` with schema, localized description, `minRole`, `scope`, `execute(ctx)` and permission wrapper; ship tools: organization info, list members, AI usage summary, generate text; unit tests for role and scope denial
- [ ] 13.2 Conversations/messages migrations and CRUD endpoints (owner-private, org-scoped); tests for privacy between members
- [ ] 13.3 Streaming chat endpoint using `AiService.streamText` with registry tools, locale system prompt, abort handling, per-user rate limit, auto title via `fast`; functional tests with stub model
- [ ] 13.4 Web chat page with `useChat`: conversation list, rename/delete, streaming, stop, sanitized Markdown/code/tables, tool-call display, stub badge, low-credit and quota-exhausted states; component tests including script sanitization

## 14. MCP server

- [ ] 14.1 API keys via `DbAccessTokensProvider` on `Organization` (`api_keys` table, scopes as abilities, last used, expiry); create/list/revoke endpoints (admin, plan-gated); tests for one-time secret, revoke, member 403, free-plan refusal
- [ ] 14.2 `/mcp` controller bridging Streamable HTTP transport (stateless) to `McpServer` with registry tools adapted by scope; functional tests for `tools/list` and `tools/call`
- [ ] 14.3 Bearer auth, plan gating, `@adonisjs/limiter` per key and per org from entitlements (429 + Retry-After); tests for burst limit and revoked key
- [ ] 14.4 `mcp_usage_events` metering and monthly allowance check (`mcp_quota_exceeded`), AI tools also consuming credits; tests
- [ ] 14.5 Web API keys page (create with scopes, one-time secret display, revoke, usage per key vs allowance, MCP client connection snippet); component tests
- [ ] 14.6 Document MCP usage (endpoint, auth, scopes, limits, example client config) in `docs/mcp.md`

## 15. Quality tooling and CI

- [ ] 15.1 Shared Prettier config, ESLint for API (adonis config) and web (typescript-eslint, react-hooks, jsx-a11y); make template pass `lint`, `format:check`, `typecheck` at root
- [ ] 15.2 Vitest + Testing Library + MSW setup for web; Japa suites configured with global DB transaction; verify `npm test` runs all suites
- [ ] 15.3 Playwright project in `e2e/` with Mailpit helper, signed Creem webhook helper and axe checks; journeys: signup+verify, login, onboarding, invite+accept, language switch, cookie consent, chat with stub, API key + MCP call, simulated paid subscription; verify all pass locally against Compose
- [ ] 15.4 GitHub Actions: `lint-typecheck`, `test` (Postgres service), `build`, `e2e` (Compose, traces on failure); verify workflow passes on a PR

## 16. Installer

- [ ] 16.1 Scaffold `packages/create-app` (`create-dash-starter` bin) with `@clack/prompts`, flags and `--yes`; validation of empty dir and kebab-case slug; unit tests
- [ ] 16.2 Template fetch via `giget` at tag matching installer version (with `--template` override for local path); test with local path
- [ ] 16.3 Placeholder replacement from `template.json`, removal of installer/openspec changes/template-only CI; test asserting no placeholder remains
- [ ] 16.4 `.env` generation from examples with unique `APP_KEY` and secrets, optional provider keys; test uniqueness and that `.env` is gitignored
- [ ] 16.5 Git init + initial commit, optional `gh repo create --private --push` with graceful fallback, optional install/compose up/migrate/seed with Docker detection and final URL summary; tests with mocked commands
- [ ] 16.6 Template-repo CI job generating a project non-interactively and running its lint, typecheck and tests; document release/tagging and `npx create-dash-starter` usage in README

## 17. Integration verification

- [ ] 17.1 Fresh-machine run: `npx` installer (local template) → boot → full e2e suite green, with zero third-party keys
- [ ] 17.2 Full Spanish walkthrough (signup → onboarding → dashboard → chat → billing → emails in Mailpit) confirming no untranslated UI strings
- [ ] 17.3 `openspec validate bootstrap-ai-saas-starter --strict` passes and every spec scenario maps to at least one test or e2e journey

## Workflow follow-up

- Archive the change after review requirements are satisfied (`/opsx:archive`).
- Tag the first template release so the installer version resolves.
