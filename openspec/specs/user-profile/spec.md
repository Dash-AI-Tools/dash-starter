# user-profile Specification

## Purpose

Gives each signed-in user a place in the dashboard to manage their own identity, preferences, credentials and account lifecycle.

## Requirements

### Requirement: Edit profile
A signed-in user SHALL be able to view and update their full name and avatar image from the profile page.

#### Scenario: Update name
- **WHEN** a user changes their name and saves
- **THEN** the new name is persisted and shown in the dashboard user menu

#### Scenario: Avatar upload limits
- **WHEN** a user uploads an avatar that is not PNG, JPEG or WebP, or exceeds 2 MB
- **THEN** the upload is rejected with a localized error

### Requirement: Change email
A user SHALL be able to change their email only after confirming their current password, and the new email SHALL become active only after it is verified through a link sent to it.

#### Scenario: Pending email change
- **WHEN** a user requests an email change with the correct password
- **THEN** a verification link is sent to the new address and the old address remains active until the link is used

### Requirement: Change password
A user SHALL be able to change their password by providing the current one, and other sessions SHALL be invalidated.

#### Scenario: Wrong current password
- **WHEN** a user submits an incorrect current password
- **THEN** the change is rejected with a localized error

### Requirement: Preferences
A user SHALL be able to set their preferred locale and theme (light, dark, system), and the choice SHALL apply immediately and persist across devices.

#### Scenario: Switch to Spanish
- **WHEN** a user selects Spanish in preferences
- **THEN** the dashboard re-renders in Spanish and later emails to that user are in Spanish

### Requirement: Delete account
A user SHALL be able to delete their account after confirming their password; deletion SHALL be refused while they are the sole owner of any organization that has other members or an active paid subscription.

#### Scenario: Sole owner with members
- **WHEN** a user who is the only owner of an organization with other members requests deletion
- **THEN** deletion is refused with a message to transfer ownership or delete the organization first

#### Scenario: Successful deletion
- **WHEN** a user with no blocking ownership confirms deletion
- **THEN** their account, memberships, sessions and personal AI conversations are removed and they are signed out
