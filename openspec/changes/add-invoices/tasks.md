# Tasks

## 1. The data

- [ ] 1.1 [backend] Add the migration of the table `invoices` in `apps/api/database/migrations/`
- [ ] 1.2 [backend] Add the model `Invoice` in `apps/api/app/models/` and the relation in the model of the organization
- [ ] 1.3 [backend] Add the test of the model in `apps/api/tests/`

## 2. The API

- [ ] 2.1 [backend] Add the validator, the service and the transformer of the invoice in `apps/api/app/validators/`, `apps/api/app/services/` and `apps/api/app/transformers/`
- [ ] 2.2 [backend] Add the controller and the route of the list of the invoices in `apps/api/app/controllers/` and `apps/api/start/routes.ts`
- [ ] 2.3 [backend] Mark the invoice as paid when the event of the payment provider arrives, in the service of the webhook

## 3. The web app

- [ ] 3.1 [frontend] Add the client and the hook of the invoices in `apps/web/src/lib/`
- [ ] 3.2 [frontend] Add the page of the invoices in `apps/web/src/pages/` and the route in the layout of the dashboard
- [ ] 3.3 [frontend] Add the strings of the invoices in `apps/web/src/locales/en/common.ts` and `apps/web/src/locales/es/common.ts`

## 4. The journeys

- [ ] 4.1 [e2e] Add the journey of the list of the invoices in `e2e/specs/`
