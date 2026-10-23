# Proposal

## Why

The starter is a fork-and-edit template: every product that uses it owns a full copy of the design system and the API layers, so upstream fixes cannot reach it without a manual merge, and the first feature a team adds edits the same files the template must keep evolving. The component kit is also visible only through an in-app development page, and that page cannot be removed cleanly after install.

## What Changes

- Extract the design-system primitives and their tokens into a new `@dash/ui` workspace consumed by the web app. Add local-only Storybook with a story for every primitive. Keep the existing in-app showcase for app-level patterns.
- Define the API core with a versioned manifest instead of moving every file. Add `apps/api/app/features/` and `apps/web/src/features/` as user-owned extension points; core auto-registers their routes and navigation.
- Add `@dash/core-tools` with four commands:
  - `core:update` and `core:check` sync untouched core files from an upstream template release, preserve local edits, and report conflicts.
  - `make:feature <name>` scaffolds a web page, API controller/service/routes, tests, and both registrations.
  - `make:component <name>` scaffolds a `@dash/ui` component, test, and story.
  - `remove:showcase` deletes the in-app showcase page, route, tests, and strings while keeping Home, the dashboard, the UI kit, and Storybook.
- Record identity, installer replacements, core paths, and file checksums in `.dash/` so an update reapplies rebranding instead of reporting false conflicts. Generated projects include the tooling.
- Update root scripts, documentation, CI, and installer verification. Storybook remains a local development tool: it is not built, deployed, or run in CI.
- **BREAKING** web imports move from `@/components/ui/*` to `@dash/ui`, and the app stylesheet moves to `@dash/ui/styles.css`.

## Capabilities

### New Capabilities

- `core-extensions`: core ownership and upstream updates, the API and web feature registries, the component/feature generators, and the showcase removal command.

### Modified Capabilities

- `ui-components`: the kit becomes an isolated `@dash/ui` workspace with local Storybook; the in-app showcase remains available and can be removed on demand.
- `project-installer`: generated projects carry update metadata and the core tooling, and the installer verification exercises an update-safe, showcase-free project.
- `quality-tooling`: CI verifies the generated project after removing the showcase and does not build Storybook.

## Impact

- **Workspaces**: new `packages/ui` and `packages/core-tools`; `apps/web` depends on `@dash/ui`; `apps/api` gains a feature registry and import alias; `packages/create-app` shares template materialization with `@dash/core-tools`.
- **Web**: all `components/ui` files and the design-token stylesheet move; app imports and the showcase are updated; `main.tsx` spreads feature routes and navigation.
- **API**: `start/routes.ts` registers feature routes; `app/features/` is user-owned; codegen must still see the generated routes.
- **Tooling**: new root scripts (`core:update`, `core:check`, `make:feature`, `make:component`, `remove:showcase`, `storybook`), local Storybook dev dependencies, and `giget` for release downloads.
- **Data**: none. No database migration, no API response change, no hosted service.
- **Compatibility**: generated projects keep Node `>=24.22.1`; existing products that adopt the change must update web imports and the stylesheet import.
