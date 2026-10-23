---
name: docs
description: Bring the documentation in line with the current diff.
disable-model-invocation: true
argument-hint: '[change-id]'
---

- Collect the current change: `git status --porcelain` and `git diff`. When `$ARGUMENTS` names a change, read `openspec/changes/$ARGUMENTS/` as well.
- Spawn the writer with the Task tool, `subagent_type: "dsh:docs-writer"`, with the diff and the list of the files it changed.
- The writer updates the documents the change touches and reports what it changed:
  - a new MCP tool, scope or key policy -> an entry in `docs/mcp.md` with its scope and its input, in the same format as the existing tools;
  - a new AI capability, provider or model -> `docs/ai.md`;
  - a new workspace, layer, module boundary or shared contract -> `docs/architecture.md`;
  - a new agent, command or hook -> `docs/harness.md`;
  - a new way to run or check the repository -> `docs/guides/` (and the quick start of the root `README.md` only when it changes the first run), and `e2e/README.md`.
- A decision that the change does not settle is proposed, not written: the writer lists it as an open question.
- Report the documents that were updated and the open questions.
