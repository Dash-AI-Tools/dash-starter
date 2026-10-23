---
name: parallel-features
description: Develop several OpenSpec changes at the same time, each in its own branch and worktree, with the conflicts found before the work starts and a defined merge order.
disable-model-invocation: true
argument-hint: '<change-id> [<change-id> ...]'
---

Features: `$ARGUMENTS`

## 1. Overlap analysis (before anything is created)

- Read the tasks and the design of every change in `openspec/changes/<change-id>/` and collect the paths each one names.
- Add the contract classes: the routes in `apps/api/start/routes.ts` and the transformers in `apps/api/app/transformers/` that `apps/web/src/lib/` consumes, the migrations in `apps/api/database/migrations/`, `apps/api/app/tools/registry.ts` and `apps/api/app/tools/main.ts`, the catalogs in `apps/api/resources/lang/` and `apps/web/src/locales/`, and the tokens in `apps/web/src/styles/palettes.css`.
- Report a table: one row per change, one column per shared area, the files in common and the conflict (the same file, the same migration, the same locale key, the same route).
- A change that touches `apps/api/app/tools/registry.ts` is a contract change: it is planned, implemented and merged first, alone.

## 2. Worktrees

- For each change, in its own slot: `node plugins/dsh/scripts/worktree.mjs add <change-id> <slot>`. The worktree is `.claude/worktrees/<change-id>` on the branch `feat/<change-id>`, with its own project name and ports.
- Run the work of every change inside its worktree, never in the main checkout. The stack of a worktree is its own: `docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d --wait` inside the worktree.
- Spawn one `dsh:feature-orchestrator` per worktree, with `subagent_type: "dsh:feature-orchestrator"`, so the changes run in parallel.

## 3. Status

- Keep a status table (change, tasks done, blockers, open questions) and show it when the developer asks for it and at every merge.

## 4. Merge order

- Contracts first, then the features by dependency.
- For each feature, in its worktree: rebase on the updated base, resolve the conflicts (keep both sides' locale keys and routes, then run `npm run typecheck`), run `/dsh:review`, and only then fast-forward the merge into the base branch.
- After each merge, the remaining worktrees rebase and are reviewed again.

## 5. Teardown

- When a change is merged, `node plugins/dsh/scripts/worktree.mjs remove <change-id> <slot>` removes its worktree and its stack.
