---
name: frontend
description: Implement the frontend tasks of an OpenSpec change with the web specialist.
disable-model-invocation: true
argument-hint: '<change-id>'
---

Change: `$ARGUMENTS`

- The change lives in `openspec/changes/$ARGUMENTS/`. If it does not exist, stop and say so: a scoped command never proposes a change.
- Read `openspec/changes/$ARGUMENTS/tasks.md` and take only the tasks tagged `[frontend]`.
- Spawn the specialist with the Task tool, `subagent_type: "dsh:frontend-dev"`, and give it the change id and those tasks.
- The specialist works only in `apps/web/`. A task that needs the API, the AI layer, the MCP server or the documentation is refused: report it as a missing task of the right layer instead of doing it.
- The design tokens in `apps/web/src/styles/palettes.css` are changed only with the developer's approval.
- Check off each finished task in `tasks.md` at the line `openspec instructions apply --change $ARGUMENTS --json` reports, only after its verification passes.
- Report the tasks you ran, the files changed, the commands that passed and the tasks that need another layer.
