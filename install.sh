#!/usr/bin/env bash
#
# Creates a new product from the Dash Starter template:
#
#   curl -fsSL https://raw.githubusercontent.com/Dash-AI-Tools/dash-starter/main/install.sh | bash -s -- my-product
#
# The script downloads one release of the template, installs the installer of
# that release from its lock file and runs it against the same download. Every
# argument goes to the installer; `--help` lists them.
#
#   DASH_VERSION        The release to install, e.g. 0.2.0. The latest when unset.
#   DASH_TEMPLATE_REPO  The repository of the template, github:owner/repo.
#
# The whole script is the function `main`, called on the last line, so a
# download cut short runs nothing.

set -euo pipefail

DEFAULT_REPO='Dash-AI-Tools/dash-starter'

# The directory of the download, global so the exit trap can remove it.
tmp=''

fail() {
  printf 'install.sh: %s\n' "$1" >&2
  exit 1
}

has_flag() {
  local flag="$1" arg
  shift

  for arg in "$@"; do
    [[ "$arg" == "$flag" ]] && return 0
  done

  return 1
}

main() {
  local tool

  for tool in node npm tar curl; do
    command -v "$tool" >/dev/null 2>&1 || fail "\"$tool\" is required and was not found on the PATH"
  done

  # The installer accepts github:owner/repo; owner/repo is accepted too.
  local repo="${DASH_TEMPLATE_REPO:-$DEFAULT_REPO}"
  repo="${repo#github:}"

  [[ "$repo" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] ||
    fail "DASH_TEMPLATE_REPO must be github:owner/repo, not \"${DASH_TEMPLATE_REPO:-}\""

  if [[ -n "${DASH_TEMPLATE_REPO:-}" ]]; then
    export DASH_TEMPLATE_REPO="github:$repo"
  fi

  # Under `curl | bash` the script itself is the standard input, so the
  # prompts read the terminal. Without one, nothing can be asked.
  local tty=0

  if { : </dev/tty; } 2>/dev/null; then
    tty=1
  fi

  if ((!tty)) && ! has_flag --yes "$@" && ! has_flag --help "$@"; then
    fail 'there is no terminal to ask the questions in: run it again with --yes and the flags of the project'
  fi

  local version="${DASH_VERSION:-}"

  if [[ -z "$version" ]]; then
    local latest
    latest="$(curl -fsSLI -o /dev/null -w '%{url_effective}' "https://github.com/$repo/releases/latest")" ||
      fail "the latest release of github.com/$repo could not be found"

    [[ "$latest" == */releases/tag/v* ]] || fail "github.com/$repo has no published release"
    version="${latest##*/releases/tag/v}"
  fi

  version="${version#v}"

  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT

  printf 'Downloading Dash Starter v%s from github.com/%s...\n' "$version" "$repo"

  curl -fsSL "https://github.com/$repo/archive/refs/tags/v$version.tar.gz" -o "$tmp/release.tar.gz" ||
    fail "the release v$version of github.com/$repo could not be downloaded"

  local release="$tmp/release"
  mkdir "$release"
  tar -xzf "$tmp/release.tar.gz" -C "$release" --strip-components=1

  # The installer records its own version as the base of every core update,
  # so it must be the version of the release.
  local installer="$release/packages/create-app"
  [[ -f "$installer/package.json" ]] || fail "the release v$version has no installer"

  local installer_version
  installer_version="$(node -p 'require(process.argv[1]).version' "$installer/package.json")"

  [[ "$installer_version" == "$version" ]] ||
    fail "the release v$version carries the installer $installer_version; the release is broken"

  [[ -f "$release/.nvmrc" ]] || fail "the release v$version has no .nvmrc"

  local required
  required="$(tr -d '[:space:]v' <"$release/.nvmrc")"

  node -e '
    const need = process.argv[1].split(".").map(Number)
    const have = process.versions.node.split(".").map(Number)

    for (let i = 0; i < 3; i++) {
      const a = have[i] ?? 0
      const b = need[i] ?? 0

      if (a !== b) process.exit(a > b ? 0 : 1)
    }
  ' "$required" || fail "Node $required or newer is required and this is $(node -v): run \"nvm install $required\" and try again"

  printf 'Installing the installer...\n'

  (cd "$release" && npm ci --workspace create-dash-starter --omit=dev --ignore-scripts --no-audit --no-fund --loglevel=error) >/dev/null ||
    fail 'the dependencies of the installer could not be installed'

  # A later --template of the developer wins over this one.
  local code=0

  if ((tty)); then
    node "$installer/bin/create-dash-starter.js" --template "$release" "$@" </dev/tty || code=$?
  else
    node "$installer/bin/create-dash-starter.js" --template "$release" "$@" || code=$?
  fi

  exit "$code"
}

main "$@"
