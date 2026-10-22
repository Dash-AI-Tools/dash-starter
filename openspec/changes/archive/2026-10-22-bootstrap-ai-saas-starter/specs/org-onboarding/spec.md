# Spec Delta

## Purpose

Guides a newly signed-up user through creating and configuring their first organization so they reach a working dashboard with sensible defaults.

## ADDED Requirements

### Requirement: Onboarding entry
A signed-in user with no organization membership and no pending invitation SHALL be redirected to onboarding when opening any dashboard route.

#### Scenario: New user
- **WHEN** a freshly signed-up user without memberships opens `/app`
- **THEN** they are redirected to the onboarding flow

#### Scenario: User with pending invitation
- **WHEN** a user without memberships has a pending invitation for their verified email
- **THEN** onboarding offers to accept the invitation or create a new organization

### Requirement: Onboarding steps
Onboarding SHALL consist of ordered steps: organization details (name, slug, default locale), use-case profile (team size, primary use case), invite teammates (skippable) and plan selection (defaulting to the free plan). Progress SHALL be saved after each step.

#### Scenario: Resume onboarding
- **WHEN** a user completes the details step, closes the browser and returns
- **THEN** onboarding resumes at the use-case step with the organization already created

#### Scenario: Skip invites
- **WHEN** the user skips the invite step
- **THEN** they continue to plan selection without sending invitations

### Requirement: Plan selection hand-off
Choosing a paid plan in onboarding SHALL start checkout for that plan and interval; choosing the free plan or cancelling checkout SHALL complete onboarding on the free plan. A plan chosen on the public pricing page SHALL be preselected.

#### Scenario: Preselected plan
- **WHEN** a visitor chose "Pro, yearly" on the pricing page before signing up
- **THEN** the plan step preselects Pro with yearly billing

#### Scenario: Checkout cancelled
- **WHEN** the user cancels the hosted checkout
- **THEN** onboarding completes on the free plan and the dashboard shows an upgrade option

### Requirement: Onboarding completion
Completing onboarding SHALL mark the organization as onboarded, land the user on its dashboard with a getting-started checklist, and SHALL not show onboarding again for that organization.

#### Scenario: Finished
- **WHEN** the user finishes the last step
- **THEN** they land on `/app/<slug>` with the getting-started checklist visible
