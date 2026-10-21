# Spec Delta

## Purpose

Asks visitors for cookie consent by category, remembers their choice, and guarantees that non-essential scripts and cookies only run after consent.

## ADDED Requirements

### Requirement: Consent banner on first visit
The site SHALL show a localized consent banner on first visit with equally prominent "Accept all", "Reject non-essential" and "Customize" actions, and SHALL not block reading the page.

#### Scenario: First visit
- **WHEN** a visitor without a stored consent opens any page
- **THEN** the consent banner is shown with accept, reject and customize actions

#### Scenario: Choice already made
- **WHEN** a visitor with a stored consent for the current policy version opens a page
- **THEN** no banner is shown

### Requirement: Category preferences
Consent SHALL be granular per category: necessary (always on, not toggleable), analytics and marketing (off by default).

#### Scenario: Customize categories
- **WHEN** a visitor opens "Customize", enables analytics only and saves
- **THEN** the stored consent has analytics granted and marketing denied

### Requirement: Non-essential scripts gated by consent
No analytics or marketing script SHALL load and no non-essential cookie SHALL be set before the matching category is granted; withdrawing consent SHALL stop them from loading on subsequent page loads.

#### Scenario: Rejected analytics
- **WHEN** a visitor rejects non-essential cookies
- **THEN** no registered analytics script is requested and no analytics cookie is present

#### Scenario: Consent granted later
- **WHEN** a visitor later grants analytics from the preferences dialog
- **THEN** registered analytics scripts load without a full page reload

### Requirement: Consent storage and versioning
The choice SHALL be stored in a first-party cookie with the categories, policy version and timestamp, lasting at most 12 months; a policy version change SHALL re-prompt.

#### Scenario: Policy version bump
- **WHEN** the cookie policy version increases
- **THEN** visitors with consent for the older version see the banner again

#### Scenario: Consent expiry
- **WHEN** a stored consent is older than 12 months
- **THEN** the banner is shown again

### Requirement: Reopen preferences
Visitors and users SHALL be able to reopen cookie preferences at any time from the public footer and the dashboard account menu.

#### Scenario: Change mind
- **WHEN** a visitor clicks "Cookie preferences" in the footer
- **THEN** the preferences dialog opens showing their current choices
