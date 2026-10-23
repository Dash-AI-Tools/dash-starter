# Proposal

## Why

The organization of the product has no invoice: the plan is active, the payment provider sends its events, and nothing shows what was paid. The admins of the organization cannot answer the question "what does this cost us this month?". Invoices are part of the core billing offer, so every product generated from the template has them.

## What Changes

- A table of the invoices of the organization, with the plan, the amount, the currency and the state, filled by the webhook of the payment provider: a paid period creates a `paid` invoice and a failed charge a `failed` one.
- An endpoint that lists the invoices of the organization, for the roles that manage the billing.
- An invoices section in the billing page of the dashboard, with its strings in English and Spanish.

## Capabilities

### New Capabilities

- `invoices`: the invoices of an organization, created from the events of the payment provider and listed in the billing page.

## Impact

- API: a migration, the `Invoice` model, the invoices service called from `apps/api/app/services/billing_events.ts`, a transformer, the list endpoint in `apps/api/app/controllers/billing_controller.ts` and `apps/api/start/routes.ts`.
- Web: `apps/web/src/lib/billing.ts`, the billing page, the billing catalogs `apps/web/src/locales/{en,es}/billing.ts`.
- Data: a new table; no change to the existing ones. Rollback drops the table.
