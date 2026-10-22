# ui-components Specification

## Purpose

Provides a consistent, accessible, themeable component kit that every dashboard feature is built from, plus a showcase page documenting each component with live examples.

## Requirements

### Requirement: Component inventory
The kit SHALL include at least: button (variants, sizes, loading), input, textarea, select, combobox, checkbox, radio, switch, date picker, file upload, form field with label/help/error, dialog, sheet, dropdown menu, context menu, tabs, tooltip, popover, toast, badge, avatar, card, skeleton, empty state, pagination, breadcrumb, command/search input, data table and charts (line, bar, area, pie).

#### Scenario: Showcase lists every component
- **WHEN** a developer opens the component showcase page
- **THEN** each component in the inventory is rendered with its main variants

### Requirement: Forms with schema validation
Form components SHALL bind to a schema, show field-level localized errors on blur and submit, map API validation errors (HTTP 422) to the matching fields, and disable submit while pending.

#### Scenario: Server-side error mapping
- **WHEN** the API rejects a form with a 422 error for field `slug`
- **THEN** the error message appears under the slug field

### Requirement: Data table
The data table SHALL support column sorting, text search, filters, server-side pagination, row selection with bulk actions, column visibility and loading/empty/error states, and SHALL reflect sort, filter and page in the URL.

#### Scenario: Shareable table state
- **WHEN** a user sorts by name, filters to admins and goes to page 2, then reloads
- **THEN** the table shows the same sort, filter and page

#### Scenario: Empty results
- **WHEN** a search returns no rows
- **THEN** the table shows a localized empty state with an action to clear filters

### Requirement: Charts
Chart components SHALL render from plain data series, use theme tokens for colors in light and dark mode, include accessible labels and a tooltip, and format numbers and dates for the active locale.

#### Scenario: Locale formatting
- **WHEN** a chart renders in Spanish
- **THEN** axis numbers and dates use Spanish formatting

### Requirement: Theming
Components SHALL use design tokens defined once as CSS variables, support light, dark and system themes, and allow rebranding by changing tokens only.

#### Scenario: Rebrand
- **WHEN** a developer changes the primary color token
- **THEN** buttons, links, focus rings and charts reflect the new color without component changes

### Requirement: Accessibility of components
Interactive components SHALL be keyboard operable, have visible focus, expose correct ARIA roles and names, and trap focus in modal surfaces.

#### Scenario: Dialog focus
- **WHEN** a dialog opens
- **THEN** focus moves into it, Tab cycles within it and Escape closes it returning focus to the trigger

### Requirement: Showcase availability
The showcase page SHALL be available in development builds and SHALL be excluded from production builds unless explicitly enabled.

#### Scenario: Production build
- **WHEN** the web app is built for production with default settings
- **THEN** the showcase route responds with the not-found page
