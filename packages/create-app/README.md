# create-dash-starter

Creates a new AI SaaS product from the [Dash Starter](https://github.com/Dash-AI-Tools/dash-starter) template.

```bash
curl -fsSL https://raw.githubusercontent.com/Dash-AI-Tools/dash-starter/main/install.sh | bash -s -- my-product
```

The installer rebrands every placeholder, writes the `.env` files with fresh secrets, writes the update metadata in `.dash/`, initializes git with the commit gate of `.githooks` and — optionally — creates a private repository in GitHub and boots the stack.

The generated project keeps `packages/ui` and `packages/core-tools`; `packages/create-app`, `install.sh` and `openspec/changes` are left out.

The package was never published to npm, so `npx` cannot run it. The installer runs from a GitHub release of the template, through `install.sh`, or by path from a clone.

## The install script

`install.sh`, at the root of the template repository, is what the one-liner runs. It:

1. Checks that `node`, `npm`, `tar` and `curl` are on the `PATH`, before any network access.
2. Without a terminal (CI, a script), stops unless `--yes` (or `--help`) is among the arguments.
3. Resolves the release: `DASH_VERSION` when it is set, otherwise the latest GitHub release (the redirect of `releases/latest`).
4. Downloads the tarball of the tag `v<version>` once, into a temporary directory that is removed on exit, success or failure.
5. Refuses the release when the version of its `packages/create-app/package.json` is not the tag, or when Node is older than its `.nvmrc`.
6. Installs the installer's dependencies from the release lockfile: `npm ci --workspace create-dash-starter --omit=dev --ignore-scripts`.
7. Runs `bin/create-dash-starter.js --template <download>` with every argument you gave, the prompts reading `/dev/tty`, and exits with the installer's exit code.

A failure before the generation leaves no project directory behind.

To read the script before it runs:

```bash
curl -fsSLo install.sh https://raw.githubusercontent.com/Dash-AI-Tools/dash-starter/main/install.sh
less install.sh
bash install.sh my-product
```

| Variable             | What it does                                                                                                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DASH_VERSION`       | The release to install, with or without the `v`: `DASH_VERSION=0.1.0`. Default: the latest GitHub release. A prerelease is installed only this way.                         |
| `DASH_TEMPLATE_REPO` | A fork, as `github:owner/repo` (or `owner/repo`). The script downloads the release from it, and the installer records it in `.dash/core.json` as the source of the updates. |

The variables go before `bash`: `curl -fsSL … | DASH_VERSION=0.1.0 bash -s -- my-product`.

Prerequisites: `curl`, `tar`, `npm`, and Node at least the version of the `.nvmrc` of the release. `git` and Docker are optional: without `git` the project gets no repository and no first commit, and without Docker the stack is not booted. On Windows, run the one-liner in WSL.

From a clone of the template, run the installer by path on the checkout:

```bash
node packages/create-app/bin/create-dash-starter.js my-product --template .
```

## Flags

All optional; all work with `--yes` for a non-interactive run.

| Flag                     | What it does                                                         |
| ------------------------ | -------------------------------------------------------------------- |
| `--name <name>`          | Product name, e.g. "Acme AI"                                         |
| `--slug <slug>`          | Kebab-case slug, e.g. `acme-ai`                                      |
| `--description <t>`      | One-line description                                                 |
| `--locale <en\|es>`      | Default locale of the product                                        |
| `--palette <id>`         | Default palette: `line`, `ink`, `ocean`, `forest`, `plum` or `ember` |
| `--email <address>`      | Support email                                                        |
| `--template <path\|url>` | Use a local directory instead of the published release               |
| `--yes`                  | Accept every default without prompting                               |
| `--no-install`           | Skip `npm install`                                                   |
| `--no-boot`              | Skip `docker compose up`                                             |
| `--no-git`               | Skip `git init`                                                      |
| `--github`               | Create a private GitHub repository with `gh`                         |
| `--help`                 | Print the usage                                                      |

Every flag that carries an identity has a default, so `--yes` generates a project without a single question. An explicit `--template` wins over the one `install.sh` passes.

## The contract of the template

The installer reads `template.json`, the manifest of the template:

- `identity` — the questions and their defaults.
- `tokens` — the literals of the template and the value of the identity that replaces them.
- `files` and `exclude` — the files that travel and the ones that do not.
- `removePaths`, `removeSections` and `removeLines` — the parts of the template that a product does not need. The section `## The installer` of the root `README.md` and every line of it that names `packages/create-app` are among them.
- `removeWorkflowJobs` — the jobs of the CI that only make sense in the template.
- `preserve` — the files the rebrand never rewrites: `packages/core-tools/**`, whose source names the metadata directory literally.
- `core` and `userOwned` — the files a core update may replace and the files it never writes.

## The update metadata

Once the project has its final bytes, after the replacements, the removals, the locale, the palette and the env files, the installer writes two files:

| File                 | What it holds                                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `.dash/install.json` | The identity of the product, the token map of the rebrand, the template removals, the locale, the palette and `removedCapabilities` |
| `.dash/core.json`    | The upstream repository, the installed version, the core and product globs, and a SHA-256 checksum of every core file               |

- `.dash/` holds no secret: the keys live in the env files only.
- It belongs in git. The installer's first commit includes it; `core:update` rewrites `.dash/core.json`, and `remove:showcase` rewrites both files.
- It is what makes `npm run core:update` and `npm run core:check` work. Only projects generated from the release that introduced it onward can update; a clone of the template has none.
- The directory is always `.dash`, whatever the product is called. The recorded repository is `DASH_TEMPLATE_REPO` when it is set at install time, `github:Dash-AI-Tools/dash-starter` otherwise.

`docs/guides/updating.md` describes the update.

## Releases

The installer and the template are released together: the version of the installer is the version of the template, and the installer is run from the release tagged `v<version>`.

The contract of a release: a GitHub release tagged `v<version>` whose `packages/create-app/package.json` has the same `version`. `install.sh` refuses a release that breaks it, because the installer records its own version in `.dash/core.json` as the base of every update. `releases/latest` ignores drafts and prereleases.

To publish a new version, bump the version of the root `package.json`, of `packages/create-app/package.json` and of `packages/create-app/template.json`, then tag the commit and publish a GitHub release for the tag:

```bash
npm version 0.2.0 --workspaces --include-workspace-root --no-git-tag-version
git tag v0.2.0
git push origin v0.2.0
```

A tag that does not exist makes the script fail with a clear message instead of generating a project from an older release. `npm run core:update` resolves the same tags: `--to 0.2.0` selects `v0.2.0`, and no `--to` takes the latest GitHub release.
