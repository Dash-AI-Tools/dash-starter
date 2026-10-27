# Proposal

## Why

The documented way to create a product, `npx create-dash-starter my-product`, does not work: the `create-dash-starter` package has never been published to npm, and publishing it would add a second release channel to keep in step with the template's GitHub releases. A single `curl … | bash` one-liner, served from the repository itself, needs no package registry. It installs the installer and the template from the same GitHub release, so the two cannot drift apart.

## What Changes

- New `install.sh` at the repository root, served at `https://raw.githubusercontent.com/Dash-AI-Tools/dash-starter/main/install.sh`. The one-liner is:
  `curl -fsSL https://raw.githubusercontent.com/Dash-AI-Tools/dash-starter/main/install.sh | bash -s -- my-product`
- The script checks the prerequisites first: `node`, `npm`, `tar` and `curl` must be present, and Node must be at least the release's `.nvmrc` version. It then resolves the release to install (the latest GitHub release, or `DASH_VERSION` when set) and downloads that release's tarball once into a temporary directory. From there it installs the installer's dependencies from the release lockfile and runs `packages/create-app` with `--template` pointing at that same download, forwarding every argument and flag.
- Interactive prompts read from the terminal even though bash reads the script from a pipe. If no terminal is available, the script requires `--yes`.
- The temporary download is removed on success and on failure. A failure before generation (missing tool, Node too old, no release, network error) leaves no target directory behind.
- `DASH_TEMPLATE_REPO` (already honored by the installer) also selects the repository the script downloads from, so a fork can serve its own one-liner.
- `install.sh` is template-only: the manifest leaves it out of every generated project, like `packages/create-app`.
- **BREAKING** (documentation only, because the package was never published): every `npx create-dash-starter` reference is replaced by the one-liner. This covers the landing page command and its copy button, the README, the `docs/` guides, `PRODUCT.md`, the installer README and its `--help` usage. The `create-dash-starter` workspace stays, with its `bin`, since CI and the script run it by path. It is not published to npm.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `project-installer`:
  - The "Scaffold a new project with npx" requirement is replaced by scaffolding through the install script, which covers the release resolution, the forwarded arguments, the prerequisite checks, the terminal handling and the cleanup.
  - "Generated project excludes installer internals" now also covers `install.sh`.

## Impact

- **New file**: `install.sh` (plain bash, no new dependency).
- **Installer**: `packages/create-app/template.json` (`exclude`, `removePaths`), `packages/create-app/src/cli.js` (usage text), `packages/create-app/README.md`. There is a new test, `packages/create-app/test/install-script.test.js`, which stubs `curl` and `npm` on `PATH` and runs the script against a local release tarball.
- **Web**: `apps/web/src/pages/Home.tsx` (`INSTALL_COMMAND`) and `apps/web/src/pages/public.test.tsx`. The locale strings are unchanged.
- **Docs**: `README.md`, `docs/index.md`, `docs/guides/getting-started.md`, `docs/architecture.md` (installer row and CI), `apps/web/PRODUCT.md`, `packages/core-tools/test/helpers.js` (README fixture text).
- **CI**: the template-only `installer` job runs `shellcheck install.sh`, which is preinstalled on the Ubuntu runners.
- **Release dependency**: the one-liner needs a published GitHub release tagged `v<version>` whose `packages/create-app/package.json` has the same version. No release exists yet, and creating one is outside this change.
