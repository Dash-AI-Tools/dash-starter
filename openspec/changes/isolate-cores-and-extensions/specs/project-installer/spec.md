# Spec Delta

## ADDED Requirements

### Requirement: Record update metadata

The installer SHALL write `.dash/install.json` with the resolved identity and template transformations and `.dash/core.json` with the upstream repository, version, core paths, user-owned paths, and a SHA-256 checksum of every core file.

#### Scenario: Generated project carries update metadata

- **WHEN** generation completes
- **THEN** `.dash/install.json` names the product identity used for rebranding
- **AND** `.dash/core.json` names the upstream repository and version and contains a checksum for every core file

#### Scenario: Metadata contains no secrets

- **WHEN** the generated project is inspected
- **THEN** `.dash/install.json` and `.dash/core.json` contain no environment value, signing key, webhook secret, or provider key

## MODIFIED Requirements

### Requirement: Scaffold a new project with npx

The installer SHALL be runnable with `npx create-dash-starter@<version> [directory]` and SHALL create the new project in the target directory from the template release matching the installer version.

#### Scenario: Create project in a new directory

- **WHEN** a developer runs `npx create-dash-starter my-product` and answers the prompts
- **THEN** a `my-product` directory is created containing the API app, the web app, the UI workspace, the core tooling, the update metadata, the Docker Compose files, tests and CI configuration from the template

#### Scenario: Target directory is not empty

- **WHEN** the target directory exists and contains files
- **THEN** the installer aborts without writing anything and explains that an empty or new directory is required

### Requirement: Generated project excludes installer internals

The generated project SHALL NOT contain the installer package, the template's OpenSpec change history or template-only CI jobs, while keeping the update metadata and the core tooling.

#### Scenario: Clean output

- **WHEN** generation completes
- **THEN** `packages/create-app` and `openspec/changes` are absent from the generated project
- **AND** `packages/core-tools` and `.dash/core.json` are present
