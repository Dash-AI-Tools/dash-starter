# harness-guardrails Specification

## Purpose
Keeps agent edits clean and safe automatically: touched files are formatted and linted as they change, affected workspaces are checked before a session stops and before any commit, and secrets and lockfiles are protected from accidental edits.

## Requirements

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

### Requirement: Guardrails in OpenCode
An OpenCode plugin of the harness SHALL apply the same guardrails as the Claude Code hooks, with the same scripts: it SHALL refuse the tool calls that write a protected file (a write, an edit, a patch or a shell command) with the same message and the same developer allowance, SHALL report the formatter and linter failures of an edited file in the result of the edit, and SHALL check the changed workspaces when the agent of a top-level session stops, resuming the session once with the failures.

#### Scenario: OpenCode agent edits a secret file
- **WHEN** an OpenCode agent writes `apps/api/.env` or runs a shell command that redirects into an env file
- **THEN** the call is refused and the agent receives the same message as in Claude Code, naming `.claude/dsh-allow`

#### Scenario: Allowance in OpenCode
- **WHEN** the developer has written `env` in `.claude/dsh-allow`
- **THEN** an OpenCode agent may write `apps/api/.env`, and the allowance file itself stays refused

#### Scenario: Lint error in OpenCode
- **WHEN** an OpenCode agent writes a file in `apps/web/src` with an unused variable
- **THEN** the result of the write carries the lint error, so the agent can fix it in the same turn

#### Scenario: Broken type when the OpenCode agent stops
- **WHEN** the agent of a top-level OpenCode session stops after introducing a type error in `apps/web`
- **THEN** the session is resumed with the typecheck output, and it may stop the next time without a second check

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
The harness hook scripts, the OpenCode plugin and the git pre-commit hook SHALL have automated tests covering allowed and blocked paths, refused staged secrets and the selection of affected workspaces.

#### Scenario: Hook regression
- **WHEN** a hook script changes so that `.env` is no longer blocked
- **THEN** the repository test command fails
