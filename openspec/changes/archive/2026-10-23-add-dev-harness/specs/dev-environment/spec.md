# Spec Delta

## ADDED Requirements

### Requirement: Side-by-side stacks
The development and end-to-end Compose stacks SHALL take their project name and every published host port from environment variables whose defaults are today's values, so several checkouts or worktrees can run their own stack at the same time.

#### Scenario: Defaults unchanged
- **WHEN** a developer runs the documented dev command without setting the new variables
- **THEN** the stack uses the same project name and ports as before

#### Scenario: Two worktrees
- **WHEN** two worktrees start their stacks with different port offsets
- **THEN** both stacks run at the same time, and each end-to-end suite reaches only its own stack
