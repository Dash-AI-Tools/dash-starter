# Spec Delta

## Purpose

Keeps agent edits clean and safe automatically: touched files are formatted and linted as they change, affected workspaces are checked before a session stops and before any commit, and secrets and lockfiles are protected from accidental edits.

## ADDED Requirements

### Requirement: Format and lint after edits
After an agent creates or edits a file, the harness SHALL run the repository's formatter on that file and the owning workspace's linter on it, and SHALL feed lint errors back to the agent.

#### Scenario: Lint error after an edit
- **WHEN** an agent writes a TypeScript file in `apps/web/src` with an unused variable
- **THEN** the file is formatted, the lint error is reported back to the agent in the same turn, and the agent can fix it

#### Scenario: File outside any linted workspace
- **WHEN** an agent edits a Markdown file
- **THEN** only the formatter runs and no linter error is raised

### Requirement: Check before stopping
Before an agent session ends after editing code, the harness SHALL typecheck and run the fast unit tests of every workspace touched in the session, and SHALL block the stop with the failures when they fail.

#### Scenario: Broken type
- **WHEN** a session edited `apps/api` and introduced a type error
- **THEN** the stop is blocked and the agent receives the typecheck output

#### Scenario: Nothing changed
- **WHEN** a session made no file changes
- **THEN** the stop is not delayed by checks

#### Scenario: Database-backed tests
- **WHEN** a touched workspace's tests need the database
- **THEN** the stop check runs only the checks that need no database, and the full suite runs in `/dsh:review`

### Requirement: Protected files
The harness SHALL block agent edits to environment and secret files (`.env`, `.env.*` except `*.example`, keys and certificates) and to lockfiles (`package-lock.json`) unless the developer explicitly allowed it for the session.

#### Scenario: Agent edits a secret file
- **WHEN** an agent tries to write `apps/api/.env`
- **THEN** the edit is refused with a message explaining how the developer can allow it

#### Scenario: Example file
- **WHEN** an agent edits `.env.example`
- **THEN** the edit proceeds

#### Scenario: Explicit allowance
- **WHEN** the developer has allowed lockfile edits for the session (for example to add an approved dependency)
- **THEN** `npm install` may update `package-lock.json` and the edit is not blocked

### Requirement: Commit gate for everyone
A git pre-commit hook, enabled for every checkout by the repository's install step, SHALL check the staged changes of any committer (developer, Claude Code or another agent): formatting and lint of the staged files, typecheck and fast unit tests of the affected workspaces, and refusal of staged secret files. It SHALL use the same check logic as the Claude Code stop check.

#### Scenario: Unformatted file staged
- **WHEN** a developer commits a staged file that Prettier would change
- **THEN** the commit is refused and the hook names the file and the command that fixes it

#### Scenario: Type error staged
- **WHEN** the staged changes break the typecheck of `apps/web`
- **THEN** the commit is refused with the typecheck output

#### Scenario: Secret staged
- **WHEN** `apps/api/.env` or a `*.pem` file is force-added and committed
- **THEN** the commit is refused naming the file

#### Scenario: Hooks enabled on install
- **WHEN** a developer runs `npm install` in a fresh clone
- **THEN** git uses the repository's hooks without any further step

#### Scenario: Deliberate bypass
- **WHEN** a developer commits with `--no-verify`
- **THEN** the hook does not run, and CI still checks the change

### Requirement: Guardrails are tested
The harness hook scripts and the git pre-commit hook SHALL have automated tests covering allowed and blocked paths, refused staged secrets and the selection of affected workspaces.

#### Scenario: Hook regression
- **WHEN** a hook script changes so that `.env` is no longer blocked
- **THEN** the repository test command fails
