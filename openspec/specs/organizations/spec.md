# organizations Specification

## Purpose

Makes the organization the tenant boundary of the product: users belong to organizations through memberships with roles, collaborate through invitations, and never see another organization's data.

## Requirements

### Requirement: Create organization
A signed-in user SHALL be able to create an organization with a name and a unique URL slug, becoming its owner; a user MAY belong to multiple organizations.

#### Scenario: Create with slug
- **WHEN** a user creates an organization named "Acme Labs"
- **THEN** an organization with a suggested slug `acme-labs` exists and the user is its owner

#### Scenario: Slug taken
- **WHEN** the requested slug is already used
- **THEN** creation is rejected with a localized error suggesting an alternative

### Requirement: Roles and permissions
Each membership SHALL have exactly one role: `owner`, `admin` or `member`. Owners manage everything including deletion and ownership transfer; admins manage settings, members, billing and API keys; members use product features only.

#### Scenario: Member opens billing settings
- **WHEN** a member requests the organization billing endpoints
- **THEN** the API responds 403 and the dashboard hides billing navigation

#### Scenario: Last owner demotion
- **WHEN** an action would leave an organization with no owner
- **THEN** it is rejected

### Requirement: Tenant isolation
Every organization-scoped API request SHALL be authorized against the caller's membership in the organization named by the request, and data from other organizations SHALL never be returned or modified.

#### Scenario: Cross-tenant access
- **WHEN** a user requests a resource of an organization they do not belong to, even with a valid resource id
- **THEN** the API responds 404 without revealing whether the resource exists

### Requirement: Invite members
Owners and admins SHALL be able to invite people by email with a role; invitations SHALL be emailed in the inviter's organization default locale, expire after 7 days, be revocable, and be accepted only by a signed-in user whose verified email matches.

#### Scenario: Invite new person
- **WHEN** an admin invites `ana@example.com` as member
- **THEN** a pending invitation is listed and an invitation email with an accept link is sent

#### Scenario: Accept as new user
- **WHEN** the invitee opens the link without an account
- **THEN** they are guided to sign up with the email prefilled and, after verifying, join the organization with the invited role

#### Scenario: Email mismatch
- **WHEN** a signed-in user with a different email opens the invitation link
- **THEN** acceptance is refused with an explanation

#### Scenario: Seat limit
- **WHEN** inviting would exceed the plan's seat limit counting members and pending invitations
- **THEN** the invitation is refused with an upgrade prompt

### Requirement: Manage members
Owners and admins SHALL be able to list members, change roles (admins cannot grant or revoke `owner`), and remove members; any member SHALL be able to leave unless they are the last owner.

#### Scenario: Remove member
- **WHEN** an admin removes a member
- **THEN** that user immediately loses access to the organization's data

### Requirement: Switch organization
A user with several memberships SHALL be able to switch the active organization, and the last active organization SHALL be remembered.

#### Scenario: Switch
- **WHEN** a user picks another organization in the switcher
- **THEN** the dashboard loads that organization's URL and data

### Requirement: Organization settings
Owners and admins SHALL be able to update the organization name, slug, logo and default locale; owners SHALL be able to transfer ownership and delete the organization after typing its name to confirm, which cancels any active subscription.

#### Scenario: Slug change
- **WHEN** an admin changes the slug
- **THEN** dashboard URLs use the new slug and the old slug no longer resolves

#### Scenario: Delete organization with subscription
- **WHEN** an owner deletes an organization with an active subscription
- **THEN** the subscription is canceled with the payment provider before the organization and its data are removed
