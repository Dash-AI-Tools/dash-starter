# Design

## The data

The table `bulk_imports` holds one row per import:

| Column           | Type      | What it is                                |
| ---------------- | --------- | ----------------------------------------- |
| `id`             | increments | The identifier of the import              |
| `organization_id` | integer  | The organization that asked for the import |
| `file_name`      | string    | The name of the file that was uploaded     |
| `state`          | string    | `pending`, `running`, `done` or `failed`  |
| `total_rows`     | integer   | The number of rows of the file             |
| `imported_rows`  | integer   | The number of rows that were invited       |
| `errors`         | jsonb     | The rows that failed, with the line and the reason |
| `created_at`     | timestamp | When the import was created                |
| `updated_at`     | timestamp | When the import changed for the last time  |

The import belongs to the organization: the index `(organization_id, created_at)` serves the list of the dashboard.

## The file

The first line is a header. `email` is required; `role` is optional and defaults to `member`, and accepts `owner`, `admin` or `member`. An empty line is skipped; a line with the wrong number of columns or an address that is not an address is a row error.

```csv
email,role
ada@example.com,member
grace@example.com,admin
```

## The flow

1. A member with the role `owner` or `admin` uploads a CSV. The route sits under `middleware.auth()`, `middleware.org()` and `middleware.verified()`, and the controller authorizes `manageInvitations`.
2. The validator refuses a file that is not a CSV, exceeds 1 MB or holds more than 500 rows; the per-organization budget refuses a sixth import within an hour. Nothing is recorded when one of these checks fails.
3. The service creates the import in the state `pending`, reads the file line by line and calls `inviteMember` for every row, with the role of the row (default `member`).
4. A row that `inviteMember` rejects (invalid address, already a member, already invited, no seat left) is collected in `errors` with its line and the reason; the other rows are still invited.
5. The import ends in the state `done` with the counts and the errors, or in `failed` when the file itself cannot be read. The page shows the state and the errors.

The state of the import is read with `GET orgs/:orgSlug/imports/:id`, scoped by `organization_id`, so another organization never sees it.

## The decisions

- **Invitations, not memberships.** Every row goes through the invitation service, so the invited person consents, the seat of the plan is checked, the duplicate member and the pending invitation are refused, and the email is sent with the same template as a single invitation.
- **Synchronous, with caps.** The file is read in the request and the rows are invited one by one; a 500-row cap keeps the request bounded and avoids a queue. The file never sits in memory as a whole and is never stored.
- **Errors do not abort the file.** One bad row must not lose the other 199, so the failures are collected and reported per line.
- **The import is never deleted.** It is the history of what was imported.
- **The rate limit is per organization.** It reuses the limiter of `apps/api/app/services/rate_limits.ts`, keyed by the organization id.

## The limits

| Limit                | Value | Where it is enforced           |
| -------------------- | ----- | ------------------------------ |
| File size            | 1 MB  | the upload validator          |
| Rows                 | 500   | the upload validator          |
| Imports per hour     | 5     | the rate limiter of the API   |
| Seats                | plan  | `inviteMember`                |
