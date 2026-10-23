---
type: Guide
title: Customizing
description: Rename the product, change the palette and the locales, drop what you do not need and add the first feature.
tags: [customize, branding, palette, locales, features]
status: stable
generated: { by: opencode/deepseek-v4.1-flash-free, at: 2026-10-23T00:00:00Z }
---

# Customizing

## Rename the product

The installer does this for you: it replaces every literal listed in
`packages/create-app/template.json`. In a clone, change the same places by hand:

| Where                                       | What                                                           |
| ------------------------------------------- | -------------------------------------------------------------- |
| `apps/api/app/brand.ts`                     | `PRODUCT_NAME`, `SUPPORT_EMAIL`, `LEGAL_ADDRESS` of the emails |
| `apps/web/src/locales/{en,es}/common.ts`    | `appName`, `supportEmail`                                      |
| `apps/web/index.html`                       | `<title>`                                                      |
| `apps/web/src/locales/{en,es}/public.ts`    | The copy of the landing and pricing pages                      |
| `apps/api/resources/lang/{en,es}/mail.json` | The subject and the copy of the emails                         |

Keep the copyright and the legal pages consistent with the address of the company.

## Choose the palette

The product ships six palettes: `line`, `ink`, `ocean`, `forest`, `plum` and `ember`,
each with light and dark tokens in `apps/web/src/styles/palettes.css`.

- Set the default in `apps/web/src/lib/palettes.ts` (`DEFAULT_PALETTE`), or pass
  `--palette <id>` to the installer. An unknown id fails the typecheck.
- Signed-in users pick a palette in the dashboard top bar; the choice is saved in
  `users.palette` and overrides the default for that user only.
- Turn `DEMO_MODE` off in the root `.env` for a generated product; it only exists to
  show the palettes to visitors of the template. It is a build-time value of the web
  app, so restart the dev server or rebuild the image.
- To add a palette, copy the `line` blocks in `palettes.css`, add the id to
  `PALETTE_IDS`, its name to the `palette…` keys of both locales and the id to the
  `palette` enum of `apps/api/app/validators/profile.ts`. `npm test` checks every
  token, the WCAG AA contrast and the six station colours.

## Choose the locales

The product ships English and Spanish. `DEFAULT_LOCALE` decides the language of a new
visitor; the profile and the language switcher change it per user.

- Web strings: `apps/web/src/locales/{en,es}/`, one catalog per feature. The Spanish
  file ends with `satisfies Messages`, so a missing key is a type error.
- API strings: `apps/api/resources/lang/{en,es}/`, JSON catalogs per domain.
- Emails: the templates in `apps/api/resources/views/emails/` and the catalogs above.

A new user-facing string is added to both languages in the same change.

## Remove what you do not need

The template is a starting point, and its features are separable. Before deleting,
find the files each feature owns in [architecture](../architecture.md); then remove the
routes, the pages, the services, the migrations and the tests that cover them.

| If you do not need… | Start with                                                               |
| ------------------- | ------------------------------------------------------------------------ |
| Payments            | The billing routes and page, the Creem webhook, the plans seeder         |
| The MCP server      | The `/mcp` route, the API keys, the MCP usage                            |
| The AI layer        | The chat page, the AI service and tools, the AI usage events             |
| The harness         | `plugins/dsh/`, `.claude/`, `.githooks/` and the docs that describe them |

Removing a layer is a change like any other: update `docs/architecture.md`, the
README and the tests in the same commit.

## Add the first feature

1. Read [architecture](../architecture.md). It names the file to imitate for every
   kind of change.
2. Create an OpenSpec change under `openspec/changes/<id>/`: proposal, spec delta,
   design and tasks with a layer tag (`[backend]`, `[frontend]`, `[ai]`, `[mcp]`,
   `[e2e]`, `[docs]`).
3. Validate it with `openspec validate <id> --strict`.
4. Implement, and cover every scenario with a test.
5. Archive it with `openspec archive <id>` when it ships.

The [harness](../harness.md) automates this loop when you use Claude Code, but the
loop is the repository's, not the plugin's.

## Keep the conventions

- Every user-facing string exists in both languages.
- A new endpoint is a route, a controller, a validator, a service and a transformer;
  the controller does HTTP only and the service owns the database.
- The web app never talks to the database; it uses the typed client generated from the
  API registry (`node ace codegen`).
- A new dependency needs a reason; the harness scripts are plain Node.
- A change that adds, removes or moves a workspace, a layer or a shared contract
  updates `docs/architecture.md`.
