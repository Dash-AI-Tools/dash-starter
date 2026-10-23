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
The organization dashboard home SHALL show KPI cards, a usage chart and a recent-activity table filled with the real metrics of the organization, and the getting-started checklist, built from the component kit with localized labels.

#### Scenario: Home renders
- **WHEN** a member opens `/app/<slug>`
- **THEN** KPI cards, a chart and a table render with localized labels and the values the API returns for the organization

#### Scenario: Unlimited limits
- **WHEN** the plan of the organization has an unlimited limit of AI credits or seats
- **THEN** the matching card shows "Unlimited" instead of a number

#### Scenario: No activity yet
- **WHEN** the organization has no activity to show
- **THEN** the activity section shows the localized empty state

### Requirement: Session and error states
The shell SHALL redirect to login on session expiry, show a localized not-found page for unknown routes and organizations, and show a recoverable error page when a page fails to render.

#### Scenario: Expired session
- **WHEN** an API call returns 401 while using the dashboard
- **THEN** the user is sent to login and returned to the same page after signing in

### Requirement: Dashboard metrics
The API SHALL expose `GET /api/v1/orgs/:orgSlug/dashboard` to every member of the organization, returning the members, the seats used, the AI credits used and the MCP calls used in the current period with the limits of the plan (`-1` for unlimited), and the AI credits used on each of the last 7 UTC days, oldest first, with `0` for the days without usage.

#### Scenario: Real counts and limits
- **WHEN** a member of an organization with 3 members, 1 pending invitation and 120 AI credits used in the period asks for the dashboard
- **THEN** the response has 3 members, 4 seats used, 120 AI credits used, and the limits of the plan of the organization

#### Scenario: Usage of the last 7 days
- **WHEN** the organization used AI credits today and on no other day of the week
- **THEN** the usage has 7 entries, the last one is today with the credits used, and the others are `0`

#### Scenario: Every role reads it
- **WHEN** a member with the role `member` asks for the dashboard
- **THEN** the response is successful

#### Scenario: Tenant isolation
- **WHEN** a user asks for the dashboard of an organization they do not belong to
- **THEN** the request is refused and no metric of that organization is returned

### Requirement: Dashboard activity
The dashboard response SHALL include the 10 newest activity entries of the organization, newest first, derived from the members that joined, the invitations sent and the API keys created, each with its type, its actor's name and initials (or no actor when the user no longer exists) and its date, and SHALL NOT include emails, invitation addresses or API key names.

#### Scenario: Activity newest first
- **WHEN** an owner creates the organization, then sends an invitation, then creates an API key
- **THEN** the activity lists `api_key_created`, `invitation_sent` and `member_joined` in that order, each with the owner as actor

#### Scenario: No private details
- **WHEN** a member reads the activity of an invitation and an API key
- **THEN** the response carries neither the invited address nor the key name or prefix

#### Scenario: Activity is bounded
- **WHEN** the organization has more than 10 activity entries
- **THEN** the response holds the 10 newest
