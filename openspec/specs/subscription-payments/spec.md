# subscription-payments Specification

## Purpose

Lets organizations subscribe to paid plans monthly or yearly through Creem, keeps subscription state in sync from Creem webhooks, and applies the resulting plan to the organization's entitlements.

## Requirements

### Requirement: Hosted checkout
Owners and admins with a verified email SHALL be able to start a Creem hosted checkout for a selected plan price; the checkout SHALL carry the organization and price identifiers and return the user to the billing page.

#### Scenario: Start checkout
- **WHEN** an admin chooses Pro yearly
- **THEN** they are redirected to a Creem checkout for the Pro yearly product, prefilled with their email

#### Scenario: Already subscribed
- **WHEN** an organization with an active subscription starts a new checkout
- **THEN** the request is refused and the user is directed to change plan instead

### Requirement: Webhook processing
The API SHALL accept Creem webhooks only with a valid HMAC-SHA256 signature, process each event id at most once, and update the organization's subscription status, price, period end and cancellation flag from the event.

#### Scenario: Invalid signature
- **WHEN** a webhook arrives with a missing or wrong `creem-signature`
- **THEN** it is rejected with 401 and no state changes

#### Scenario: Duplicate event
- **WHEN** the same webhook event is delivered twice
- **THEN** the second delivery returns 200 and changes nothing

#### Scenario: Subscription activated
- **WHEN** a valid `subscription.active` or `checkout.completed` event arrives for an organization
- **THEN** the organization's subscription becomes active on that price and its entitlements switch to that plan

#### Scenario: Out-of-order events
- **WHEN** an older event arrives after a newer one for the same subscription
- **THEN** the subscription keeps the state of the newer event

### Requirement: Checkout return is not trusted
Returning from checkout SHALL NOT activate a subscription by itself; the billing page SHALL show a pending state until the webhook confirms it.

#### Scenario: Return before webhook
- **WHEN** the user returns from checkout before the webhook is processed
- **THEN** the billing page shows "processing" and updates once the subscription is active

### Requirement: Subscription lifecycle
The system SHALL handle renewal, past-due, cancellation at period end, immediate cancellation and expiry; past-due subscriptions keep access for a grace period of 7 days, after which the organization falls back to the free plan.

#### Scenario: Payment failed
- **WHEN** a `subscription.past_due` event arrives
- **THEN** admins are emailed, a dashboard banner appears and access continues during the grace period

#### Scenario: Cancel at period end
- **WHEN** an admin cancels the subscription
- **THEN** it remains active until the period end, then the organization reverts to the free plan

### Requirement: Change plan and interval
Admins SHALL be able to upgrade, downgrade or switch between monthly and yearly; the change SHALL be applied through Creem, and a downgrade SHALL be refused while current usage exceeds the target plan's seat limit.

#### Scenario: Downgrade blocked by seats
- **WHEN** an organization with 8 members tries to downgrade to a 5-seat plan
- **THEN** the change is refused listing the seats to remove

### Requirement: Billing page and customer portal
The billing settings page SHALL show the current plan, interval, status, next renewal or end date, usage against entitlements and a link to the Creem customer portal for invoices and payment methods.

#### Scenario: Open portal
- **WHEN** an admin clicks "Manage payment and invoices"
- **THEN** they are redirected to a Creem customer portal session for the organization's customer

### Requirement: Test mode
Outside production the integration SHALL use Creem's test environment, and the e2e suite SHALL exercise the lifecycle using signed simulated webhooks.

#### Scenario: Simulated activation in e2e
- **WHEN** the e2e suite posts a correctly signed simulated activation event
- **THEN** the organization shows the paid plan on the billing page
