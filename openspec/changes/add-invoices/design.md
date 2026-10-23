# Design

## Context

The billing core already receives the webhook of Creem in `apps/api/app/services/billing_events.ts`: every delivery is recorded in `billing_events`, a delivery that was already applied is answered as a duplicate, and each event becomes a `Transition` that carries the organization, the plan name, the amount and the currency. The billing page is reserved to the roles of the `manageBilling` ability (the admins and the owner).

## Goals / Non-Goals

**Goals**: a durable history of what the organization paid or failed to pay, listed in the billing page.

**Non-Goals**: PDF invoices, tax handling, editing or voiding an invoice, an endpoint that changes the state of an invoice (the provider is the only source), an AI or MCP tool for invoices.

## Decisions

### The data

| Column              | Type       | What it is                                         |
| ------------------- | ---------- | -------------------------------------------------- |
| `id`                | increments | The identifier of the invoice                      |
| `organization_id`   | integer    | The organization, `references organizations` with cascade |
| `plan`              | string     | The name of the plan that was billed               |
| `amount`            | integer    | The amount, in cents                               |
| `currency`          | string(3)  | The ISO currency of the amount                     |
| `state`             | string     | `paid` or `failed`                                 |
| `provider_event_id` | string     | The event of the provider, unique                  |
| `created_at`        | timestamp  | When the invoice was recorded                      |
| `updated_at`        | timestamp  | When the invoice changed for the last time         |

The index `(organization_id, created_at)` serves the list. The amount is an integer of cents: the provider sends it that way and money never travels as a float. An invoice is never deleted by the application; it goes away only with its organization.

### The flow

1. `subscription.paid` records a `paid` invoice and `subscription.past_due` a `failed` one, inside the transaction that applies the transition, with the plan, the amount and the currency of the transition. `checkout.completed` creates no invoice: the first period is reported by its own `subscription.paid`.
2. The invoice is keyed by the identifier of the event (`provider_event_id` is unique), so a replayed delivery can never create a second invoice, on top of the duplicate check of `billing_events`.
3. `GET orgs/:orgSlug/billing/invoices` returns the invoices of the organization of the caller, newest first, behind `middleware.auth()`, `middleware.org()` and the `manageBilling` ability. The transformer returns the amount as a number of cents and the currency; the web app formats it with `Intl.NumberFormat` in the language of the interface.
4. The billing page shows an invoices section under the plan, with an empty state when there is none.

## Risks / Trade-offs

- A provider that reports the first payment twice (as `checkout.completed` and as `subscription.paid`) → only `subscription.paid` creates invoices.
- A product that needs pending invoices (manual invoicing) → out of scope; the state column is a string so a later change can add it without a migration of the data.
