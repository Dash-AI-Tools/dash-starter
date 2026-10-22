# project-installer Specification

## Purpose

Lets a developer create a new, fully configured product repository from the starter template with a single `npx` command.

## Requirements

### Requirement: Scaffold a new project with npx
The installer SHALL be runnable with `npx create-dash-starter@<version> [directory]` and SHALL create the new project in the target directory from the template release matching the installer version.

#### Scenario: Create project in a new directory
- **WHEN** a developer runs `npx create-dash-starter my-product` and answers the prompts
- **THEN** a `my-product` directory is created containing the API app, web app, Docker Compose files, tests and CI configuration from the template

#### Scenario: Target directory is not empty
- **WHEN** the target directory exists and contains files
- **THEN** the installer aborts without writing anything and explains that an empty or new directory is required

### Requirement: Collect project identity
The installer SHALL prompt for product name, project slug, short description, default locale (`en` or `es`) and support email, and SHALL accept each as a command-line flag so it can run non-interactively.

#### Scenario: Non-interactive run
- **WHEN** the developer runs the installer with `--name "Acme AI" --slug acme-ai --locale es --yes`
- **THEN** no prompts are shown and the project is generated with those values and defaults for the rest

#### Scenario: Invalid slug
- **WHEN** the developer enters a slug that is not lowercase kebab-case
- **THEN** the installer rejects it and asks again (or exits non-zero in non-interactive mode)

### Requirement: Rebrand the template
The installer SHALL replace every template placeholder (package names, Docker Compose project and database names, product name in both locales, emails' sender name, page titles, README) with the collected identity, leaving no template product name in the generated project.

#### Scenario: No template name remains
- **WHEN** generation completes
- **THEN** a case-insensitive search for the template placeholder name in the generated project returns no matches outside `node_modules`

### Requirement: Generate environment and secrets
The installer SHALL write `.env` files from the `.env.example` files, generate a unique `APP_KEY` and webhook/MCP secrets, and SHALL optionally prompt for Brevo, Creem and AI provider keys; skipped keys are left empty with local fallbacks active.

#### Scenario: Secrets are unique per project
- **WHEN** two projects are generated
- **THEN** their `APP_KEY` values differ and neither equals any value committed in the template

#### Scenario: Provider keys skipped
- **WHEN** the developer skips the Brevo, Creem and AI key prompts
- **THEN** the generated project still boots locally using Mailpit, Creem test-mode placeholders and the stub AI provider

#### Scenario: Secrets are not committed
- **WHEN** the installer initializes git
- **THEN** no `.env` file is staged or committed

### Requirement: Initialize repository
The installer SHALL initialize a git repository with an initial commit and SHALL optionally create a remote GitHub repository when the GitHub CLI is installed and authenticated.

#### Scenario: GitHub repository requested
- **WHEN** the developer opts in to creating a GitHub repository and `gh` is authenticated
- **THEN** a private repository named after the slug is created and the initial commit is pushed

#### Scenario: GitHub CLI unavailable
- **WHEN** the developer opts in but `gh` is missing or unauthenticated
- **THEN** the installer skips remote creation, keeps the local repository and prints the manual command

### Requirement: Optional first boot
The installer SHALL optionally install dependencies, start the Docker Compose stack, run migrations and seed data, and SHALL print the local URLs and next steps.

#### Scenario: First boot succeeds
- **WHEN** the developer opts in and Docker is running
- **THEN** the stack starts, migrations and seeds run, and the installer prints the web, API and Mailpit URLs

#### Scenario: Docker not available
- **WHEN** Docker is not installed or not running
- **THEN** the installer finishes generation, skips boot and prints the commands to run later

### Requirement: Generated project excludes installer internals
The generated project SHALL NOT contain the installer package, the template's OpenSpec change history or template-only CI jobs.

#### Scenario: Clean output
- **WHEN** generation completes
- **THEN** `packages/create-app` and `openspec/changes` are absent from the generated project
