# Spec Delta

## Purpose

Lets people create an account, prove ownership of their email, sign in and out, and recover access, with sessions that are safe for a browser SPA.

## ADDED Requirements

### Requirement: Sign up
The system SHALL let a visitor create an account with full name, email, password (minimum 8 characters) and acceptance of the current terms, and SHALL sign them in after creation.

#### Scenario: Successful sign up
- **WHEN** a visitor submits valid sign-up data
- **THEN** an account is created, a verification email is sent in the visitor's locale, and the visitor is signed in and redirected to onboarding

#### Scenario: Email already registered
- **WHEN** a visitor signs up with an email that already has an account
- **THEN** the form shows a localized error on the email field and no account is created

#### Scenario: Terms not accepted
- **WHEN** a visitor submits the form without accepting terms
- **THEN** the request is rejected with a localized validation error

### Requirement: Email verification
The system SHALL send a signed, expiring verification link and SHALL mark the email verified when the link is opened; unverified users SHALL be able to resend the link and SHALL be blocked from paid checkout and inviting members until verified.

#### Scenario: Verify email
- **WHEN** a user opens a valid verification link
- **THEN** their email is marked verified and they see a confirmation

#### Scenario: Expired link
- **WHEN** a user opens a verification link older than 24 hours
- **THEN** they see a localized message with an option to resend

#### Scenario: Unverified user attempts checkout
- **WHEN** an unverified user starts a paid checkout
- **THEN** the request is rejected and the user is prompted to verify their email

### Requirement: Login and logout
The system SHALL authenticate with email and password into an HTTP-only, secure, same-site session cookie, protect state-changing requests against CSRF, and SHALL end the session on logout.

#### Scenario: Valid credentials
- **WHEN** a user submits correct email and password
- **THEN** a session cookie is set and the user lands on their last active organization's dashboard

#### Scenario: Invalid credentials
- **WHEN** a user submits a wrong password or unknown email
- **THEN** the same generic localized error is shown for both cases

#### Scenario: Logout
- **WHEN** a signed-in user logs out
- **THEN** the session is invalidated server-side and protected pages redirect to login

#### Scenario: Return to intended page
- **WHEN** an anonymous user opens a protected URL and then logs in
- **THEN** they are redirected to the originally requested URL if it is same-origin

### Requirement: Password reset
The system SHALL let a user request a reset link by email and set a new password through a single-use link that expires after 60 minutes; completing a reset SHALL invalidate the user's other sessions.

#### Scenario: Request reset
- **WHEN** someone requests a reset for any email
- **THEN** the response is identical whether or not the email exists, and an email is sent only if it does

#### Scenario: Reuse reset link
- **WHEN** a reset link that was already used is opened
- **THEN** it is rejected as invalid

### Requirement: Auth rate limiting
Login, sign up, password reset and verification resend endpoints SHALL be rate limited per IP and per email, returning HTTP 429 with a retry-after value when exceeded.

#### Scenario: Brute force login
- **WHEN** more than 5 failed login attempts for one email occur within 15 minutes
- **THEN** further attempts for that email receive 429 until the window passes

### Requirement: Password storage
Passwords SHALL be stored only as salted hashes using a memory-hard algorithm and SHALL never be returned by any API.

#### Scenario: Profile response
- **WHEN** any user endpoint returns a user
- **THEN** the payload contains no password or password hash field
