# Proposal

## Why

The home of the organization shows invented numbers: the KPI cards, the usage chart and the recent-activity table are constants in `apps/web/src/pages/DashboardPage.tsx`. Every organization sees "12 members" and "1,240 AI credits left", whatever it really has. The data already exists in the database (memberships, invitations, AI usage events, MCP usage events, API keys); nothing reads it for the dashboard.

## What Changes

- An endpoint `GET /api/v1/orgs/:orgSlug/dashboard`, readable by every member of the organization, that returns the real metrics of the organization:
  - the members, the seats used and their limit, the AI credits used and their limit, the MCP calls used and their limit, for the current period of the plan;
  - the AI credits used per day over the last 7 days;
  - the latest activity, derived from the memberships, the invitations and the API keys of the organization.
- The dashboard home reads that endpoint instead of the constants: the KPI cards, the chart and the activity table show the real values, with "Unlimited" for unlimited limits and an empty state when there is no activity.
- The getting-started checklist does not change.

## Impact

- Affected specs: `dashboard-shell` (the requirement "Dashboard home" is modified, the requirements "Dashboard metrics" and "Dashboard activity" are added)
- Affected code: `apps/api/app/services/dashboard.ts` (new), `apps/api/app/controllers/dashboard_controller.ts` (new), `apps/api/start/routes.ts`, `apps/api/tests/functional/dashboard.spec.ts` (new), `apps/web/src/lib/dashboard.ts` (new), `apps/web/src/pages/DashboardPage.tsx`, `apps/web/src/pages/dashboard.test.tsx`, `apps/web/src/locales/{en,es}/dashboard.ts`, `e2e/specs/dashboard.spec.ts` (new)
- No migration, no new dependency, no new shared contract: `docs/architecture.md` does not change.
