# spec-driven-workflow Specification

## Purpose
Makes OpenSpec the single path for feature work in the harness: every feature is proposed, validated, applied from its tasks, verified against its scenarios and archived, so specs and code never drift apart.

## Requirements

### Requirement: Feature starts from a change
`/dsh:feature` and the scoped commands SHALL work from an OpenSpec change; when none exists for the request, they SHALL propose one (proposal, specs, design when needed, tasks) and stop for the developer's review before implementing.

#### Scenario: No change yet
- **WHEN** a developer runs `/dsh:feature dashboard-metrics` and no such change exists
- **THEN** the change is proposed, validated with `openspec validate --strict`, and the command stops with the artifacts and open questions instead of writing code

### Requirement: Layer-tagged tasks
Tasks in a change worked by the harness SHALL carry a layer tag (`[backend]`, `[frontend]`, `[ai]`, `[mcp]`, `[docs]`, `[e2e]`) that maps each task to exactly one specialist agent.

#### Scenario: Untagged task
- **WHEN** the orchestrator reads a task without a layer tag
- **THEN** it asks to tag it (or tags it in the change with the developer's approval) before assigning it

### Requirement: Work stays inside the spec
Agents SHALL only implement work described by the change's tasks and SHALL check each task off when its verification passes; when work outside the tasks is needed, the change's artifacts SHALL be updated first.

#### Scenario: Scope grows
- **WHEN** an agent finds that a task needs a migration the change does not mention
- **THEN** it stops, proposes the artifact update, and continues only after the change is updated and validated

### Requirement: Scenario coverage
Before a change is reported done, every scenario in its spec deltas SHALL be covered by at least one unit, functional or end-to-end test, and `/dsh:review` SHALL report scenarios without a test.

#### Scenario: Uncovered scenario
- **WHEN** a change has a scenario that no test exercises
- **THEN** `/dsh:review` lists it and the change is not reported done

### Requirement: Archive closes the loop
When a change's tasks are complete and its review passes, the harness SHALL archive it with its spec deltas synced into `openspec/specs/`, and update `docs/` when the change altered documented behavior.

#### Scenario: Archive after review
- **WHEN** a feature's review passes and all tasks are checked
- **THEN** the orchestrator offers to archive, and archiving syncs the main specs and leaves no active change for that feature
