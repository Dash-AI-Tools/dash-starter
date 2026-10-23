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
- The design tokens in `packages/ui/src/styles/palettes.css` and `packages/ui/src/styles/index.css` are changed only with the developer's approval.
- Check off each finished task in `tasks.md` at the line `openspec instructions apply --change $ARGUMENTS --json` reports, only after its verification passes.
- Report the tasks you ran, the files changed, the commands that passed and the tasks that need another layer.

## Generate first

- Tell the specialist to run `npm run context -- <layer>` for each layer it touches: the generator, the file to imitate and the files to register.
- It scaffolds with `npm run gen -- component <name>` or `npm run gen -- primitive <name>` (needs the network) and reads only the paths it prints.
- It adds the strings with `npm run i18n -- web <namespace> <key> <en> <es>`.
- It verifies with `npm run check -- --changed` and reads the trimmed lines, not the raw output; it reruns the printed command untrimmed only when those lines are not enough.
- It writes by hand only a layer the generators do not cover (a page outside a feature, a client module in `apps/web/src/lib/`), imitating the file `npm run context` names.
