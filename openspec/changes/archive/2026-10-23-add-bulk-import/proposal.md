# Proposal

## Why

The members of an organization arrive one by one. A company with two hundred people has to type two hundred addresses, and the product cannot be used for anything bigger than a team.

## What Changes

- A table of the imports: the file, the state, the number of rows and the errors.
- An endpoint that accepts a CSV of addresses and sends one invitation per row, and an endpoint that reports the state of an import.
- The seats of the plan and the limits of the file are enforced: a row that cannot be invited is reported with its line and the reason, and the other rows are still imported.
- Only an owner or an admin imports, and the endpoint is rate limited per organization.
- A page of the dashboard that uploads the file and follows the import.

## Impact

- Affected specs: `bulk-import` (new)
- Affected code: `apps/api/database/migrations/`, `apps/api/app/models/`, `apps/api/app/controllers/`, `apps/api/app/services/`, `apps/api/app/services/rate_limits.ts`, `apps/api/app/validators/`, `apps/api/resources/lang/{en,es}/organizations.json`, `apps/api/start/routes.ts`, `apps/web/src/pages/`, `apps/web/src/lib/`, `apps/web/src/locales/en/common.ts`, `apps/web/src/locales/es/common.ts`

The import sends invitations through `apps/api/app/services/invitations.ts`; it does not create memberships directly, so every imported person keeps the consent, the seat check and the deduplication of a normal invitation.
