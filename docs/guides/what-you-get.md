---
type: Guide
title: What you get
description: The product the template ships: public site, accounts, organizations, dashboard, chat, billing and MCP.
tags: [product, features, overview]
status: stable
generated: { by: opencode/deepseek-v4.1-flash-free, at: 2026-10-23T00:00:00Z }
---

# What you get

Dash Starter is a working product, not a set of libraries. Every feature below is
wired to the API, localized in English and Spanish, and covered by tests.

## The public site

The landing page, the pricing page, the terms and the privacy page, and a language
switcher. In demo mode the header also carries the palette picker. The copy lives in
`apps/web/src/locales/{en,es}/public.ts`; the pages are in `apps/web/src/pages/`.

## Accounts

- Sign up with name, email and password; the address is verified with a link.
- Log in, log out, recover a password.
- The terms gate asks for consent once per version of the terms.
- The cookie banner stores the visitor's choice.
- The profile page changes the name, the avatar (PNG, JPEG or WebP up to 2 MB), the
  email (with the current password), the password (invalidating the other sessions),
  the locale and the theme (light, dark or system), and deletes the account.
- The top bar of the dashboard picks the palette, which is saved in the account and
  follows the user across devices.

## Organizations

- A user can belong to several organizations and switch between them.
- The first organization goes through onboarding: details, use case, invitations and
  plan.
- The roles are `owner`, `admin` and `member`; the owner cannot be removed and the
  organization cannot be left without an owner.
- Members are invited by email; the invitation takes a seat of the plan and expires.
- An owner or an admin imports a CSV of addresses from the members page: every row
  becomes an invitation, and the rows that cannot be invited are reported with their
  line and the reason.
- The organization settings change the name, the slug and the default locale; the
  ownership can be transferred and the organization deleted.

## The dashboard

The dashboard home shows the getting-started checklist, the KPI cards, the usage chart
and the recent activity. The frame also has the sidebar, the top bar, the command
palette, the organization switcher and the user menu.

## The AI layer

The chat page talks to the API through the AI SDK. Every feature asks for an alias
(`chat`, `fast`, `reasoning`, `image`), never for a vendor model, so the provider can
be changed from the environment. The AI tools of the product are shared with the MCP
server. See [the AI reference](../ai.md).

## Billing

The plans live in the database and are mirrored in Creem. The checkout is hosted by
Creem, the subscription is written by signed webhooks, and every limit of the product
is read through `EntitlementService`. See [the billing reference](../billing.md).

## The MCP server

An admin creates an API key with the `mcp:read` and `mcp:write` scopes, and an
external agent talks to `/mcp` with the same tools and permissions as the chat. See
[the MCP reference](../mcp.md).

## The development harness

The `dsh` Claude Code plugin adds specialist agents, commands, guardrails, a commit
gate and worktrees. It is optional: the product builds and tests without it. See
[the harness reference](../harness.md).

## Where to go next

- [Getting started](./getting-started.md) to boot it.
- [Configuration](./configuration.md) to point it at your services.
- [Customizing](./customizing.md) to make it yours.
- [Deployment](./deployment.md) to ship it.
