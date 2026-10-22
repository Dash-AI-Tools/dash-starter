# dashboard-shell Specification

## Purpose

Defines the authenticated application frame every dashboard page lives in: layout, role-aware navigation, organization switcher, user menu and global search.

## Requirements

### Requirement: Application layout
Dashboard routes under `/app/<orgSlug>` SHALL render inside a layout with a collapsible sidebar, a top bar with breadcrumbs, global search trigger, notifications slot and user menu; on viewports under 768px the sidebar SHALL become a drawer.

#### Scenario: Mobile navigation
- **WHEN** the dashboard is opened at 375px width
- **THEN** the sidebar is hidden behind a menu button that opens it as a drawer

#### Scenario: Collapsed state remembered
- **WHEN** a user collapses the sidebar and reloads
- **THEN** the sidebar stays collapsed

### Requirement: Role-aware navigation
Sidebar items SHALL be declared once with the minimum role required, and items the current user's role cannot access SHALL be hidden; the navigation SHALL include Dashboard, AI Chat, Settings (Organization, Members, Billing, API keys) and Account (Profile).

#### Scenario: Member navigation
- **WHEN** a member views the sidebar
- **THEN** Billing and API keys are not shown

### Requirement: Organization switcher
The top of the sidebar SHALL show the active organization with a switcher listing the user's organizations and an option to create a new one.

#### Scenario: Create from switcher
- **WHEN** a user selects "Create organization" in the switcher
- **THEN** the onboarding flow starts for a new organization

### Requirement: Global search and command palette
A command palette SHALL open with Ctrl/Cmd+K or the search trigger and SHALL search navigation destinations, actions and organization-scoped records exposed by features through a registered search provider, showing results grouped by type.

#### Scenario: Keyboard open
- **WHEN** a user presses Cmd+K anywhere in the dashboard
- **THEN** the command palette opens with focus in the search input

#### Scenario: Search members
- **WHEN** an admin types part of a member's name
- **THEN** matching members appear under a "Members" group and selecting one opens the members page filtered to them

### Requirement: Dashboard home
The organization dashboard home SHALL show example KPI cards, a chart, a recent-activity table and the getting-started checklist built from the component kit, as a replaceable starting point.

#### Scenario: Home renders
- **WHEN** a member opens `/app/<slug>`
- **THEN** KPI cards, a chart and a table render with localized labels

### Requirement: Session and error states
The shell SHALL redirect to login on session expiry, show a localized not-found page for unknown routes and organizations, and show a recoverable error page when a page fails to render.

#### Scenario: Expired session
- **WHEN** an API call returns 401 while using the dashboard
- **THEN** the user is sent to login and returned to the same page after signing in
