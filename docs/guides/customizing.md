---
type: Guide
title: Customizing
description: Rename the product, change the palette and the locales, drop what you do not need, remove the showcase and add the first feature.
tags: [customize, branding, palette, locales, features, showcase]
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

The product ships six palettes: `line` (the default), `ink`, `ocean`, `forest`, `plum`
and `ember`, each with light and dark tokens in `packages/ui/src/styles/palettes.css`,
part of the stylesheet of the UI kit (`@dash/ui/styles.css`) that the web app and
Storybook both read. Components only read tokens, so a palette re-colours everything
without code changes.

- Every visitor sees one default palette. Pass `--palette <id>` to the installer, or
  change one line of `apps/web/src/lib/palettes.ts` later:

  ```ts
  export const DEFAULT_PALETTE: PaletteId = 'ocean'
  ```

  An unknown id fails `npm run typecheck`.

- Signed-in users pick a palette in the dashboard top bar. A pick applies at once, is
  saved in `users.palette`, follows the user to every device and overrides the default
  for that user only. A user who never picked one sees the default.
- `DEMO_MODE=true` in the root `.env` shows a palette picker on the public site, so
  visitors without an account can try every palette. Their pick is remembered in their
  browser only; signing in replaces it with the palette saved in the account, or with
  the default. The template runs with it on; the installer turns it off in every new
  project. The web app reads it as `VITE_DEMO_MODE`, at dev-server start in Compose and
  at build time in the production image, so a change needs a restart or a rebuild.
- To add a palette, add a light block (`[data-palette='<id>']`) and a dark block
  (`.dark[data-palette='<id>'], .dark [data-palette='<id>']`) to `palettes.css` with
  every token of the `line` blocks, add the id to `PALETTE_IDS`, its name to the
  `palette…` keys in `apps/web/src/locales/{en,es}/common.ts` and the id to the
  `palette` enum of `apps/api/app/validators/profile.ts`. `npm test` fails until the
  palette defines every token, meets WCAG AA contrast and keeps its six station
  colours apart.

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

## Remove the showcase

The component showcase is a development page at `/app/:orgSlug/dev/components`. Once the
product has its own screens, remove it with one command:

```bash
npm run remove:showcase
```

| Deletes                                                                                                                                                                                                  | Edits                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/pages/ShowcasePage.tsx`, `apps/web/src/pages/showcase.test.tsx`, `apps/web/src/pages/showcase.build.test.ts`, `apps/web/src/locales/en/showcase.ts`, `apps/web/src/locales/es/showcase.ts` | `apps/web/src/main.tsx` (the route block between its showcase markers), `apps/web/src/locales/en/index.ts` and `apps/web/src/locales/es/index.ts` (the showcase lines) |

- It keeps the Home page, the dashboard, the layouts, the app shell, the patterns, the UI
  kit (`packages/ui`) and Storybook (`npm run storybook`). Those paths are protected: the
  command never deletes them.
- It checks everything first. A missing marker, or a reference to the showcase in any
  other web source, stops it with the reason and no change.
- It is safe to run twice: on a project without the showcase it prints
  `The showcase is already removed: nothing changed.` and exits 0.
- In a generated project it records the removal in the update metadata, so a later
  `npm run core:update` never brings the showcase back ([updating](./updating.md)). In
  a clone of the template it removes the showcase and says the removal was not recorded.
- After it, `VITE_ENABLE_SHOWCASE` has nothing left to enable.

Run `npm run lint && npm run typecheck && npm test` afterwards, and commit the result.

## Add the first feature

1. Read [architecture](../architecture.md). It names the file to imitate for every
   kind of change.
2. Create an OpenSpec change under `openspec/changes/<id>/`: proposal, spec delta,
   design and tasks with a layer tag (`[backend]`, `[frontend]`, `[ai]`, `[mcp]`,
   `[e2e]`, `[docs]`).
3. Validate it with `openspec validate <id> --strict`.
4. Scaffold the feature outside the core, then implement it, and cover every scenario
   with a test:

   ```bash
   npm run make:feature -- invoices
   npm run make:component -- data-card     # when the feature needs its own component
   cd apps/api && node ace codegen
   ```

5. Archive it with `openspec archive <id>` when it ships.

The [harness](../harness.md) automates this loop when you use Claude Code, but the
loop is the repository's, not the plugin's.

### Where a new feature lives

The generators put a feature in folders the core update never writes
([extending](./extending.md)). For `npm run make:feature -- invoices`:

| Piece                              | Path                                                                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| API routes, controller and service | `apps/api/app/features/invoices/` (`routes.ts`, `invoices_controller.ts`, `invoices_service.ts`)   |
| API functional test                | `apps/api/tests/functional/features/invoices.spec.ts`                                              |
| API registration                   | `apps/api/app/features/index.ts`                                                                   |
| Web page, its test, routes and nav | `apps/web/src/features/invoices/` (`invoices-page.tsx`, `invoices-page.test.tsx`, `routes.tsx`)    |
| Web registration                   | `apps/web/src/features/index.ts`                                                                   |
| A component of the product         | `packages/ui/src/custom/`, imported from `@dash/ui/custom` (`npm run make:component -- <name>`)    |
| Strings                            | `apps/web/src/locales/{en,es}/` and `apps/api/resources/lang/{en,es}/`, by hand, in both languages |

The endpoint is `GET /api/v1/orgs/:orgSlug/invoices` and the page is
`/app/:orgSlug/invoices`. Editing a core file instead works, but every core update to a
release that changed that file keeps your version and reports it for a merge by hand.

## Keep the conventions

- Every user-facing string exists in both languages.
- A new endpoint is a route, a controller, a validator, a service and a transformer;
  the controller does HTTP only and the service owns the database.
- The web app never talks to the database; it uses the typed client generated from the
  API registry (`node ace codegen`).
- A new dependency needs a reason; the harness scripts are plain Node.
- Product code goes into the feature folders and `packages/ui/src/custom/`, not into
  the core, so `npm run core:update` can keep replacing the core.
- UI primitives come from `@dash/ui`; the components of the product from
  `@dash/ui/custom`.
- A change that adds, removes or moves a workspace, a layer or a shared contract
  updates `docs/architecture.md`.
