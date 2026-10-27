# Spec Delta

## ADDED Requirements

### Requirement: Scaffold a new project with the install script

The template SHALL publish an install script that a developer runs with `curl -fsSL <script-url> | bash -s -- [directory] [flags]`. The script SHALL run the installer of one template release against that same release, forwarding the directory and every flag unchanged, and SHALL exit with the installer's exit code.

#### Scenario: Create project in a new directory

- **WHEN** a developer runs `curl -fsSL https://raw.githubusercontent.com/Dash-AI-Tools/dash-starter/main/install.sh | bash -s -- my-product` and answers the prompts
- **THEN** a `my-product` directory is created containing the API app, the web app, the UI workspace, the core tooling, the update metadata, the Docker Compose files, tests and CI configuration from the template

#### Scenario: Flags are forwarded

- **WHEN** the developer runs the one-liner with `bash -s -- my-product --name "Acme AI" --slug acme-ai --locale es --yes --no-install --no-boot`
- **THEN** no prompts are shown and `my-product` is generated with that name, slug and locale, without installing dependencies or starting the stack

#### Scenario: Target directory is not empty

- **WHEN** the target directory exists and contains files
- **THEN** the script exits non-zero without writing into it and the installer explains that an empty or new directory is required

### Requirement: Install a single template release

The install script SHALL install the latest published release of the template repository by default, or the version named by `DASH_VERSION`. It SHALL download from the repository named by `DASH_TEMPLATE_REPO` when that is set. The installer and the template SHALL come from the same release download.

#### Scenario: Latest release by default

- **WHEN** the developer runs the one-liner without `DASH_VERSION` and the latest release is `v0.2.0`
- **THEN** the project is generated from `v0.2.0` and `.dash/core.json` records version `0.2.0`

#### Scenario: Pinned version

- **WHEN** the developer runs the one-liner with `DASH_VERSION=0.1.0`
- **THEN** the project is generated from the release tagged `v0.1.0` and `.dash/core.json` records version `0.1.0`

#### Scenario: Fork repository

- **WHEN** the developer runs the one-liner with `DASH_TEMPLATE_REPO=github:acme/starter`
- **THEN** the release is downloaded from `acme/starter` and `.dash/core.json` records `github:acme/starter` as the repository

#### Scenario: No release found

- **WHEN** the repository has no published release, or the requested version does not exist
- **THEN** the script exits non-zero naming the repository and the version it looked for, and creates no target directory

### Requirement: Check prerequisites before generating

The install script SHALL verify that `node`, `npm`, `tar` and `curl` are available, and that the installed Node version is at least the version pinned in the release's `.nvmrc`. It SHALL stop before generating anything when a check fails.

#### Scenario: Missing tool

- **WHEN** `node` is not on the `PATH`
- **THEN** the script exits non-zero, names the missing tool and creates no target directory

#### Scenario: Node too old

- **WHEN** the installed Node is older than the release's `.nvmrc` version
- **THEN** the script exits non-zero, prints both versions and suggests `nvm install`, and creates no target directory

### Requirement: Prompt through the terminal

The install script SHALL let the installer's prompts read the developer's terminal even though bash reads the script from a pipe. When no terminal is available, the script SHALL require `--yes`.

#### Scenario: Interactive run through a pipe

- **WHEN** a developer runs the one-liner in a terminal without `--yes`
- **THEN** the installer's prompts are shown and read the developer's answers from the terminal

#### Scenario: No terminal without --yes

- **WHEN** the script runs without a terminal (for example, in CI) and `--yes` is not among the flags
- **THEN** the script exits non-zero, explains that `--yes` is required without a terminal, and creates no target directory

#### Scenario: No terminal with --yes

- **WHEN** the script runs without a terminal and with `--yes`
- **THEN** the project is generated with the flags and the defaults, without prompting

### Requirement: Leave no download behind

The install script SHALL remove the release it downloaded when it finishes, whether it succeeds or fails.

#### Scenario: Cleanup after success

- **WHEN** generation completes
- **THEN** the temporary directory that held the release download no longer exists

#### Scenario: Cleanup after failure

- **WHEN** the download or the installer fails
- **THEN** the temporary directory that held the release download no longer exists

## MODIFIED Requirements

### Requirement: Generated project excludes installer internals

The generated project SHALL NOT contain the installer package, the install script, the template's OpenSpec change history or template-only CI jobs, while keeping the update metadata and the core tooling.

#### Scenario: Clean output

- **WHEN** generation completes
- **THEN** `packages/create-app`, `install.sh` and `openspec/changes` are absent from the generated project
- **AND** `packages/core-tools` and `.dash/core.json` are present

## REMOVED Requirements

### Requirement: Scaffold a new project with npx

**Reason**: The `create-dash-starter` package was never published to npm, and a second release channel would have to track the template's GitHub releases. The install script installs the installer and the template from a single GitHub release instead.

**Migration**: Replace `npx create-dash-starter my-product [flags]` with `curl -fsSL https://raw.githubusercontent.com/Dash-AI-Tools/dash-starter/main/install.sh | bash -s -- my-product [flags]`. The flags are unchanged. From a clone of the template, `node packages/create-app/bin/create-dash-starter.js my-product --template .` still works.
