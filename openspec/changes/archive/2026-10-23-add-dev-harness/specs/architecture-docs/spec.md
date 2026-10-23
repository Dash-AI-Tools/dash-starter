# Spec Delta

## Purpose

Gives agents and developers one accurate map of the starter: its layers, module boundaries, data flow, conventions, where each kind of change lives and the commands that build and check it.

## ADDED Requirements

### Requirement: Architecture reference
The repository SHALL contain `docs/architecture.md` describing the workspaces, the layers of the API and the web app, the shared AI tool registry used by chat and MCP, persistence and migrations, configuration and environment handling, localization, tests and CI.

#### Scenario: New contributor locates a change
- **WHEN** someone needs to add an API endpoint, a page, an AI tool or an MCP capability
- **THEN** `docs/architecture.md` names the directories, the existing file to imitate and the tests to add for that kind of change

### Requirement: Real commands
The architecture reference SHALL list the exact commands to build, test, lint, format and typecheck each workspace and the whole repository, and each listed command SHALL succeed on a clean checkout of the template.

#### Scenario: Commands are runnable
- **WHEN** each command listed in `docs/architecture.md` is run on a clean checkout with the documented Node version and the Compose stack up
- **THEN** it exits with code 0

### Requirement: Reference stays current
When a change adds, removes or moves a workspace, layer, module boundary or shared contract, the same change SHALL update `docs/architecture.md`.

#### Scenario: New shared contract
- **WHEN** a change introduces a new shared contract (for example a new registry or a new workspace)
- **THEN** the change's tasks include updating `docs/architecture.md`, and the review fails if the document still describes the old structure

### Requirement: Entry point for agents
`CLAUDE.md` at the repository root SHALL point to the architecture reference, the harness guide and the OpenSpec workflow in a short section, without duplicating their content.

#### Scenario: Agent session starts
- **WHEN** a Claude Code session opens the repository
- **THEN** `CLAUDE.md` tells it where the architecture, the harness and the workflow are documented
