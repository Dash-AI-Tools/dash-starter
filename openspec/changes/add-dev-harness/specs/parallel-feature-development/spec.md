# Spec Delta

## Purpose

Lets several features be developed at the same time safely: each in its own OpenSpec change, branch and git worktree, with conflicts found up front, shared contracts landed first and a defined merge order.

## ADDED Requirements

### Requirement: One change, branch and worktree per feature
`/dsh:parallel-features <change-ids...>` SHALL give each change its own branch and git worktree, created from the current base branch, and run that feature's work only inside its worktree.

#### Scenario: Two features
- **WHEN** a developer runs `/dsh:parallel-features dashboard-metrics billing-summary-tool`
- **THEN** two worktrees and two branches exist, one per change, and each feature's edits land only in its worktree

### Requirement: Overlap analysis first
Before any worktree is created, the orchestrator SHALL analyze the changes for overlapping files, shared contracts (API routes and transformers, web API client types, migrations, the tool registry and MCP tool schemas, locale catalogs, design tokens) and conflicting migrations, and SHALL report the conflicts and a proposed plan for approval.

#### Scenario: Both changes add a migration
- **WHEN** two changes each add a database migration
- **THEN** the report flags the migration ordering conflict and the plan sequences them before parallel work starts

### Requirement: Contracts merge first
When changes share a contract, the shared part SHALL be defined in a contracts step, reviewed and merged into the base branch first, and the feature worktrees SHALL start from that base.

#### Scenario: Shared API type
- **WHEN** two features need the same new API response type
- **THEN** that type is added and merged once before either feature branch starts

### Requirement: Independent review per worktree
Each worktree SHALL run its own `/dsh:review` against its own isolated stack, so reviews of different features can run at the same time.

#### Scenario: Parallel reviews
- **WHEN** two worktrees run `/dsh:review` at the same time
- **THEN** each uses its own Compose project and ports and neither review fails because of the other

### Requirement: Merge order and conflict procedure
The orchestrator SHALL publish a merge order (contracts first, then features by dependency) and merge features one at a time: rebase onto the updated base, resolve conflicts, rerun `/dsh:review`, then merge.

#### Scenario: Conflict on rebase
- **WHEN** a feature branch conflicts with an already merged feature
- **THEN** the conflict is resolved in that feature's worktree, its review reruns and passes, and only then is it merged

### Requirement: Status reporting
Each feature SHALL report its status (tasks done of total), open questions and blockers, and the orchestrator SHALL show a combined table across features on request and at each merge.

#### Scenario: Blocked feature
- **WHEN** one feature waits on a developer decision
- **THEN** the combined status shows it as blocked with the question, while the other features continue
