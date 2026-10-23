---
title: Change log
description: Changes to the documentation bundle, newest first.
---

# Change log

## 2026-10-23

- **Update**: The [README](../README.md) holds only the summary, the quick start, the installer one-liner and the table of the documentation. Its sections moved into the bundle: the repository and the local fallbacks to [what you get](./guides/what-you-get.md); running without Docker, the commands and the commit gate to [getting started](./guides/getting-started.md); the ports of the stack to [configuration](./guides/configuration.md); the palettes to [customizing](./guides/customizing.md); the layout to [architecture](./architecture.md). The installer flags, the update metadata and the release process moved to `packages/create-app/README.md`, which stays in the template repository.
- **Update**: The installer runs from `install.sh`, a `curl … | bash` one-liner, instead of `npx`: the `create-dash-starter` package was never published to npm. [Getting started](./guides/getting-started.md) documents the one-liner, the read-first form, `DASH_VERSION`, `DASH_TEMPLATE_REPO`, the prerequisites, WSL and `--yes` without a terminal; [architecture](./architecture.md) and [testing](./guides/testing.md) name `install.sh`, `packages/create-app/test/install-script.test.js` and the `shellcheck install.sh` step of the `installer` CI job.
- **Update**: Documented the scripts and the API stubs of the harness in [harness](./harness.md): `npm run context`, `gen`, `check` and `i18n` with their arguments and their output, the house-style stubs of `apps/api/stubs/make/` and their test, re-ejecting them after an AdonisJS upgrade, and the "Generate first" rule of the agents. The table "Where each kind of change lives" of [architecture](./architecture.md) names the generator of each kind of change.
- **Update**: Documented OpenCode support of the harness in [harness](./harness.md): `/dsh/<name>` commands and `dsh/<agent>` subagents generated from the plugin by `opencode.mjs sync|check`, the OpenCode plugin that runs the same guardrails, and `opencode.json` loading `CLAUDE.md`.
- **Creation**: Added the guides [extending](./guides/extending.md) (the feature registries, `make:feature`, `make:component`, Storybook) and [updating](./guides/updating.md) (the update metadata, `core:check`, `core:update`, the report and the release tags).
- **Update**: Documented the `@dash/ui` and `@dash/core-tools` workspaces, the core and its feature registries, the update contract and where a new feature lives in [architecture](./architecture.md); the showcase removal and the generators in [customizing](./guides/customizing.md), [what you get](./guides/what-you-get.md), [testing](./guides/testing.md), [getting started](./guides/getting-started.md) and the [README](../README.md). The design tokens moved to `packages/ui/src/styles/`.
- **Update**: Documented the account palette and the bulk import of members in the [README](../README.md) and the guides ([customizing](./guides/customizing.md), [what you get](./guides/what-you-get.md)).
- **Creation**: The bundle is now an OKF v0.2 bundle, with an [index](./index.md) and this log.
- **Update**: Added the frontmatter of the reference documents: [architecture](./architecture.md), [AI](./ai.md), [billing](./billing.md), [MCP](./mcp.md) and the [harness](./harness.md).
- **Creation**: Added the guides: [what you get](./guides/what-you-get.md), [getting started](./guides/getting-started.md), [configuration](./guides/configuration.md), [customizing](./guides/customizing.md), [testing](./guides/testing.md), [deployment](./guides/deployment.md) and [troubleshooting](./guides/troubleshooting.md).
