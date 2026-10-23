# Tasks

## 1. The API

- [x] 1.1 [backend] Add `dashboardState(organization)` in `apps/api/app/services/dashboard.ts`: members, seats, AI credits and MCP calls with their limits (reusing `usedSeats`, `usedCredits`, `mcpUsage` and `EntitlementService.limits`), the AI credits per UTC day of the last 7 days filled with zeros, and the 10 newest activity entries from memberships, invitations and API keys, with no email, address or key name
- [x] 1.2 [backend] Add `DashboardController.show` in `apps/api/app/controllers/dashboard_controller.ts` and the route `GET orgs/:orgSlug/dashboard` in `apps/api/start/routes.ts`, under `middleware.auth()` and `middleware.org()`; run `node ace codegen` so the web client knows it
- [x] 1.3 [backend] Add `apps/api/tests/functional/dashboard.spec.ts`: the real counts and limits, an unlimited limit as `-1`, the 7-day series with a zero day and today's credits, the activity newest first without emails or key names, only the 10 newest entries when there are more, a member (not admin) reads it, and another organization's data never appears

## 2. The web app

- [x] 2.1 [frontend] Add `useDashboard(orgSlug)` and the `Dashboard` type in `apps/web/src/lib/dashboard.ts`, imitating `apps/web/src/lib/billing.ts`
- [x] 2.2 [frontend] Render the response in `apps/web/src/pages/DashboardPage.tsx`: remove `KPI`, `USAGE` and `ACTIVITY`, show the real cards ("Unlimited", "Not in your plan", credits left floored at 0), the chart with localized weekdays, the activity with localized sentences and the empty state, and `—` while loading
- [x] 2.3 [frontend] Add the new strings in `apps/web/src/locales/en/dashboard.ts` and `apps/web/src/locales/es/dashboard.ts`
- [x] 2.4 [frontend] Update `apps/web/src/pages/dashboard.test.tsx`: the cards show the served numbers, an unlimited limit shows "Unlimited", the chart has 7 points, the activity shows the localized sentences, the empty state shows with no activity, and the page renders in Spanish

## 3. The journeys

- [x] 3.1 [e2e] Add `e2e/specs/dashboard.spec.ts`: a new owner signs up, opens the dashboard and sees 1 member, their own "joined the organization" entry, and the AI credits left of the free plan
