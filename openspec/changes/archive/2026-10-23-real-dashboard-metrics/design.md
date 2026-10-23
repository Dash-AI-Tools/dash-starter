# Design

## The response

`GET /api/v1/orgs/:orgSlug/dashboard`, under `middleware.auth()` and `middleware.org()`, with no extra ability: every role of the organization reads it.

```json
{
  "dashboard": {
    "members": 3,
    "seats": { "used": 4, "limit": 5 },
    "aiCredits": { "used": 120, "limit": 1000 },
    "mcpCalls": { "used": 0, "limit": 0, "enabled": false },
    "usage": [{ "date": "2026-10-16", "credits": 0 }, "… 7 entries, oldest first, today last"],
    "activity": [
      { "type": "member_joined", "actor": { "fullName": "Ada Lovelace", "initials": "AL" }, "at": "2026-10-22T09:12:00.000Z" }
    ]
  }
}
```

- A `limit` of `-1` means unlimited, as in `EntitlementService`.
- `activity` holds the 10 newest entries, newest first. `type` is `member_joined`, `invitation_sent` or `api_key_created`. `actor` is `null` when the user no longer exists (`api_keys.created_by_id` is `SET NULL`).
- The response carries no email, no invitation address and no key name or prefix: a member sees who did what and when, not the details that the admin pages protect.

## The service

`apps/api/app/services/dashboard.ts` exports `dashboardState(organization)` and reuses the readers that already own each number:

| Number              | Reader                                                     |
| ------------------- | ---------------------------------------------------------- |
| Seats used          | `usedSeats` in `apps/api/app/services/organizations.ts`    |
| AI credits used     | `usedCredits` in `apps/api/app/services/ai_usage.ts`       |
| MCP calls used      | `mcpUsage(...).total` in `apps/api/app/services/mcp_usage.ts` |
| Limits              | `EntitlementService.limits` in `apps/api/app/services/entitlements.ts` |
| Members             | count of `memberships` of the organization                |
| Usage per day       | one grouped query on `ai_usage_events` (new, in this service) |
| Activity            | three bounded queries (new, in this service)               |

The numbers of the cards are the same numbers the billing page shows, because they come from the same functions.

### Usage per day

One query on `ai_usage_events` filtered by `organization_id` and `created_at >= start of the UTC day 6 days ago`, grouped by `(created_at AT TIME ZONE 'UTC')::date`, summing `credits`. The service fills the days without events with `0`, so the series always has 7 points. The index `(organization_id, created_at)` serves it.

### Activity

Three queries, each `ORDER BY created_at DESC LIMIT 10` and joined to `users` for the actor:

- `memberships` → `member_joined`, actor the member;
- `invitations` → `invitation_sent`, actor `invited_by_id`;
- `api_keys` where `tokenable_id` is the organization → `api_key_created`, actor `created_by_id`.

The service merges them, sorts by date and keeps 10. The bound keeps the cost flat however old the organization is.

## The web app

- `apps/web/src/lib/dashboard.ts` adds `useDashboard(orgSlug)` with the type taken from the generated client, as `apps/web/src/lib/billing.ts` does.
- `apps/web/src/pages/DashboardPage.tsx` drops `KPI`, `USAGE` and `ACTIVITY` and renders the response:
  - the cards show `members`, `aiCredits.limit - aiCredits.used` (credits left), `mcpCalls.limit - mcpCalls.used` (calls left) and `seats.used` of `seats.limit`; a limit of `-1` shows "Unlimited"; MCP not enabled in the plan shows "Not in your plan"; credits left never go below `0`;
  - the chart labels each day with the short weekday in the language of the interface (`Intl.DateTimeFormat`, `timeZone: 'UTC'`);
  - each activity row shows the actor (or "A former member"), the localized sentence of its `type` and the date; no activity shows `activityEmpty`;
  - while the query loads, the values show `—`.
- The checklist and its queries do not change.

## The decisions

- **Derived activity, no audit table.** The three tables already record who did it and when. An `activity_events` table would need writes in every service and a backfill; it is left for the change that needs events these tables cannot give (plan changes, role changes, removals).
- **Every member reads the metrics.** Members already see their remaining credits in the chat banners; the response leaves out the emails and key names the admin pages protect.
- **UTC days.** The organization stores no time zone; the period of usage is already computed in UTC.
- **AI credits only in the chart.** It is the metered resource every plan has; MCP calls stay in their card.
