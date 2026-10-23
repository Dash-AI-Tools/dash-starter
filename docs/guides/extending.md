---
type: Guide
title: Extending
description: Add features and components around the core with the generators and the feature registries, so a core update never touches them.
tags: [features, generators, components, storybook, extension]
status: stable
---

# Extending

The core is the code the template keeps evolving; a core update replaces it while it
is untouched ([updating](./updating.md)). The product lives in four folders the update
never writes. The generators create code there and register it, without editing a
core file.

## The ownership boundary

| Owned by the product                  | What goes there                                     |
| ------------------------------------- | --------------------------------------------------- |
| `apps/api/app/features/`              | The API features: routes, controllers and services  |
| `apps/api/tests/functional/features/` | The functional tests of the API features            |
| `apps/web/src/features/`              | The web features: pages, routes and navigation      |
| `packages/ui/src/custom/`             | The components of the product, next to the core kit |

The rest of `apps/api/app/`, `apps/web/src/` and `packages/ui/` is core. Editing a core
file works, but every update to a release that changed it keeps your version and
reports it, so the edit becomes a merge by hand. Keep customizations in the folders
above.

## Add a feature

```bash
npm run make:feature -- invoices
```

| Created                                                 | What it is                                                                                                     |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `apps/api/app/features/invoices/invoices_controller.ts` | `index` answers the feature state of the organization                                                          |
| `apps/api/app/features/invoices/invoices_service.ts`    | `invoicesOf(organization)`: an empty list to replace with the queries of the feature                           |
| `apps/api/app/features/invoices/routes.ts`              | `registerInvoicesRoutes(router)`: `GET orgs/:orgSlug/invoices` with `middleware.auth()` and `middleware.org()` |
| `apps/api/tests/functional/features/invoices.spec.ts`   | A member gets the state; a visitor without a session gets 401                                                  |
| `apps/web/src/features/invoices/invoices-page.tsx`      | The page, with `PageHeader` and the generic scaffold strings                                                   |
| `apps/web/src/features/invoices/invoices-page.test.tsx` | The page renders in English and Spanish                                                                        |
| `apps/web/src/features/invoices/routes.tsx`             | `invoicesRoutes` (the lazy page at `invoices`) and `invoicesNav` (the sidebar entry)                           |

It also adds the import and the call of `registerInvoicesRoutes` to
`apps/api/app/features/index.ts`, and the import and the spreads of `invoicesRoutes` and
`invoicesNav` to `apps/web/src/features/index.ts`. The result:

- Endpoint: `GET /api/v1/orgs/:orgSlug/invoices`.
- Page: `/app/:orgSlug/invoices`, in the main group of the sidebar for every member.

Then regenerate the typed client, so the web app knows the endpoint:

```bash
cd apps/api && node ace codegen
```

Folders and URL segments keep the kebab-case name; the API files use snake_case and the
identifiers PascalCase or camelCase. `npm run make:feature -- purchase-orders` writes
`apps/api/app/features/purchase-orders/purchase_orders_controller.ts`,
`apps/api/tests/functional/features/purchase_orders.spec.ts` and
`apps/web/src/features/purchase-orders/purchase-orders-page.tsx`.

The generated files are formatted with the Prettier of the project. The functional test
needs the test database, like every functional test ([testing](./testing.md)).

### Names the generators refuse

Both generators check everything before they write, print every problem, then
`Nothing was written.`, and exit 1. They refuse:

- A name that is not lowercase kebab-case: it starts with a letter, holds only `a-z`,
  `0-9` and `-`, and has no trailing or double hyphen.
- The reserved names `core`, `features`, `shared`, `app`, `api` and `ui`.
- A name whose folder (`make:feature`) or any target file already exists, or that a
  registry already registers.
- A registry whose marker is missing or appears more than once.

## The feature registries

Both registries are owned by the product. The core calls them; the generators edit them
only through their markers.

| Registry                         | Exports                                                 | Consumed by                                                                                                                                                   |
| -------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/app/features/index.ts` | `registerFeatureRoutes(router)`                         | `apps/api/start/routes.ts`, inside the `/api/v1` group. `node ace codegen` runs it, so the routes reach the typed client                                      |
| `apps/web/src/features/index.ts` | `featureRoutes: RouteObject[]`, `featureNav: NavItem[]` | `apps/web/src/main.tsx` spreads `featureRoutes` under `/app/:orgSlug`; `apps/web/src/lib/nav.ts` appends `featureNav` to the main group, in declaration order |

The API imports a feature through the `#features/*` alias of `apps/api/package.json`.

A marker is a whole line, indentation aside. A generator inserts its line right above the
marker, so the marker stays last. Keep the markers when you edit a registry by hand.

| File                              | Markers                                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/app/features/index.ts`  | `// features:imports` (top level), `// features:register` (inside `registerFeatureRoutes`)                                |
| `apps/web/src/features/index.ts`  | `// features:imports` (top level), `// features:routes` (inside `featureRoutes`), `// features:nav` (inside `featureNav`) |
| `packages/ui/src/custom/index.ts` | `// exports`                                                                                                              |

## Localize a feature

The generated page and its sidebar entry use two generic keys of the `common` catalog:
`featureScaffoldTitle` ("New feature") and `featureScaffoldDescription`. Two generated
features show the same label until each gets its own strings.

- Add the strings of the feature to both locales, `apps/web/src/locales/en/` and
  `apps/web/src/locales/es/`; the Spanish catalog must satisfy the shape of the English
  one, so a missing key is a type error.
- Point `labelKey` in the feature's `routes.tsx` and the page's `t()` calls at the new
  keys.
- API strings go to `apps/api/resources/lang/en/` and `apps/api/resources/lang/es/`.

The catalogs are core files. A new catalog file is kept by every update; the line that
registers it in `apps/web/src/locales/{en,es}/index.ts` is a core edit, which an update
to a release that changed the index reports for a merge by hand.

## Add a component

```bash
npm run make:component -- data-card
```

| Created or edited                              | What it is                                                    |
| ---------------------------------------------- | ------------------------------------------------------------- |
| `packages/ui/src/custom/data-card.tsx`         | `DataCard`: a `title` and children, built from the kit tokens |
| `packages/ui/src/custom/data-card.test.tsx`    | Renders the title and the content, merges the class names     |
| `packages/ui/src/custom/data-card.stories.tsx` | The `Custom/DataCard` stories: `Default` and `WithoutContent` |
| `packages/ui/src/custom/index.ts`              | `export { DataCard, type DataCardProps } from './data-card'`  |

Import the components of the product from the custom entry point, and the core
primitives from the package itself:

```tsx
import { Button } from '@dash/ui'
import { DataCard } from '@dash/ui/custom'
```

The core barrel, `packages/ui/src/index.ts`, is replaced by an update; the custom barrel
is not, so a generated component survives every update. The stylesheet,
`@dash/ui/styles.css`, is imported once by `apps/web/src/main.tsx`.

## Browse the components in Storybook

```bash
npm run storybook
```

Storybook serves the stories of `packages/ui/src/**/*.stories.tsx`, core and custom, on
<http://localhost:6006>, without opening a browser. The toolbar switches the palette and
the light or dark mode, with the same stylesheet as the app.

- Every core primitive has a story; `packages/ui/src/stories.test.ts` fails `npm test`
  when one is missing.
- It is a local tool: no build, Docker image or CI job builds or serves it, and its
  telemetry is off.

## The rules

- Product code goes into the feature folders and `packages/ui/src/custom/`, never into
  the core.
- A primitive of `packages/ui` never imports the web app: `packages/ui/src/boundaries.test.ts`
  fails on a page, provider, layout, catalog, API client or `@/` import.
- Every user-facing string exists in English and Spanish.
- An endpoint of a feature follows the layers of the API: controller for HTTP, service
  for the database ([architecture](../architecture.md)).
