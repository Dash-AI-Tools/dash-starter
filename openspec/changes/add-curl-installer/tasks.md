# Tasks

## 1. The install script

- [x] 1.1 [backend] Write `install.sh` at the repository root as in design D1–D7. It has `set -euo pipefail` and the whole body in `main`, with `main "$@"` as the last line. It checks with `command -v` for `node`, `npm`, `tar` and `curl`, parses `DASH_TEMPLATE_REPO`, and checks `--yes`/`--help` when `/dev/tty` cannot be opened, all before any network access. It then resolves the version (`DASH_VERSION` or the `releases/latest` redirect) and downloads and extracts the tarball into `mktemp -d`, with an EXIT trap that removes it. It checks that the installer's `package.json` version matches the release and that Node meets `.nvmrc`. Finally it runs `npm ci --workspace create-dash-starter --omit=dev --ignore-scripts --no-audit --no-fund` and runs the installer with `--template "$tmp"`, `"$@"` and `</dev/tty` when there is a terminal, exiting with its code. Verify with `bash -n install.sh` and with `shellcheck install.sh` (run it through `docker run --rm -v "$PWD:/mnt" koalaman/shellcheck:stable install.sh` when `shellcheck` is not installed).
- [x] 1.2 [backend] Confirm D4 on a real extracted release, using `git archive HEAD | tar -x -C <tmp>`: `npm ci --workspace create-dash-starter --omit=dev` installs only `@clack/prompts`, `giget` and their dependencies, and not the other workspaces' trees. Adjust the flags if it does not. Verify by listing `<tmp>/node_modules` and running `node <tmp>/packages/create-app/bin/create-dash-starter.js --help` from there.
- [x] 1.3 [backend] Add `install.sh` to `exclude` and `removePaths` in `packages/create-app/template.json`, and assert in the "Clean output" test of `packages/create-app/test/install.test.js` that `install.sh` is absent from the generated project. Also add the file to the fixture template so the assertion is meaningful. Verify with `npm run test --workspace create-dash-starter`, conformance test included.
- [x] 1.4 [backend] Add `packages/create-app/test/install-script.test.js` as in design D10, with stub `curl` and `npm` on `PATH`, a fake release tarball, a `detached` child with `TMPDIR` under the test's control, and a pseudo-terminal from `script(1)` for the interactive case. Cover one test per scenario of the "Scaffold a new project with the install script", "Install a single template release", "Check prerequisites before generating", "Prompt through the terminal" and "Leave no download behind" requirements. Verify with `npm run test --workspace create-dash-starter`.
- [x] 1.5 [backend] Change `USAGE` in `packages/create-app/src/cli.js` to name the one-liner and the by-path form for a clone (design D9), and update any test that asserts the usage text. Verify with `npm run test --workspace create-dash-starter`.
- [x] 1.6 [backend] Add a `shellcheck install.sh` step to the `installer` job of `.github/workflows/ci.yml`. Verify that `node ace test unit` in `apps/api` (`tests/unit/tooling.spec.ts` reads the workflow) still passes and that `shellcheck install.sh` is clean.

## 2. The landing page

- [x] 2.1 [frontend] Set `INSTALL_COMMAND` in `apps/web/src/pages/Home.tsx` to `curl -fsSL https://raw.githubusercontent.com/Dash-AI-Tools/dash-starter/main/install.sh | bash`, and update both expectations in `apps/web/src/pages/public.test.tsx` (the shown command and the copied text). Verify with `npx vitest run src/pages/public.test.tsx` in `apps/web`, and check that at 375px wide the command box scrolls inside itself while the page has no horizontal scroll.

## 3. The documentation

- [x] 3.1 [docs] Replace `npx create-dash-starter` with the one-liner in `README.md` (the installer section and its flags), `docs/index.md`, `docs/guides/getting-started.md`, `apps/web/PRODUCT.md` and `packages/create-app/README.md`. In the getting-started guide and the installer README, also document the read-first form (`curl -fsSLo install.sh …`, then `bash install.sh my-product`), `DASH_VERSION`, `DASH_TEMPLATE_REPO`, the prerequisites (`curl`, `tar`, Node per `.nvmrc`, npm) and WSL on Windows. In the installer README, state the release contract: the tag `v<version>` matches `packages/create-app/package.json`, and the script refuses a mismatch. Verify that `rtk proxy grep -rn "npx create-dash-starter" --exclude-dir=node_modules --exclude-dir=archive .` matches nothing outside `packages/core-tools/test/helpers.js`.
- [x] 3.2 [docs] Update `docs/architecture.md`: the `packages/create-app` row names `install.sh` as its entry point, the tests table lists `install-script.test.js`, and the `installer` CI job lists `shellcheck`. Verify by reading the three places against the code.
- [x] 3.3 [docs] Rewrite the Purpose of `openspec/specs/project-installer/spec.md` so it names the install script instead of "a single `npx` command". Verify with `openspec validate --specs --strict`.

## 4. Integration

- [x] 4.1 Run the gate on the whole change: `npm run format:check`, `npm run lint`, `npm run test --workspace create-dash-starter`, the web tests, and `openspec validate add-curl-installer --strict`. Verify that every command exits 0.

## Workflow follow-up

- Publish the GitHub release `v0.1.0` (its tag must match `packages/create-app/package.json`). Then run the one-liner from `raw.githubusercontent.com` interactively and with `--yes` on macOS and on Linux or WSL, with and without `DASH_VERSION`.
- Archive the change with `openspec archive add-curl-installer` once review passes.
- The harness has no layer tag for `packages/create-app`. The installer tasks are tagged `[backend]` as the closest specialist; confirm or retag before delegating.
