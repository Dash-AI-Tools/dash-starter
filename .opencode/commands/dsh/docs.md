---
description: "Bring the documentation in line with the current diff. Arguments: [change-id]."
---

<!-- Generated from plugins/dsh/skills/docs/SKILL.md by plugins/dsh/scripts/opencode.mjs. Edit the source, then run `node plugins/dsh/scripts/opencode.mjs sync`. -->

- Collect the current change: `git status --porcelain` and `git diff`. When `$ARGUMENTS` names a change, read `openspec/changes/$ARGUMENTS/` as well.
- Spawn the writer with the subagent tool, agent `dsh/docs-writer`, with the diff and the list of the files it changed.
- The writer updates the documents the change touches and reports what it changed:
  - a new MCP tool, scope or key policy -> an entry in `docs/mcp.md` with its scope and its input, in the same format as the existing tools;
  - a new AI capability, provider or model -> `docs/ai.md`;
  - a new workspace, layer, module boundary or shared contract -> `docs/architecture.md`;
  - a new agent, command or hook -> `docs/harness.md`;
  - a new way to run or check the repository -> the root `README.md` and `e2e/README.md`.
- A decision that the change does not settle is proposed, not written: the writer lists it as an open question.
- Report the documents that were updated and the open questions.
