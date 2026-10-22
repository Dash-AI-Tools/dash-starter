# Spec Delta

## Purpose

Makes every user-facing surface of the product available in English and Spanish, chooses the right locale for each visitor and user, and prevents untranslated text from shipping.

## ADDED Requirements

### Requirement: Supported locales
The product SHALL support `en` and `es` on every user-facing surface: public pages, legal pages, dashboard, emails, API validation and error messages, AI chat interface, cookie banner and DB-stored plan content.

#### Scenario: Full Spanish session
- **WHEN** a user with locale `es` signs up, onboards, browses the dashboard and receives emails
- **THEN** no English UI string is shown to them outside user-generated content and AI-generated text

### Requirement: Locale resolution
The active locale SHALL be resolved in this order: signed-in user preference, explicit choice stored in a cookie, browser `Accept-Language`, product default locale.

#### Scenario: Anonymous Spanish browser
- **WHEN** a visitor with browser language `es-MX` and no stored choice opens the landing page
- **THEN** the page renders in Spanish

#### Scenario: User preference wins
- **WHEN** a user whose preference is `en` signs in from a Spanish browser
- **THEN** the dashboard renders in English

### Requirement: Language switcher
Public pages and the dashboard SHALL offer a language switcher that changes the locale without losing the current page, persisting to the cookie and, when signed in, to the user preference.

#### Scenario: Switch on pricing
- **WHEN** a visitor switches to English on the Spanish pricing page
- **THEN** the same pricing page re-renders in English with the same interval selected

### Requirement: API responses localized
The API SHALL localize validation messages, error messages and emails using the request's resolved locale, and SHALL keep machine-readable error codes locale-independent.

#### Scenario: Spanish validation error
- **WHEN** a request with locale `es` fails validation on `email`
- **THEN** the 422 response contains a Spanish message and a stable rule code for that field

### Requirement: Locale-aware formatting
Dates, times, numbers, currencies and plurals SHALL be formatted with the active locale's conventions.

#### Scenario: Currency formatting
- **WHEN** a price of 1900 cents USD is shown in Spanish
- **THEN** it is formatted according to Spanish conventions for USD

### Requirement: Translation completeness enforced
The build or test pipeline SHALL fail when a key exists in one locale's frontend or backend catalog but is missing in the other, or when a DB-stored localized field lacks a supported locale.

#### Scenario: Missing Spanish key
- **WHEN** a developer adds an English UI string without a Spanish translation
- **THEN** typechecking or the translation test fails naming the missing key

### Requirement: Localized document language
The HTML `lang` attribute SHALL match the active locale.

#### Scenario: lang attribute
- **WHEN** the active locale is Spanish
- **THEN** the document root has `lang="es"`
