# Spec Delta

## MODIFIED Requirements

### Requirement: Specialist agents

The harness SHALL provide the agents `feature-orchestrator`, `backend-dev`, `frontend-dev`, `mcp-dev`, `ai-dev`, `docs-writer`, `e2e-tester` and `security-reviewer`. Each definition SHALL state its scope, the paths it owns, the paths it must not touch, the commands it runs and its definition of done, using this repository's real paths and commands. The definition of every agent that writes code SHALL tell it to scaffold through the generators of the harness before writing a file by hand, and to read the trimmed check output instead of the raw one.

#### Scenario: Agent definition is complete

- **WHEN** any harness agent definition is read
- **THEN** it contains the sections scope, owns, must not touch, commands and definition of done, and every path it names exists in the repository

#### Scenario: Specialist stays in its lane

- **WHEN** `frontend-dev` is asked to implement a task that needs a new API endpoint
- **THEN** it stops and reports the missing backend task instead of editing `apps/api/`

#### Scenario: A specialist generates before it writes

- **WHEN** any agent that writes code is read, in Claude Code or in the generated OpenCode copy
- **THEN** its commands name the generator script and the trimmed check script, and it is told to write by hand only a layer the generators do not cover
