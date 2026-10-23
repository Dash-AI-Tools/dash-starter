# core-extensions Specification

## Purpose
Keeps the template's UI and API cores upgradable and lets generated projects add features around them without editing core files.

## Requirements

### Requirement: Core ownership manifest

The project SHALL record its upstream template repository, installed version, core paths, user-owned paths, and a SHA-256 checksum for every core file in `.dash/core.json`.

#### Scenario: Generated project records its core state

- **WHEN** a project is generated from the template
- **THEN** `.dash/core.json` names the upstream repository and version and contains a checksum for every core file
- **AND** `apps/api/app/features`, `apps/web/src/features` and `packages/ui/src/custom` are listed as user-owned

#### Scenario: Feature files are outside the core

- **WHEN** a feature is added under the user-owned feature directories
- **THEN** no file of that feature appears in the core checksums

### Requirement: Upstream core update

The project SHALL provide a `core:update` command that downloads a template release, defaulting to the latest release and accepting `--to <version|ref>`, and updates only core files whose current checksum matches the recorded one.

#### Scenario: Untouched core file is updated

- **WHEN** the upstream release changes a core file that the project has not modified
- **THEN** `core:update` replaces that file and records its new checksum

#### Scenario: Locally modified core file is preserved

- **WHEN** the upstream release changes a core file that the project has modified
- **THEN** `core:update` leaves the file untouched, reports it as modified, and exits non-zero

#### Scenario: New and removed core files

- **WHEN** the upstream release adds a core file or removes an untouched one
- **THEN** `core:update` adds or deletes that file in the project

#### Scenario: Repeated update is harmless

- **WHEN** `core:update` runs again after a successful update
- **THEN** it reports no changes and writes nothing

### Requirement: Identity-safe updates

The updater SHALL reapply the identity values and template transformations recorded at install time to the downloaded release before comparing files, so a rebranded or localized project updates without restoring template branding.

#### Scenario: Rebrand survives an update

- **WHEN** a project generated as "Acme AI" updates a core file that the template rebrands
- **THEN** the updated file still says "Acme AI" and does not contain the template product name

#### Scenario: Locale and palette survive an update

- **WHEN** a project generated with Spanish and the forest palette updates its core
- **THEN** the default locale remains Spanish and the default palette remains forest

### Requirement: Update preview and failure safety

`core:check` and `core:update --dry-run` SHALL report pending changes without writing, and a failed download, transformation, or rejected path SHALL exit non-zero before any project file is written.

#### Scenario: Dry run changes nothing

- **WHEN** `core:update --dry-run` finds an update
- **THEN** it lists the files it would update and leaves every project file byte-for-byte unchanged

#### Scenario: Download failure leaves the project intact

- **WHEN** the upstream release cannot be downloaded
- **THEN** the command exits non-zero and no project file changes

#### Scenario: Unsafe path is rejected

- **WHEN** a release file would resolve outside the project directory
- **THEN** the command exits non-zero and writes nothing

### Requirement: Backend feature extension

Core API routing SHALL load routes from the user-owned `apps/api/app/features` registry inside `/api/v1`, so a feature endpoint can be added without editing a core file.

#### Scenario: Feature endpoint is served

- **WHEN** a feature registers a route in the backend feature registry
- **THEN** the endpoint responds under `/api/v1` without a change to `apps/api/start/routes.ts`

#### Scenario: Feature endpoint reaches the typed client

- **WHEN** the API codegen runs after a feature is registered
- **THEN** the generated client registry includes the feature endpoint

### Requirement: Web feature extension

Core web routing and navigation SHALL merge the user-owned `apps/web/src/features` registry, so a feature page and its navigation entry can be added without editing the core router or navigation list.

#### Scenario: Feature page is reachable

- **WHEN** a feature exports a route from the web feature registry
- **THEN** the page renders under `/app/:orgSlug/<feature>`

#### Scenario: Feature navigation entry is visible

- **WHEN** a feature exports a navigation entry from the web feature registry
- **THEN** the sidebar shows the entry for a member who can reach it

#### Scenario: Core router stays unchanged

- **WHEN** a feature is added through the generator
- **THEN** `apps/web/src/main.tsx` and the core navigation list are not edited

### Requirement: Feature generator

The `make:feature <name>` command SHALL scaffold a web page, an API controller, service and routes, tests, and both registrations; it SHALL accept only an unused kebab-case name and SHALL write nothing for invalid input.

#### Scenario: Generated feature works end to end

- **WHEN** a developer runs `make:feature invoices`
- **THEN** the page is reachable, the API endpoint responds, and the generated tests pass

#### Scenario: Invalid name is rejected

- **WHEN** the name is not kebab-case, already exists, or is reserved
- **THEN** the command exits non-zero and creates no files

### Requirement: Component generator

The `make:component <name>` command SHALL add a component, a test, and a story to the UI workspace and export the component; it SHALL accept only an unused kebab-case name and SHALL write nothing for invalid input.

#### Scenario: Generated component is usable

- **WHEN** a developer runs `make:component data-card`
- **THEN** the component can be imported from the custom entry point of the UI package and its story appears in Storybook
- **AND** the component lives outside the checksum-managed core, so a later core update cannot remove it

#### Scenario: Invalid component name is rejected

- **WHEN** the name is not kebab-case or the component already exists
- **THEN** the command exits non-zero and creates no files

### Requirement: Showcase removal

The `remove:showcase` command SHALL delete the in-app showcase page, route, tests, and strings while keeping Home, the dashboard, the UI kit, and Storybook; it SHALL record the removal so a later update does not restore it, and running it again SHALL be a successful no-op.

#### Scenario: Showcase is removed without touching the product

- **WHEN** a generated project runs `remove:showcase`
- **THEN** the showcase route is gone and Home, the dashboard, the UI kit, and Storybook still work
- **AND** the project passes lint, typecheck, and tests

#### Scenario: Second run is a no-op

- **WHEN** `remove:showcase` runs on a project that no longer has the showcase
- **THEN** it exits successfully and changes no file

#### Scenario: An update keeps the showcase removed

- **WHEN** a project with the showcase removed runs `core:update` against a newer release that still contains the showcase
- **THEN** the updated project has no showcase route, page or strings
- **AND** the update reports no conflict for the removed files

#### Scenario: Protected files are never deleted

- **WHEN** the command runs
- **THEN** the Home page, the dashboard page and layout, the app shell components, the patterns, and the UI workspace remain
