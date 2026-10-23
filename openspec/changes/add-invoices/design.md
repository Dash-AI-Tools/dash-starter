# Design

## The data

The table `invoices` holds one row per invoice of the organization:

| Column          | Type      | What it is                                    |
| --------------- | --------- | --------------------------------------------- |
| `id`            | increments | The identifier of the invoice                 |
| `organization_id` | integer  | The organization that owes the invoice        |
| `plan`          | string    | The plan that was bought                      |
| `amount`        | integer   | The amount, in cents                         |
| `currency`      | string    | The currency of the amount                    |
| `state`         | string    | `pending`, `paid` or `failed`                |
| `provider_event_id` | string | The event of the provider that settled it    |
| `created_at`    | timestamp | When the invoice was created                 |
| `updated_at`    | timestamp | When the invoice changed for the last time   |

The invoice belongs to the organization: the index `(organization_id, created_at)` serves the list of the dashboard.

## The flow

1. The webhook of the payment provider carries the event of the subscription. The service creates the invoice, or marks the pending one as paid when the event carries the same identifier.
2. The endpoint of the list returns the invoices of the organization of the caller, newest first, and the transformer returns the amount as a number and the currency.
3. The page of the dashboard shows the list. The strings of the interface live in `apps/web/src/locales/en/common.ts` and `apps/web/src/locales/es/common.ts`.

## The decisions

- The amount is an integer of cents: the provider sends the amount that way, and the money never travels as a float.
- The invoice is never deleted: it is the history of what the organization paid.
