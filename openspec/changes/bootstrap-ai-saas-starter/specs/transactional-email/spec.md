# Spec Delta

## Purpose

Delivers the product's transactional emails reliably through Brevo, localized to each recipient, with a safe local alternative for development and tests.

## ADDED Requirements

### Requirement: Email catalog
The system SHALL send these transactional emails: email verification, email change verification, password reset, password changed notice, organization invitation, welcome after onboarding, subscription started, payment failed, subscription canceled, and AI/MCP quota at 80% and 100%.

#### Scenario: Invitation email
- **WHEN** an admin invites someone
- **THEN** the invitee receives the invitation email containing organization name, inviter name and accept link

### Requirement: Brevo delivery in production
In production the system SHALL deliver email through Brevo's transactional API using the configured sender name and address, and SHALL record each send attempt's provider message id or error.

#### Scenario: Provider error
- **WHEN** Brevo rejects a send with a transient error
- **THEN** the send is retried with backoff up to 3 times and the final failure is logged with the email type and recipient id

### Requirement: Local email capture
Outside production, emails SHALL be delivered to the local SMTP catcher instead of Brevo unless a Brevo key is explicitly configured, and tests SHALL capture emails in memory for assertions.

#### Scenario: Dev sign up
- **WHEN** a developer signs up locally
- **THEN** the verification email appears in the Mailpit inbox and no external email is sent

### Requirement: Localized templates
Each email SHALL be rendered in the recipient's locale (user preference, else organization default locale for invitations, else product default), with localized subject, body and a plain-text alternative.

#### Scenario: Spanish password reset
- **WHEN** a user whose locale is `es` requests a password reset
- **THEN** the subject and body are in Spanish

### Requirement: Branded responsive layout
Emails SHALL share a single responsive layout with the product name, logo, footer with support contact and legal address placeholder, and render readably in clients without images.

#### Scenario: Images blocked
- **WHEN** an email is viewed with images disabled
- **THEN** the product name and call-to-action link remain visible

### Requirement: Non-blocking sending
Sending email SHALL NOT block or fail the user request that triggered it.

#### Scenario: Email provider slow
- **WHEN** Brevo responds slowly during sign up
- **THEN** the sign-up request completes without waiting for delivery
