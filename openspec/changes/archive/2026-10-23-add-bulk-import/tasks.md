# Tasks

## 1. The data

- [x] 1.1 [backend] Complete the migration of `bulk_imports` in `apps/api/database/migrations/` with `file_name`, `state`, `total_rows`, `imported_rows` and `errors`, plus the index `(organization_id, created_at)`, and regenerate `apps/api/database/schema.ts`
- [x] 1.2 [backend] Add the model `BulkImport` in `apps/api/app/models/` and the `imports` relation in the model of the organization
- [x] 1.3 [backend] Add the test of the model in `apps/api/tests/`: the defaults of the state and the counts, and the cascade with the organization

## 2. The API

- [x] 2.1 [backend] Add the upload validator in `apps/api/app/validators/bulk_import.ts`: a CSV of at most 1 MB, and its row cap of 500 in the service, with the localized messages in `apps/api/resources/lang/{en,es}/organizations.json`
- [x] 2.2 [backend] Add the per-organization budget of 5 imports per hour in `apps/api/app/services/rate_limits.ts`
- [x] 2.3 [backend] Add the service in `apps/api/app/services/` that reads the CSV, creates the import and calls `inviteMember` for every row, collecting the line and the reason of each failure
- [x] 2.4 [backend] Add the controller and the routes `POST orgs/:orgSlug/imports` and `GET orgs/:orgSlug/imports/:id` in `apps/api/app/controllers/` and `apps/api/start/routes.ts`, under `middleware.auth()`, `middleware.org()` and `middleware.verified()`, authorizing `manageInvitations`; run `node ace codegen`
- [x] 2.5 [backend] Add `apps/api/tests/functional/imports.spec.ts` for every scenario of the delta: the invitations are sent and no membership exists, the failing rows are reported and the others invited, the seats stop the file, another organization never reads the import, a `member` is refused, a non-CSV or oversized or too-long file is refused, and the sixth import within an hour is refused

## 3. The web app

- [x] 3.1 [frontend] Add the client and the hook of the import in `apps/web/src/lib/`, imitating `apps/web/src/lib/organizations.ts`
- [x] 3.2 [frontend] Add the page of the import in `apps/web/src/pages/ImportMembersPage.tsx` with the file input, the state of the import and the table of the errors, its route `members/import` in the dashboard and its button in the members page
- [x] 3.3 [frontend] Add the strings of the import in `apps/web/src/locales/en/organizations.ts` and `apps/web/src/locales/es/organizations.ts`, in both languages
- [x] 3.4 [frontend] Add `apps/web/src/pages/imports.test.tsx`: the page uploads a file, shows the state, the counts and the errors, and renders in Spanish

## 4. The journeys

- [x] 4.1 [e2e] Add the journey of the import in `e2e/specs/`: an owner uploads a CSV, the page follows the import and the invited addresses appear in the members page
