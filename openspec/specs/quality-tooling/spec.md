# quality-tooling Specification

## Purpose

Ensures every project generated from the template ships with consistent linting, formatting, typechecking, unit tests, end-to-end tests and a CI pipeline that blocks regressions.

## Requirements

### Requirement: Lint, format and typecheck
The repository SHALL provide root commands that lint, check formatting and typecheck all workspaces, and the template SHALL pass them with zero errors.

#### Scenario: Clean template
- **WHEN** `npm run lint`, `npm run format:check` and `npm run typecheck` run at the root of a freshly generated project
- **THEN** all exit with code 0

#### Scenario: Lint failure
- **WHEN** a developer introduces an unused variable
- **THEN** `npm run lint` exits non-zero naming the file and rule

### Requirement: Unit and integration tests
The API SHALL have unit tests and database-backed functional tests, and the web app SHALL have component and hook unit tests, all runnable with one root command.

#### Scenario: Root test command
- **WHEN** `npm test` runs with the test database available
- **THEN** API unit, API functional and web unit suites run and report results

### Requirement: End-to-end tests
The project SHALL include browser end-to-end tests against the running stack covering sign up with email verification, login, onboarding, inviting and accepting a member, switching language, cookie consent, AI chat with the stub provider, API key creation with an MCP call, and a simulated paid subscription.

#### Scenario: E2E run
- **WHEN** the e2e command runs against the started stack
- **THEN** all listed journeys pass in Chromium, with traces saved for failures

### Requirement: Continuous integration

CI SHALL run on pull requests and the default branch, executing lint, format check, typecheck, unit/functional tests with a Postgres service, the web build and the e2e suite, and SHALL fail the run if any step fails. CI SHALL NOT build, serve or deploy Storybook.

#### Scenario: Failing test blocks merge

- **WHEN** a pull request breaks a unit test
- **THEN** the CI run fails

#### Scenario: Storybook is not a CI artifact

- **WHEN** CI completes successfully
- **THEN** no Storybook build, deployment or uploaded artifact was produced

### Requirement: Installer verification

The template repository's CI SHALL generate a project with the installer non-interactively and run that project's lint, typecheck and tests, and SHALL repeat them after removing the showcase.

#### Scenario: Installer regression

- **WHEN** a change breaks placeholder replacement
- **THEN** the installer CI job fails

#### Scenario: Showcase removal in a generated project

- **WHEN** the generated project runs the showcase removal command
- **THEN** its lint, typecheck and tests still pass
- **AND** Home and the dashboard pages are still present

### Requirement: Core tooling tests

The root test command SHALL run the core tooling's unit tests, covering core updates, the generators and showcase removal.

#### Scenario: Tooling regression fails the suite

- **WHEN** an update, generator or removal test fails
- **THEN** the root test command exits non-zero and names the failing test

#### Scenario: Tooling is tested without the network

- **WHEN** the core tooling tests run
- **THEN** they use a local fixture or a mocked release and require no GitHub access
