# Proposal

## Why

The organization of the product has no invoice: the plan is active, the payment provider sends its events, and nothing shows what was paid. The members of the organization cannot answer the question "what does this cost us this month?".

## What Changes

- A table of the invoices of the organization, with the plan, the amount, the currency and the state.
- An endpoint that lists them and an endpoint that marks one as paid when the provider says so.
- A page of the dashboard that lists them, with the strings of the interface in English and Spanish.

## Impact

- Affected specs: `invoices` (new)
- Affected code: `apps/api/database/migrations/`, `apps/api/app/models/`, `apps/api/app/controllers/`, `apps/api/app/services/`, `apps/api/app/transformers/`, `apps/api/app/validators/`, `apps/api/start/routes.ts`, `apps/web/src/pages/`, `apps/web/src/lib/`, `apps/web/src/locales/en/common.ts`, `apps/web/src/locales/es/common.ts`
