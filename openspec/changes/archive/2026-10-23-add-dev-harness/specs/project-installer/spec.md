# Spec Delta

## ADDED Requirements

### Requirement: Generated project includes the development harness
The installer SHALL include the development harness in generated projects (the `dsh` plugin and its marketplace entry, the shared `.claude/settings.json`, the OpenCode files of the harness and `opencode.json`, `CLAUDE.md`, `docs/architecture.md`, `docs/harness.md` and the git hooks), rebranded like the rest of the template, SHALL enable the git hooks when it initializes the repository, and SHALL leave out personal and machine-local Claude Code and OpenCode state.

#### Scenario: Harness travels
- **WHEN** a project is generated
- **THEN** it contains the `dsh` plugin, `.claude/settings.json`, `CLAUDE.md`, `docs/architecture.md` and `docs/harness.md`, and no template placeholder remains in them

#### Scenario: OpenCode files travel in sync
- **WHEN** a project is generated
- **THEN** it contains `opencode.json`, `.opencode/agents/dsh/`, `.opencode/commands/dsh/` and `.opencode/plugins/dsh.js`, rebranded like their sources, and `node plugins/dsh/scripts/opencode.mjs check` passes in it

#### Scenario: Git hooks active
- **WHEN** the installer initializes the git repository of a generated project
- **THEN** git uses the project's hooks directory, so the pre-commit gate runs on the first commit after generation

#### Scenario: Local state stays behind
- **WHEN** the template checkout has `.claude/settings.local.json`, `.claude/worktrees/`, the personal commands, skills or session logs of `.opencode/`, or other local tool state
- **THEN** none of it is copied into the generated project
