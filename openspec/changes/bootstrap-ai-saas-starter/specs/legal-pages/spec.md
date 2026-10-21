# Spec Delta

## Purpose

Publishes the product's terms and conditions and privacy/cookie policy as public, localized, versioned pages that sign-up and cookie consent can reference.

## ADDED Requirements

### Requirement: Terms and conditions page
The site SHALL serve a public terms and conditions page at `/terms` in every supported locale, showing a version identifier and last-updated date.

#### Scenario: View terms
- **WHEN** a visitor opens `/terms`
- **THEN** the terms render in the active locale with their version and last-updated date

### Requirement: Privacy and cookie policy page
The site SHALL serve a public privacy policy at `/privacy` that includes a cookie section listing each cookie category and the cookies the product sets.

#### Scenario: Cookie table
- **WHEN** a visitor opens `/privacy`
- **THEN** the page lists necessary, analytics and marketing categories with the cookies in each

### Requirement: Template placeholder content
Legal pages SHALL ship with clearly marked placeholder text and product/company variables filled by the installer, and SHALL NOT present the placeholder as legally reviewed.

#### Scenario: Placeholder notice
- **WHEN** the template's legal pages are viewed before customization
- **THEN** a visible notice states the text is a template to be reviewed by the product owner

### Requirement: Terms acceptance is recorded
Sign up SHALL require accepting the current terms version, and the accepted version and timestamp SHALL be stored on the user.

#### Scenario: Terms version stored
- **WHEN** a user signs up accepting terms version `2026-10-01`
- **THEN** their account records terms version `2026-10-01` and the acceptance time

#### Scenario: Terms updated
- **WHEN** the current terms version changes after a user accepted an older one
- **THEN** the user is asked to accept the new version on their next authenticated visit before continuing
