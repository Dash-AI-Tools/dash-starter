# Spec Delta

## Purpose

The invoices of an organization: what it was billed, how much and when.

## ADDED Requirements

### Requirement: Invoicing

The system SHALL keep one invoice per payment of the organization, with the plan, the amount, the currency and the state.

#### Scenario: The event of the provider creates the invoice
- **WHEN** the webhook of the payment provider reports a settled subscription of the organization
- **THEN** an invoice is created with the plan, the amount and the currency of the event, in the state `paid`

#### Scenario: The list of the invoices belongs to the organization
- **WHEN** a member of the organization asks for the invoices
- **THEN** the system returns the invoices of their own organization, newest first, and no invoice of another organization

#### Scenario: The dashboard shows the invoices
- **WHEN** a member opens the page of the invoices of the dashboard
- **THEN** the page lists the invoices of the organization with the plan, the amount and the state, in the language of the interface
