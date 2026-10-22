# Proposal

## Why

`dash-starter` should be the reusable base for launching new AI-powered products, but today it holds the remains of one specific product: domain pages, a Supabase backend that is being removed, an Adonis API with only token login, and no billing, email, AI, tests or installer. Every new product currently restarts the same plumbing (auth, organizations, billing, email, i18n, AI, compliance pages), so turning this repo into a generic, installable template removes that repeated cost.

## What Changes

- **BREAKING** Remove the former product's domain: all product pages (reviews, surveys, kudos, time off, Slack, org chart…), the Supabase client, `supabase/` folder, product docs (`PRD.md`, `PRODUCT.md`, `plan.md`) and the committed root `dist/` build.
- **BREAKING** Restructure into an npm-workspaces monorepo: `apps/api` (from the former API folder), `apps/web` (from the former web folder), `packages/create-app` (installer). Product name becomes a single replaceable placeholder.
- Add an `npx` installer that scaffolds a new repo and project: name, branding placeholders, secrets, `.env` files, git init, optional GitHub repo, optional first boot.
- Docker Compose development and production stacks (Postgres, API, web, Mailpit for local email).
- Public site: landing page, pricing page fed from the database, terms and conditions page, privacy/cookie policy page, cookie consent banner with category preferences.
- Accounts: sign up, login, logout, email verification, password reset, profile management (name, avatar, locale, password, account deletion).
- Organizations: multi-tenant data model, roles (owner/admin/member), invitations, org switching, organization settings, and a guided onboarding flow for a new organization.
- Dashboard shell (sidebar menu, org switcher, global search/command palette, user menu) and a reusable component kit (forms, data tables, menus, search, buttons, dialogs, toasts, charts, empty states) with a living showcase page.
- Generic AI provider service usable by any feature for text, structured output (reports), streaming and image generation, backed by a provider-agnostic SDK that supports Anthropic, OpenAI, Google, DeepSeek, Qwen, Moonshot/Kimi, Zhipu/GLM, OpenRouter and any OpenAI-compatible endpoint; all usage metered per organization.
- In-app AI chat with persisted conversations and tool calling.
- MCP server exposing selected product capabilities to external agents, authenticated with organization API keys, metered against plan quotas and rate limited.
- Full English and Spanish localization across UI, emails, validation and error messages, legal pages and DB-stored plan content.
- Transactional email through Brevo with localized templates.
- Billing plans with monthly and yearly prices configured in the database; subscriptions and payments processed by Creem (hosted checkout, webhooks, customer portal) and plan entitlements enforced in the app.
- Quality tooling: ESLint + Prettier + typecheck, API unit/functional tests, web unit tests, Playwright end-to-end tests, CI workflow.

## Capabilities

### New Capabilities
- `project-installer`: `npx` CLI that creates a new product repository from the template and configures it.
- `dev-environment`: Docker Compose stack, environment configuration and seed data that boot the whole product locally and in production.
- `public-site`: landing page, pricing page and the public layout shared by unauthenticated pages.
- `legal-pages`: terms and conditions and privacy/cookie policy pages.
- `cookie-consent`: consent banner, category preferences and gating of non-essential scripts.
- `user-auth`: sign up, login, logout, sessions, email verification, password reset and auth rate limiting.
- `user-profile`: user-managed profile, preferences, password change and account deletion.
- `organizations`: tenant model, memberships, roles, invitations, org switching, org settings and tenant isolation.
- `org-onboarding`: guided first-run setup of a new organization.
- `dashboard-shell`: authenticated application layout, navigation, org switcher and global search.
- `ui-components`: reusable dashboard component kit and its showcase.
- `localization`: English/Spanish support across every user-facing surface, locale detection and persistence.
- `transactional-email`: Brevo-backed delivery of localized transactional emails.
- `ai-provider`: generic, model-agnostic AI service for text, structured output, streaming and images, with usage metering.
- `ai-chat`: in-app conversational assistant with persisted history and tools.
- `mcp-server`: metered, rate-limited MCP endpoint authenticated by organization API keys.
- `billing-plans`: database-configured plans with monthly and yearly prices and entitlements.
- `subscription-payments`: Creem checkout, subscription lifecycle via webhooks, customer portal and entitlement enforcement.
- `quality-tooling`: linting, formatting, typechecking, unit tests, e2e tests and CI.

### Modified Capabilities
<!-- None: the repository has no existing OpenSpec specs. -->

## Impact

- Code: the former API and web folders are moved and largely rewritten; most of the web folder's `src/pages` and `src/lib` (`supabase.ts`, `archetypes.ts`, `skills.ts`) are deleted; `docker-compose.yml`, root `package.json`, `.github/workflows/ci.yml` are replaced.
- API: new versioned REST surface under `/api/v1`, webhook endpoint for Creem, MCP endpoint at `/mcp`; existing `/api/v1/auth/*` token endpoints change to cookie sessions.
- Dependencies (new): Adonis mail, i18n, bouncer, limiter, drive; Vercel AI SDK and provider packages; MCP TypeScript SDK; TanStack Query/Table, react-hook-form, zod, Recharts, cmdk, sonner; Vitest, Testing Library, Playwright. Removed: `@supabase/supabase-js`.
- External services: Brevo (email), Creem (payments), at least one LLM provider; all optional in local dev (Mailpit, Creem test mode, stub AI provider).
- Data: new Postgres schema (users, organizations, memberships, invitations, plans, prices, subscriptions, webhook events, AI usage, conversations, API keys, rate limits).
