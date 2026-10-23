---
description: "Check the current diff with the formatter, the linter, the typechecker, the tests, the end-to-end suite and the security reviewer, and report every step. Arguments: [change-id]."
---

<!-- Generated from plugins/dsh/skills/review/SKILL.md by plugins/dsh/scripts/opencode.mjs. Edit the source, then run `node plugins/dsh/scripts/opencode.mjs sync`. -->

Review the current checkout. Run every step, in order. A failing step does not stop the others: it fails the review and the report names it.

| #   | Step            | Command                                                                                                                                                                                          |
| --- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Format          | `npm run format:check`                                                                                                                                                                           |
| 2   | Lint            | `npm run lint`                                                                                                                                                                                   |
| 3   | Typecheck       | `npm run typecheck`                                                                                                                                                                              |
| 4   | API tests       | `npm run test --workspace @dash/api` (needs the test database of `docker-compose.yml`)                                                                                                           |
| 5   | Web tests       | `npm run test --workspace @dash/web`                                                                                                                                                             |
| 6   | Installer tests | `npm run test --workspace create-dash-starter`                                                                                                                                                   |
| 7   | Plugin tests    | `npm run test --workspace @dash/dsh`                                                                                                                                                             |
| 8   | End to end      | `docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d --wait`, `docker compose -f docker-compose.yml -f docker-compose.e2e.yml exec -T api node ace db:seed`, `npm run test:e2e` |

Then:

- Spawn the reviewer with the subagent tool, agent `dsh/security-reviewer`, with the current diff (`git diff` and `git diff --cached`). It runs `npm audit` and uses `semgrep` or `gitleaks` only when they are already installed. A finding is reported with the file, the line, the severity and a proposed fix, and no file is changed without the developer's approval.
- When `$ARGUMENTS` names a change, map every `#### Scenario` of the deltas in `openspec/changes/$ARGUMENTS/specs/` to the test that covers it. A scenario with no test is a gap.

Report a table with the step, the command and the result (passed or failed with the failing output), then the security findings and the scenario coverage. The overall result is failed when any step failed.
