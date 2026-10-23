---
type: Reference
title: Billing
description: Plans, Creem checkout, subscriptions, webhooks, entitlements and the billing emails.
tags: [billing, payments, creem, reference]
status: stable
---

# Billing

The billing of the starter is built on [Creem](https://creem.io). The catalog of plans lives in the database, the prices are mirrored as products in Creem, and the state of every subscription is written by the webhooks of Creem — never by the browser.

- [How it works](#how-it-works)
- [The catalog of plans](#the-catalog-of-plans)
- [Configuring Creem](#configuring-creem)
- [The webhook](#the-webhook)
- [Syncing the prices](#syncing-the-prices)
- [The endpoints](#the-endpoints)
- [The emails](#the-emails)
- [Testing without a Creem account](#testing-without-a-creem-account)

---

## How it works

1. The visitor picks a plan on the billing page and the API creates a **hosted checkout** in Creem, carrying the organization and the price in the metadata of the checkout.
2. The visitor pays in Creem and comes back to the billing page. The page shows a **processing** state: the return from the checkout never activates a subscription by itself.
3. Creem sends a **signed webhook** and the API updates the subscription of the organization, its period end and its cancellation flag.
4. The **entitlements** of the organization follow the effective plan: the plan of the subscription while it is active, trialing or inside the grace period, and the free plan otherwise.

Every limit of the product is read through a single lookup, `EntitlementService.for(organization)`. Never read the plan directly: the effective plan depends on the state of the subscription, and the service is the one that knows it.

---

## The catalog of plans

The plans are rows of the `plans` table, with their prices in `plan_prices`. The starter ships three of them, seeded from `apps/api/app/services/plans.ts`:

| Plan     | Seats | AI credits / month | MCP | MCP calls / month | MCP req/min | Price           |
| -------- | ----- | ------------------ | --- | ----------------- | ----------- | --------------- |
| Free     | 3     | 100                | no  | –                 | –           | $0              |
| Pro      | 10    | 1000               | yes | 1000              | 30          | $19/mo, $190/yr |
| Business | 50    | 5000               | yes | 10000             | 60          | $49/mo, $490/yr |

Exactly one active plan carries the flag `is_default_free`; a partial unique index makes the database reject a second one. Every organization without a paid subscription is on it.

A limit of `-1` means that the feature is not limited: the checks of that entitlement never block, and the billing page shows "Unlimited" instead of a number.

### Changing a plan

The catalog is data, not code: an operator can change it in the database and the pricing page, the onboarding and the entitlements follow without a deploy.

**Name, description, features and entitlements** are edited in place:

```sql
UPDATE plans
SET name = '{"en":"Starter","es":"Inicial"}',
    description = '{"en":"For small teams.","es":"Para equipos pequeños."}',
    features = '{"en":["Up to 3 seats"],"es":["Hasta 3 puestos"]}',
    entitlements = '{"seats":3,"aiCredits":100,"mcpEnabled":false,"mcpCalls":0,"mcpRpm":0}'
WHERE key = 'free';
```

**Prices are never edited in place.** A price that has subscribers is history, so a new amount creates a new row and deactivates the old one. Do it with the seeder, which does exactly that, or by hand:

```sql
UPDATE plan_prices SET is_active = false WHERE plan_id = <free> AND interval = 'month';
INSERT INTO plan_prices (plan_id, interval, amount_cents, currency, is_active)
VALUES (<free>, 'month', 500, 'USD', true);
```

A partial unique index (`plan_id`, `interval`) where the price is active makes the database reject a second active price for the same interval.

The amounts and the copy of the catalog in `PLAN_CATALOG` are placeholders: replace them with the real ones before the first deploy, either in the code or in the database afterwards. `node ace db:seed` can be run as many times as needed — it never creates duplicates.

---

## Configuring Creem

### 1. Create the store

Sign up at [dashboard.creem.io](https://dashboard.creem.io) and create a store. The store has a **test mode** and a **live mode**, with separate keys and separate webhooks.

### 2. Fill the environment file

```bash
# apps/api/.env
CREEM_API_KEY=your-api-key
CREEM_WEBHOOK_SECRET=your-webhook-signing-secret
CREEM_ENV=test
```

| Variable               | Meaning                                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `CREEM_API_KEY`        | The key of the store, sent as the `x-api-key` header.                                                                  |
| `CREEM_WEBHOOK_SECRET` | The secret the webhooks are signed with. A webhook without a valid signature is rejected with 401 and changes nothing. |
| `CREEM_ENV`            | `test` talks to `https://test-api.creem.io`, `live` to `https://api.creem.io`. Use `test` everywhere but production.   |

A malformed value stops the API with a message naming the variable. The three keys are optional outside production, so the stack boots and the whole test suite passes with no third-party account.

### 3. Point the webhook at the API

In the dashboard of the store, add a webhook:

```
https://<your-api-host>/api/v1/webhooks/creem
```

Subscribe it to the events of the [subscription lifecycle](#the-webhook). The same URL works in test and in live mode: they are different stores, with different secrets.

The endpoint is public — the signature of the request is what proves it comes from Creem. It is exempt from the CSRF protection, because the request is not a form.

### 4. Sync the prices

See [Syncing the prices](#syncing-the-prices).

---

## The webhook

Creem signs every webhook with an HMAC-SHA256 of the **raw body**, and sends the digest in the `creem-signature` header. The API recomputes it with `CREEM_WEBHOOK_SECRET` and compares it in constant time. A missing or wrong signature is rejected with 401.

Each event is recorded in `billing_events` before it is applied, so an event that is delivered twice changes nothing the second time. The state of the subscription is updated inside a transaction, with the row locked, and an event that is older than the last applied one is ignored.

| Event                                                            | The subscription becomes                             |
| ---------------------------------------------------------------- | ---------------------------------------------------- |
| `checkout.completed`, `subscription.active`, `subscription.paid` | `active`                                             |
| `subscription.trialing`                                          | `trialing`                                           |
| `subscription.past_due`, `subscription.unpaid`                   | `past_due` / `unpaid`, with a grace period of 7 days |
| `subscription.scheduled_cancel`                                  | `active`, with `cancel_at_period_end`                |
| `subscription.canceled`                                          | `canceled`                                           |
| `subscription.expired`                                           | `expired`                                            |
| `subscription.paused`                                            | `paused`                                             |

A failed payment does not take the access away right away: the organization keeps the plan of its subscription until the grace period is over, and then falls back to the free plan. The billing page shows a banner during that time.

> There is no `subscription.renewed` in Creem. A renewal arrives as `subscription.paid`.

---

## Syncing the prices

The prices of the database and the products of Creem are two catalogs that have to agree. The command compares them and fixes the missing half:

```bash
cd apps/api
node ace billing:sync
```

- A price **without** a product id gets one: the command creates the product in Creem and saves its id on the price.
- A product that **no longer exists** in Creem is created again.
- A price whose **amount or period** disagrees with its product is reported as drift — the command does not change the amount, because the subscribers keep the price they signed up with.

```
Created the product prod_abc for the plan pro (year)
The plan pro (month) costs 1900 cents in the database and 2500 cents in the payment provider
1 products created, 1 prices out of sync, 2 prices without a product
```

The prices that cost nothing are skipped: the free plan is not sold.

---

## The endpoints

| Method | Path                                        | What it does                                                                              |
| ------ | ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `GET`  | `/api/v1/plans`                             | The public catalog, localized to the locale of the request.                               |
| `GET`  | `/api/v1/orgs/:orgSlug/billing`             | The plan, the status, the period end and the usage of the organization.                   |
| `POST` | `/api/v1/orgs/:orgSlug/billing/checkout`    | Creates the checkout and returns the URL of Creem. Needs an admin with a confirmed email. |
| `POST` | `/api/v1/orgs/:orgSlug/billing/change-plan` | Moves the subscription to another plan or interval.                                       |
| `POST` | `/api/v1/orgs/:orgSlug/billing/cancel`      | Cancels the subscription, right away or when the period ends.                             |
| `GET`  | `/api/v1/orgs/:orgSlug/billing/portal`      | The link of the customer portal, with the invoices and the payment methods.               |
| `POST` | `/api/v1/webhooks/creem`                    | The events of Creem. Public, signed.                                                      |

A downgrade that would leave the organization with more members than the new plan has seats for is refused, and the answer names how many members have to leave first.

---

## The emails

Three emails go to the owner of the organization when the subscription changes, after the transaction is committed:

| Email                 | When                                             |
| --------------------- | ------------------------------------------------ |
| Subscription started  | The subscription becomes active.                 |
| Payment failed        | The subscription becomes `past_due` or `unpaid`. |
| Subscription canceled | The subscription becomes `canceled`.             |

They are written in the default language of the organization, and they link to the billing page.

---

## Testing without a Creem account

Nothing in the test suite needs a Creem account:

- The unit and functional suites replace the client of the provider with a fake (`app.container.swap(CreemClient, ...)`), so no request leaves the machine.
- The webhook suite posts **signed simulated events** to the real endpoint, with a secret of its own, and checks the state of the subscription that comes out of them.

To try the flow by hand without a store, point `CREEM_API_KEY` at an empty value: the checkout will fail with an error from the provider, and the rest of the billing page keeps working.
