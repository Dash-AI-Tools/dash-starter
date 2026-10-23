---
description: "Implement the backend tasks of an OpenSpec change with the API specialist. Arguments: <change-id>."
---

<!-- Generated from plugins/dsh/skills/backend/SKILL.md by plugins/dsh/scripts/opencode.mjs. Edit the source, then run `node plugins/dsh/scripts/opencode.mjs sync`. -->

Change: `$ARGUMENTS`

- The change lives in `openspec/changes/$ARGUMENTS/`. If it does not exist, stop and say so: a scoped command never proposes a change.
- Read `openspec/changes/$ARGUMENTS/tasks.md` and take only the tasks tagged `[backend]`.
- Spawn the specialist with the subagent tool, agent `dsh/backend-dev`, and give it the change id and those tasks.
- The specialist works only in `apps/api/`. A task that needs the web app, the AI layer, the MCP server or the documentation is refused: report it as a missing task of the right layer instead of doing it.
- Check off each finished task in `tasks.md` at the line `openspec instructions apply --change $ARGUMENTS --json` reports, only after its verification passes.
- Report the tasks you ran, the files changed, the commands that passed and the tasks that need another layer.
