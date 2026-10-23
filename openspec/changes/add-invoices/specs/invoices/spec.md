# Spec Delta

## ADDED Requirements

### Requirement: Invoices from the payment provider

The system SHALL record one invoice per paid or failed billing period of the organization, from the events of the payment provider, with the plan, the amount in cents, the currency and the state, and SHALL never record the same event twice.

#### Scenario: A paid period creates a paid invoice

- **WHEN** the webhook of the payment provider reports `subscription.paid` for the organization
- **THEN** an invoice is recorded with the plan, the amount and the currency of the event, in the state `paid`

#### Scenario: A failed charge creates a failed invoice

- **WHEN** the webhook reports `subscription.past_due` for the organization
- **THEN** an invoice is recorded in the state `failed`

#### Scenario: A replayed event creates no second invoice

- **WHEN** the same event is delivered twice
- **THEN** the organization has a single invoice for it

### Requirement: Invoice list

The system SHALL list the invoices of an organization, newest first, only to the roles that manage its billing.

#### Scenario: An admin lists the invoices of the organization

- **WHEN** an admin or the owner asks for the invoices of the organization
- **THEN** the system returns its invoices, newest first, and no invoice of another organization

#### Scenario: A member cannot read the invoices

- **WHEN** a member without the billing role asks for the invoices
- **THEN** the system refuses the request

#### Scenario: The billing page shows the invoices

- **WHEN** an admin opens the billing page
- **THEN** the page lists the invoices with the plan, the amount, the state and the date, in the language of the interface, or an empty state when there is none
