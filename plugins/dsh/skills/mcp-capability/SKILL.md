---
name: mcp-capability
description: Add an MCP capability (a new tool, a scope or a key policy) with the MCP specialist.
disable-model-invocation: true
argument-hint: '<change-id>'
---

Change: `$ARGUMENTS`

- The change lives in `openspec/changes/$ARGUMENTS/`. If it does not exist, stop and say so: a scoped command never proposes a change.
- Read `openspec/changes/$ARGUMENTS/tasks.md` and take only the tasks tagged `[mcp]`.
- Spawn the specialist with the Task tool, `subagent_type: "dsh:mcp-dev"`, and give it the change id and those tasks.
- The capability is exposed through the shared tool registry: one file per tool in `apps/api/app/tools/`, registered in `apps/api/app/tools/main.ts`, with its zod schema, its `minRole` and its `scope`. A change to `apps/api/app/tools/registry.ts` itself is a contract change: it is scheduled first and merged alone.
- Every tool is metered, tested and documented in `docs/mcp.md` with its scope and its input.
- The web app is never touched. A task that needs it is refused and reported as a missing `[frontend]` task.
- Check off each finished task in `tasks.md` at the line `openspec instructions apply --change $ARGUMENTS --json` reports, only after its verification passes.
- Report the tasks you ran, the tools added, the commands that passed and the tasks that need another layer.

## Generate first

- Tell the specialist to run `npm run context -- <layer>` for each layer it touches: the generator, the file to imitate and the files to register.
- It scaffolds a test, a validator or a transformer with `npm run gen -- <layer> <name>` and reads only the paths it prints.
- It adds the description of a tool with `npm run i18n -- api chat <key> <en> <es>`.
- It verifies with `npm run check -- --changed` and reads the trimmed lines, not the raw output; it reruns the printed command untrimmed only when those lines are not enough.
- It writes by hand only a layer the generators do not cover (a tool, a scope, a key policy), imitating the file `npm run context` names.
