# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: founders and developers evaluating or adopting a starter to launch a new AI-powered SaaS product. They judge the template by its own site and its running dashboard before committing a product to it.
Secondary: the end users of each product generated from the template (sign up, onboard an organization, use the dashboard, chat with AI, manage billing), who inherit the default look until the product team rebrands it.

## Product Purpose

Dash Starter, by the brand Dash AI, is an installable template (`npx create-dash-starter`) that ships the plumbing every AI SaaS repeats: auth, organizations and roles, onboarding, dashboard shell and component kit, AI provider layer and chat, a metered MCP server, Brevo email, Creem billing with DB-configured monthly/yearly plans, English/Spanish localization, legal pages, cookie consent, and lint/unit/e2e/CI. Success: a team runs one command and is building their own product the same day.

## Positioning

Provider-agnostic AI from day one (Anthropic, OpenAI, Google, DeepSeek, Qwen, Kimi, GLM, OpenRouter, Ollama, any OpenAI-compatible endpoint) plus an MCP server with per-organization API keys, quotas and rate limits, delivered as a complete, tested Adonis + React + Docker Compose product rather than a code snippet collection.

## Operating Context

Evaluated through the public landing and pricing pages and by running the stack locally (`docker compose up`, demo account, Mailpit inbox). Used daily as a dashboard by the people inside generated products. Every user-facing string exists in English and Spanish.

## Capabilities and Constraints

- Stack fixed: Adonis 7 API + React 19 SPA (Vite, react-router, Tailwind 4, shadcn on Base UI), Docker Compose.
- Generated products must rebrand by changing design tokens only; no hardcoded colors in components.
- Light and dark themes are both first-class.
- Restyling stays on the existing shadcn/Base UI component stack; no component library swap.
- Open: how the installer treats Dash AI brand assets and this file in generated projects (strip, or replace with the new product's identity).

## Brand Commitments

- Brand: Dash AI. Product: Dash Starter.
- The template's visual style is the Dash AI brand; generated products inherit it and replace it through tokens and installer placeholders.

## Evidence on Hand

No customers, testimonials, usage numbers or press exist. Real material: the feature set above, the running demo stack, and the landing copy in `src/locales/{en,es}`. Do not fabricate logos, quotes, metrics or "trusted by" claims.

## Product Principles

- Ship complete, working plumbing, not snippets; every claim is demonstrable in the running stack.
- Any model, no lock-in: the AI layer never privileges one vendor.
- Rebrandable by design: the brand proves the system, it never traps the products built on it.
- Bilingual by default: Spanish is never an afterthought.

## Accessibility & Inclusion

WCAG 2.1 AA: contrast, visible focus, keyboard operation, usable at 320px width, in both themes and both languages.
