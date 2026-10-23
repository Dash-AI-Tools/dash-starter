# Design

## Context

- The installer (`packages/create-app`) is a Node program with two runtime dependencies, `@clack/prompts` and `giget`. Without `--template`, it downloads `github:Dash-AI-Tools/dash-starter#v<version>` with giget, where `<version>` is its own `package.json` version. With `--template <dir>`, it copies a local directory through the same `exclude` list (`src/fetch.js`). CI already generates projects this way (`--template .`).
- `create-dash-starter` returns 404 on npm, and the repository has no tags or releases yet. See proposal.md, Why.
- `DASH_TEMPLATE_REPO` (format `github:owner/repo`) overrides the repository that the installer records in `.dash/core.json` and downloads from.
- The landing page shows `INSTALL_COMMAND` in a `<code>` box that already scrolls horizontally (`overflow-x-auto whitespace-nowrap`), so a longer command does not widen the page.
- The requirements are in `specs/project-installer/spec.md`.

## Goals / Non-Goals

**Goals:**

- One download per run, with the installer and the template taken from the same release.
- Installer dependencies pinned by the release lockfile.
- A script short enough to read before piping it to bash, with no dependency beyond `bash`, `curl`, `tar`, `node` and `npm`.

**Non-Goals:**

- A Windows-native (PowerShell) installer. Windows users run the one-liner in WSL.
- Publishing `create-dash-starter` to npm, and automating releases (tagging, GitHub release creation).
- Verifying a signature or checksum of the tarball beyond the TLS of `github.com`.
- Fixing how the rebrand rewrites the one-liner in a generated project's docs and landing page. The token replacement already turns `npx create-dash-starter` into `npx create-<slug>` today, and products replace that copy.

## Decisions

### D1. The script runs the installer from the release tarball, with `--template` pointing at the same tarball

The script downloads `https://github.com/<owner>/<repo>/archive/refs/tags/v<version>.tar.gz` once and extracts it into a `mktemp -d` directory with `--strip-components=1`. It then runs:

`node "$tmp/packages/create-app/bin/create-dash-starter.js" --template "$tmp" "$@"`

The script does not `cd`, so the installer resolves the directory argument against the developer's working directory. Because `parseArgs` keeps the last value of a string flag, an explicit `--template` from the developer still wins.

- *Alternative: a thin wrapper over `npx create-dash-starter@<version>`.* This needs an npm release channel, which is exactly what the change removes.
- *Alternative: run the installer without `--template` and let it re-download the release with giget.* That means two downloads of the same tag for no gain.

### D2. The release comes from the `releases/latest` redirect, with `DASH_VERSION` as an override

When `DASH_VERSION` is set, the script uses it, with any leading `v` stripped. Otherwise, it follows `https://github.com/<owner>/<repo>/releases/latest` with `curl -fsSLI -o /dev/null -w '%{url_effective}'` and reads the version from the final `/releases/tag/v<version>` URL. If the URL does not end that way, there is no release, and the script exits as the spec requires. A 404 on the tarball means the requested version does not exist.

- *Alternative: the GitHub REST API.* It allows only 60 unauthenticated requests per hour per IP, and its JSON would need parsing without `jq`.

After extraction, the script checks that `packages/create-app/package.json` in the tarball carries the resolved version. The installer writes its own version into `.dash/core.json`, so a release whose installer version disagrees with its tag would record a wrong update base. The script fails loudly instead.

### D3. `DASH_TEMPLATE_REPO` selects the download repository too

The script accepts `github:owner/repo` (the installer's format) and plain `owner/repo`, and rejects any other provider with a message. When the variable is set, it is exported to the installer as `github:owner/repo`, so `.dash/core.json` records the same repository the script downloaded from, in the installer's format. When it is unset, both use `Dash-AI-Tools/dash-starter`.

### D4. The installer's dependencies are installed with `npm ci` from the release lockfile

The script runs `npm ci --workspace create-dash-starter --omit=dev --ignore-scripts --no-audit --no-fund` in the extracted release. This installs only the installer's production dependencies, at the versions in the release's `package-lock.json`, and runs no install scripts. The root `package.json` has no production dependencies.

- *Alternative: copy `packages/create-app` out of the release and run `npm install` without a lockfile.* That resolves ranges at install time, so the same release could behave differently on different days.
- *Implementation check:* confirm that `npm ci --workspace` does not install the other workspaces' trees. If it does, add `--include-workspace-root=false` or narrow the install in another way, without dropping the lockfile.

### D5. Prompts read `/dev/tty`, and a missing terminal requires `--yes`

Under `curl … | bash`, the script itself arrives on stdin, so the installer must not read stdin. If `/dev/tty` can be opened (`{ : </dev/tty; } 2>/dev/null`), the script runs the installer with `</dev/tty`. Otherwise there is no terminal. In that case the script checks the arguments before downloading anything: `--yes` (or `--help`) must be among them, or it exits non-zero with an explanation. The reason is that the prompt library cannot work without a terminal, and failing early is better than hanging or failing halfway.

### D6. A truncated download cannot run partially, and the temp directory always goes

The whole body of the script is a `main` function, and `main "$@"` is the last line. If the download is cut short, bash parses an unterminated function and runs nothing. The script uses `set -euo pipefail`. A `trap 'rm -rf "$tmp"' EXIT` removes the download on every exit path, including Ctrl+C.

The script runs the installer as a child process, not with `exec`, so the trap still runs. It exits with the installer's exit code.

### D7. Prerequisites are checked in two steps

1. Before any network access, `command -v` checks for `node`, `npm`, `tar` and `curl`, and the script exits naming the first one missing.
2. After extraction and before `npm ci`, the script compares `process.versions.node` with the release's `.nvmrc` using a short `node -e` numeric comparison. The script keeps no hard-coded minimum, so the floor moves with the template.

`git` and Docker are not required: the installer already degrades without them (`--no-git`, and the "Docker not available" path).

### D8. `install.sh` lives at the repository root and is template-only

The root is the address chosen for the one-liner (`raw.githubusercontent.com/.../main/install.sh`). The script is added to `exclude` and `removePaths` in `template.json`, next to `packages/create-app`. `.dash/install.json` records `exclude`, so `materialize` in `core-tools` keeps it out on every update too. The conformance test covers the parity.

### D9. Usage text and the landing page

- `USAGE` in `src/cli.js` names the one-liner and also the by-path form for a clone (`node packages/create-app/bin/create-dash-starter.js`).
- `INSTALL_COMMAND` on the landing page is `curl -fsSL https://raw.githubusercontent.com/Dash-AI-Tools/dash-starter/main/install.sh | bash`. It has no directory, because the installer defaults the directory to the slug. The copy button copies the full one-liner. No locale string changes.

### D10. The script is tested with stubbed `curl` and `npm` on `PATH`

`packages/create-app/test/install-script.test.js` spawns `bash install.sh` with a stub directory first on `PATH`:

- **The fake release** is a tarball built in the test from `createTemplate()` (fixture.js), plus the real `packages/create-app/{bin,src,package.json,template.json}` and a `.nvmrc`.
- **The `curl` stub** prints a `/releases/tag/v<version>` effective URL for `releases/latest` (or a non-tag URL for the "no release" case), and writes the tarball when asked for the archive.
- **The `npm` stub** links the repository's root `node_modules` into the release, so the test needs no network.
- **No terminal:** the child is spawned `detached` (its own session, no controlling terminal), so `/dev/tty` cannot be opened, and `TMPDIR` points at a directory the test inspects for cleanup.

"Interactive run through a pipe" needs a terminal. The test gets one from Python's `pty.spawn`, which allocates a pseudo-terminal and copies a Node pipe into it. `script(1)` was ruled out because on macOS it refuses a pipe or a FIFO as its input. The test sizes the terminal with `stty`, runs `cat install.sh | bash -s -- <dir> --name … --slug …`, and answers each remaining confirm prompt with `n`. If `python3` is not available, that test is skipped. Writing this test exposed a defect that dates back to the installer's first commit: `ask()` in `src/prompts.js` called the prompt it was given as a function, so every interactive run failed with "question is not a function" and then hung on the open prompt. The change fixes it. CI also runs `shellcheck install.sh` in the template-only `installer` job, since `shellcheck` is preinstalled on `ubuntu-latest`.

## Risks / Trade-offs

- **[Risk] The script on `main` changes behavior while older releases stay installable through `DASH_VERSION`.** → The script depends only on the release layout (`packages/create-app/bin/create-dash-starter.js`, `.nvmrc`, `package-lock.json`). A future layout change must keep those paths or make the script branch on version.
- **[Risk] No release exists, so the one-liner fails until one is published.** → The script reports this clearly ("No release found"). The release checklist (outside this change) must create a release `v<version>` whose installer `package.json` matches; the D2 check enforces this.
- **[Trade-off] `curl | bash` runs remote code unreviewed.** → The script is short, keeps `main` last, and the docs also show the two-step form (`curl -fsSLo install.sh …`, read it, then `bash install.sh my-product`).
- **[Risk] `releases/latest` ignores prereleases and drafts.** → This is intended: a prerelease is installed only by pinning `DASH_VERSION`.

## Migration Plan

There is no data or runtime migration. The change replaces documentation of a command that never worked, and adds a file that generated projects do not receive. To roll back, revert the commit. Nothing outside the repository depends on the script until a release is published.
