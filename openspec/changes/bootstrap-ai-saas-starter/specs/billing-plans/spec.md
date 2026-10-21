# Spec Delta

## Purpose

Defines sellable plans, their monthly and yearly prices and their entitlements as database records, so operators change the offer without code changes and every feature checks limits the same way.

## ADDED Requirements

### Requirement: Plans stored in the database
Plans SHALL be database records with a stable key, localized name and description (`en`, `es`), localized feature bullets, sort order, public/private visibility, active flag and an entitlements set.

#### Scenario: Add a plan without code
- **WHEN** an operator inserts an active public plan with prices
- **THEN** it appears on the pricing page and in onboarding without a deploy

#### Scenario: Deactivate a plan
- **WHEN** an operator deactivates a plan
- **THEN** it disappears from pricing and new checkouts, while existing subscribers keep it until they change plans

### Requirement: Monthly and yearly prices
Each paid plan SHALL have at most one active price per interval (`month`, `year`) with amount in minor units, ISO currency and the payment provider's product identifier; price changes SHALL create new price records instead of editing ones that have subscribers.

#### Scenario: Price change preserves existing subscribers
- **WHEN** an operator replaces the monthly price of a plan
- **THEN** new checkouts use the new price and existing subscriptions keep referencing the old price

#### Scenario: Two active prices for one interval
- **WHEN** an operator tries to activate a second monthly price for the same plan
- **THEN** the database rejects it

### Requirement: Free plan
Exactly one active plan SHALL be marked as the default free plan, assigned to every organization without a paid subscription.

#### Scenario: New organization
- **WHEN** an organization is created
- **THEN** its effective plan is the default free plan

### Requirement: Entitlements
Entitlements SHALL include at least seat limit, monthly AI credits, MCP access, monthly MCP calls and MCP requests per minute, and the application SHALL read limits only through a single entitlement lookup for the organization's effective plan.

#### Scenario: Seat limit from plan
- **WHEN** an organization's plan allows 5 seats
- **THEN** invitation and member checks use 5 as the limit

#### Scenario: Unlimited value
- **WHEN** an entitlement is configured as unlimited
- **THEN** checks for that entitlement never block

### Requirement: Sync prices to payment provider
An operator command SHALL create missing payment-provider products for active DB prices and store their identifiers, and SHALL report prices whose amount or interval disagree with the provider.

#### Scenario: Sync new price
- **WHEN** the operator runs the sync command after adding a yearly price without a provider product id
- **THEN** a matching product is created at the provider and its id is saved on the price

### Requirement: Public plans API
The API SHALL expose an unauthenticated endpoint returning active public plans with prices and entitlements localized to the request locale.

#### Scenario: Spanish plans
- **WHEN** the plans endpoint is called with locale `es`
- **THEN** names, descriptions and features are returned in Spanish
