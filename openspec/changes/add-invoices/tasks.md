# Tasks

## 1. The data

- [ ] 1.1 [backend] Add the migration of the table `invoices` in `apps/api/database/migrations/` as in the design (unique `provider_event_id`, index `(organization_id, created_at)`), run it and regenerate `apps/api/database/schema.ts`
- [ ] 1.2 [backend] Add the model `Invoice` in `apps/api/app/models/` and the `invoices` relation in the model of the organization

## 2. The API

- [ ] 2.1 [backend] Add the invoices service in `apps/api/app/services/` and call it from `apps/api/app/services/billing_events.ts` inside the transaction of the transition: `subscription.paid` records a `paid` invoice, `subscription.past_due` a `failed` one, keyed by the event
- [ ] 2.2 [backend] Add the invoice transformer in `apps/api/app/transformers/` and the list action `invoices` in `apps/api/app/controllers/billing_controller.ts`, routed as `GET orgs/:orgSlug/billing/invoices` with the billing routes, authorized with `manageBilling`; run `node ace codegen`
- [ ] 2.3 [backend] Add the functional tests in `apps/api/tests/functional/` for every scenario of the delta: a paid and a failed event create their invoice, a replayed event creates none, the list is newest first and holds no invoice of another organization, a member is refused

## 3. The web app

- [ ] 3.1 [frontend] Add the invoices query to `apps/web/src/lib/billing.ts` on the typed client
- [ ] 3.2 [frontend] Add the invoices section to the billing page (plan, amount formatted with `Intl.NumberFormat`, state, date, an empty state) with its strings in `apps/web/src/locales/en/billing.ts` and `apps/web/src/locales/es/billing.ts`
- [ ] 3.3 [frontend] Add the web tests: the section lists the invoices in English and in Spanish, and shows the empty state

## 4. The journeys

- [ ] 4.1 [e2e] Extend the billing journey in `e2e/specs/` so a simulated paid webhook shows its invoice in the billing page

## 5. The documentation

- [ ] 5.1 [docs] Add the invoices to `docs/billing.md`: the events that create them, the states, the endpoint and who can read it
