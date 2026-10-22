# Spec Delta

## Purpose

Defines how the whole product (database, API, web app and local email) boots with Docker Compose for development and production, including configuration validation and seed data.

## ADDED Requirements

### Requirement: One-command local stack
The project SHALL start Postgres, the API, the web app and a local SMTP catcher with one documented command, with source hot reload for API and web.

#### Scenario: Developer boots the stack
- **WHEN** a developer runs the documented dev command on a fresh clone with `.env` files present
- **THEN** the web app, API health endpoint and Mailpit inbox are reachable at their documented localhost URLs

#### Scenario: Code change reloads
- **WHEN** a developer edits an API controller or a React component while the stack runs
- **THEN** the change is served without restarting containers

### Requirement: Production compose stack
The project SHALL provide a production Compose configuration that builds optimized images, serves the web app and proxies `/api` and `/mcp` to the API on the same origin, and runs migrations before the API accepts traffic.

#### Scenario: Same-origin serving
- **WHEN** the production stack runs
- **THEN** the web app, `/api/*` and `/mcp` are all served from one origin so session cookies are first-party

#### Scenario: Pending migrations
- **WHEN** the API container starts with unapplied migrations
- **THEN** migrations run to completion before the server starts listening

### Requirement: Validated configuration
The API SHALL validate all environment variables at boot and SHALL refuse to start with a clear message when a required variable is missing or malformed; optional provider keys SHALL fall back to local alternatives only outside production.

#### Scenario: Missing APP_KEY
- **WHEN** the API starts without `APP_KEY`
- **THEN** it exits with an error naming the missing variable

#### Scenario: Production without email provider
- **WHEN** `NODE_ENV=production` and no Brevo key is configured
- **THEN** the API refuses to start rather than silently dropping emails

### Requirement: Health endpoint
The API SHALL expose an unauthenticated health endpoint reporting process and database readiness, used by Compose health checks.

#### Scenario: Database down
- **WHEN** the database is unreachable
- **THEN** the health endpoint responds with a non-2xx status

### Requirement: Seed data
The project SHALL provide idempotent seeders that create the default billing plans and, in development only, a demo user and organization.

#### Scenario: Seeds rerun
- **WHEN** seeders run twice
- **THEN** no duplicate plans, users or organizations exist

#### Scenario: Demo data in production
- **WHEN** seeders run with `NODE_ENV=production`
- **THEN** only billing plans are seeded and no demo account is created
