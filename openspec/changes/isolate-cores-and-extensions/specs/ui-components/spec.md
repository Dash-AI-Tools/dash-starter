# Spec Delta

## ADDED Requirements

### Requirement: Isolated UI workspace

The primitive components and their design tokens SHALL live in a dedicated workspace package consumed by the web app; the primitives SHALL NOT import app-only modules, and app-specific patterns SHALL remain outside the package.

#### Scenario: Web app consumes the UI package

- **WHEN** the web app renders a primitive such as a button, input, or dialog
- **THEN** it imports the component from the UI workspace and the production build passes

#### Scenario: Primitives have no app dependencies

- **WHEN** the UI workspace is type-checked and tested on its own
- **THEN** no primitive imports a page, a provider, an API client, or a locale catalog from the web app

#### Scenario: Tokens have one source

- **WHEN** a design token changes in the UI workspace
- **THEN** the web app and Storybook both reflect the change without a second copy of the token

### Requirement: Local Storybook

The UI workspace SHALL provide a local Storybook that renders a story for every primitive in the inventory using the same design tokens, and Storybook SHALL NOT be part of the production app build, the Docker images, CI, or a deployment.

#### Scenario: Every primitive has a story

- **WHEN** a developer opens Storybook
- **THEN** every primitive in the inventory has at least one story showing its main variants

#### Scenario: Storybook is local only

- **WHEN** the production image or the CI pipeline runs
- **THEN** it neither builds nor serves Storybook, and no Storybook asset appears in the web build

#### Scenario: One command starts the local stories

- **WHEN** a developer runs the documented Storybook command at the repository root
- **THEN** the story browser starts locally without an account or a hosted service

## MODIFIED Requirements

### Requirement: Showcase availability

The showcase page SHALL be available in development builds and SHALL be excluded from production builds unless explicitly enabled. It SHALL also be removable with a documented command, after which the app SHALL keep Home, the dashboard, and the component kit.

#### Scenario: Production build

- **WHEN** the web app is built for production with default settings
- **THEN** the showcase route responds with the not-found page

#### Scenario: Showcase is removable after install

- **WHEN** a generated project runs the showcase removal command
- **THEN** the showcase route and its page are gone
- **AND** Home, the dashboard, and the component kit still render and the project still passes its checks
