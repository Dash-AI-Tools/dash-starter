# public-site Specification

## Purpose

Provides the unauthenticated marketing surface of a new product: landing page, pricing page and the shared public layout.

## Requirements

### Requirement: Landing page
The site SHALL serve a landing page at `/` with hero, feature highlights, pricing teaser, FAQ and call-to-action sections whose copy comes from localized content, using placeholder content that the template user replaces.

#### Scenario: Anonymous visitor
- **WHEN** an unauthenticated visitor opens `/`
- **THEN** the landing page renders with sign-up and login calls to action

#### Scenario: Authenticated visitor
- **WHEN** a signed-in user opens `/`
- **THEN** the landing page renders and the header offers a link to their dashboard instead of login

### Requirement: Pricing page from database
The site SHALL serve a pricing page listing active, public plans from the database with a monthly/yearly toggle, localized names, descriptions, features and formatted prices.

#### Scenario: Toggle interval
- **WHEN** a visitor switches the pricing toggle from monthly to yearly
- **THEN** each plan shows its yearly price and the savings relative to twelve monthly payments

#### Scenario: Plan without yearly price
- **WHEN** a plan has no active yearly price
- **THEN** that plan is shown as unavailable for yearly billing rather than hidden or mispriced

#### Scenario: Choose a plan anonymously
- **WHEN** an anonymous visitor selects a paid plan
- **THEN** they are sent to sign up and, after onboarding, to checkout for that plan and interval

### Requirement: Public layout
All public pages SHALL share a header (logo, navigation, language switcher, auth links) and a footer linking to terms, privacy, cookie preferences and contact.

#### Scenario: Footer links present
- **WHEN** any public page renders
- **THEN** the footer contains working links to terms, privacy and the cookie preferences dialog

### Requirement: Page metadata
Each public page SHALL set a localized document title and meta description, and the landing page SHALL include Open Graph tags.

#### Scenario: Spanish title
- **WHEN** a visitor views the pricing page in Spanish
- **THEN** the document title is the Spanish pricing title

### Requirement: Accessible public pages
Public pages SHALL be keyboard navigable, have one `h1`, meet WCAG 2.1 AA contrast and work at 320px viewport width without horizontal scrolling.

#### Scenario: Automated accessibility check
- **WHEN** the e2e suite runs an accessibility scan on the landing and pricing pages
- **THEN** no serious or critical violations are reported
