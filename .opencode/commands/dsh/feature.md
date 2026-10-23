---
description: "Run a feature end to end from its OpenSpec change - propose it if it does not exist, apply the layer-tagged tasks with the specialists, review the result and report. Arguments: <change-id>."
---

<!-- Generated from plugins/dsh/skills/feature/SKILL.md by plugins/dsh/scripts/opencode.mjs. Edit the source, then run `node plugins/dsh/scripts/opencode.mjs sync`. -->

Feature: `$ARGUMENTS`

Run the OpenSpec loop for this feature. You orchestrate; you do not write layer code yourself.

## 1. Plan

- The change lives in `openspec/changes/$ARGUMENTS/`.
- If it does not exist, scaffold it with `npm run gen -- change $ARGUMENTS` and write `proposal.md`, the deltas in `specs/<capability>/spec.md`, `design.md` when the change needs one, and `tasks.md` with every task tagged (`[backend]`, `[frontend]`, `[ai]`, `[mcp]`, `[docs]`, `[e2e]`).
- Validate it with `openspec validate $ARGUMENTS --strict`.
- Stop there and show the artifacts and the open questions. No code is written before the developer reviews the change.

## 2. Apply

- Spawn the orchestrator with the subagent tool, agent `dsh/feature-orchestrator`, and give it the change id and the OpenSpec loop it must run.
- The orchestrator groups the tasks by tag, runs in parallel the specialists whose owned paths do not overlap, and checks off each task in `openspec/changes/$ARGUMENTS/tasks.md` at the line `openspec instructions apply --change $ARGUMENTS --json` reports, only after that task's verification passes.
- `docs/architecture.md` says where a change lives; the deltas in `openspec/changes/$ARGUMENTS/specs/` say what the change must do.

### Generate first

- The orchestrator hands each specialist `npm run context -- <layer>` for its layer, and a product feature is scaffolded once with `npm run gen -- feature <name>` before the layers start.
- The specialists scaffold with `npm run gen -- <layer> <name>`, add the strings with `npm run i18n`, and write by hand only a layer the generators do not cover (abilities, AI tools, pages outside a feature, end-to-end journeys).
- Verification reads `npm run check -- --changed`, trimmed; the printed command reruns a step untrimmed only when the trimmed lines are not enough.

## 3. Verify

- Follow the runbook of `.opencode/commands/dsh/review.md` on the result.
- The orchestrator maps every `#### Scenario` of the deltas to a test. A scenario with no test is a gap and the report says so.

## 4. Report

- Report every task with its tag, the specialist that did it and its state, the scenario coverage, the review result and the open questions.
- Offer `openspec archive $ARGUMENTS` and then `/dsh/docs`. Never archive without the developer.
