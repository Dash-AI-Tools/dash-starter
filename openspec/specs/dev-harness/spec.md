# dev-harness Specification

## Purpose
Packages a Claude Code harness specialized for this starter: namespaced commands and specialist agents that know the repository's real layers, paths, patterns and commands, so features are built the same way every time.

## Requirements

### Requirement: Namespaced harness
The harness SHALL be delivered as a project-local Claude Code plugin named `dsh` that is enabled by the repository's shared settings, so every harness command is invoked as `/dsh:<name>` and every harness agent is addressed as `dsh:<agent>`.

#### Scenario: Teammate opens the repository
- **WHEN** a developer opens the repository in Claude Code and accepts the project's plugin
- **THEN** the `/dsh:` commands and `dsh:` agents are available without copying files into their home directory

#### Scenario: No clash with built-ins
- **WHEN** a developer types `/review` or `/security-review`
- **THEN** Claude Code's built-in commands run, and the harness review stays at `/dsh:review`

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

### Requirement: Orchestrated feature flow
`/dsh:feature <name>` SHALL run the feature through `feature-orchestrator`, which plans from the OpenSpec change, assigns layer-tagged tasks to the matching specialists, integrates their results and runs `/dsh:review` before reporting.

#### Scenario: Feature across layers
- **WHEN** a developer runs `/dsh:feature real-dashboard-metrics`
- **THEN** backend tasks go to `backend-dev`, frontend tasks to `frontend-dev`, end-to-end tasks to `e2e-tester` and documentation tasks to `docs-writer`, and the final report lists each task's state and the review result

### Requirement: Scoped flows
`/dsh:backend`, `/dsh:frontend`, `/dsh:mcp-capability` and `/dsh:ai-capability` SHALL run a single specialist on a change limited to its layer, refusing work outside that layer.

#### Scenario: Scoped MCP capability
- **WHEN** a developer runs `/dsh:mcp-capability` to expose a new read tool
- **THEN** `mcp-dev` adds it through the shared tool registry with its input schema, required scope, metering, tests and `docs/mcp.md` entry, and touches no web code

### Requirement: Review command
`/dsh:review` SHALL check the current diff with the repository's formatter, linter, typecheck, unit and functional tests, the end-to-end suite and `security-reviewer`, and SHALL report each step's result without fixing security findings silently.

#### Scenario: Failing step
- **WHEN** any step of `/dsh:review` fails
- **THEN** the report names the step, the command and the failing output, and the overall result is failed

#### Scenario: Security finding
- **WHEN** `security-reviewer` finds an issue
- **THEN** it is reported with file, line, severity and a proposed fix, and no file is changed without the developer's approval

### Requirement: Documentation sync
`/dsh:docs` SHALL bring `docs/`, the READMEs and `docs/architecture.md` in line with the current changes through `docs-writer`.

#### Scenario: New MCP tool documented
- **WHEN** the current diff adds an MCP tool and `/dsh:docs` runs
- **THEN** `docs/mcp.md` lists the tool with its scope and input, in the same format as the existing tools

### Requirement: Security reviewer coverage
`security-reviewer` SHALL check diffs for OWASP Top 10 issues, committed secrets, authentication and authorization gaps (including tenant isolation), injection including prompt injection, unsafe MCP tool exposure and vulnerable dependencies, using `npm audit` and any scanner already installed.

#### Scenario: Missing tenant check
- **WHEN** a diff adds an organization route outside the organization middleware group
- **THEN** the reviewer reports a tenant-isolation finding

#### Scenario: Scanner not installed
- **WHEN** semgrep or gitleaks is not installed
- **THEN** the reviewer says which scanners were skipped and does not install them

### Requirement: OpenCode support
The harness SHALL be available in OpenCode with the same agents and commands, generated from the files of the Claude Code plugin, which stay the only source: the commands as `/dsh/<name>`, the agents as `dsh/<agent>` subagents with the permissions of their Claude Code tools, and the entry point `CLAUDE.md` loaded as the instructions of the project. A generated file that no longer matches its source SHALL fail the test command of the plugin.

#### Scenario: Teammate opens the repository in OpenCode
- **WHEN** a developer opens the repository in OpenCode
- **THEN** the `/dsh/` commands and the `dsh/` subagents are available, `CLAUDE.md` is part of the instructions, and no file is copied into their home directory

#### Scenario: Read-only agent in OpenCode
- **WHEN** the OpenCode `dsh/security-reviewer` subagent is read
- **THEN** it denies the edit and subagent actions, as its Claude Code definition has no `Edit`, `Write` or `Agent` tool

#### Scenario: Agent edited without regenerating
- **WHEN** an agent or a skill of `plugins/dsh` changes and the OpenCode files are not regenerated
- **THEN** `npm test -w @dash/dsh` fails and names the stale file and the command that regenerates it

### Requirement: Harness guide
`docs/harness.md` SHALL explain what each agent and command does, when to use it, and the single-feature, scoped-change and parallel-features workflows.

#### Scenario: Choosing a command
- **WHEN** a developer wants to change only the web app
- **THEN** `docs/harness.md` points them to `/dsh:frontend` and shows the expected flow
