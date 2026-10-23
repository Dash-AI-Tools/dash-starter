# Spec Delta

## ADDED Requirements

### Requirement: Core tooling tests

The root test command SHALL run the core tooling's unit tests, covering core updates, the generators and showcase removal.

#### Scenario: Tooling regression fails the suite

- **WHEN** an update, generator or removal test fails
- **THEN** the root test command exits non-zero and names the failing test

#### Scenario: Tooling is tested without the network

- **WHEN** the core tooling tests run
- **THEN** they use a local fixture or a mocked release and require no GitHub access

## MODIFIED Requirements

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
