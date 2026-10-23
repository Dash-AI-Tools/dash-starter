---
name: backend
description: Implement the backend tasks of an OpenSpec change with the API specialist.
disable-model-invocation: true
argument-hint: '<change-id>'
---

Change: `$ARGUMENTS`

- The change lives in `openspec/changes/$ARGUMENTS/`. If it does not exist, stop and say so: a scoped command never proposes a change.
- Read `openspec/changes/$ARGUMENTS/tasks.md` and take only the tasks tagged `[backend]`.
- Spawn the specialist with the Task tool, `subagent_type: "dsh:backend-dev"`, and give it the change id and those tasks.
- The specialist works only in `apps/api/`. A task that needs the web app, the AI layer, the MCP server or the documentation is refused: report it as a missing task of the right layer instead of doing it.
- Check off each finished task in `tasks.md` at the line `openspec instructions apply --change $ARGUMENTS --json` reports, only after its verification passes.
- Report the tasks you ran, the files changed, the commands that passed and the tasks that need another layer.

## Generate first

- Tell the specialist to run `npm run context -- <layer>` for each layer it touches: the generator, the file to imitate and the files to register.
- It scaffolds with `npm run gen -- <layer> <name>` (`controller`, `validator`, `service`, `transformer`, `model`, `migration`, `middleware`, `exception`, `event`, `listener`, `seeder`, `factory`, `test`) and reads only the paths it prints.
- It adds the strings with `npm run i18n -- api <namespace> <key> <en> <es>`.
- It verifies with `npm run check -- --changed` and reads the trimmed lines, not the raw output; it reruns the printed command untrimmed only when those lines are not enough.
- It writes by hand only a layer the generators do not cover (a route, an ability, a mail), imitating the file `npm run context` names.
