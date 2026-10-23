# Spec Delta

## Purpose

The bulk import of the members of an organization: a CSV file of addresses becomes a batch of invitations, and every row that cannot be invited is reported.

## ADDED Requirements

### Requirement: Bulk import

The system SHALL import the members of an organization from a CSV file by sending one invitation per row, so every imported person accepts before joining, and SHALL report every row it could not import with its line and the reason while importing the remaining rows.

The file SHALL be read in the request and never stored. The import SHALL belong to the organization that uploaded it, and SHALL stay in the history of the organization.

#### Scenario: The import sends the invitations

- **WHEN** an owner uploads a CSV of 20 addresses and the import finishes
- **THEN** 20 invitations are pending, no membership exists yet, and the import reports 20 rows imported in the state `done`

#### Scenario: The rows that fail are reported

- **WHEN** a row of the file has an invalid address, belongs to a member, repeats an invitation or cannot take a seat
- **THEN** the import reports that row with its line and the reason, the other rows are still invited, and the import finishes in the state `done`

#### Scenario: The seats of the plan are enforced

- **WHEN** the plan has 2 seats left and the owner uploads a file of 5 addresses
- **THEN** 2 invitations are sent and the other 3 rows are reported with the seat reason

#### Scenario: The import belongs to the organization

- **WHEN** a member asks for the state of an import of another organization
- **THEN** the request is refused and no import of that organization is returned

### Requirement: Import authorization and limits

Only a member with the role `owner` or `admin` SHALL import. The API SHALL accept only CSV files of at most 1 MB and 500 rows, SHALL limit an organization to 5 imports per hour, and SHALL refuse a request that breaks a limit with a localized error before any invitation is sent or any import is recorded.

#### Scenario: A member cannot import

- **WHEN** a member with the role `member` uploads a file
- **THEN** the request is refused, no invitation is sent and no import is recorded

#### Scenario: The file is refused

- **WHEN** the file is not a CSV, exceeds 1 MB or holds more than 500 rows
- **THEN** the request is refused with a localized error and no import is recorded

#### Scenario: The imports are rate limited

- **WHEN** an organization uploads a sixth file within an hour
- **THEN** the request is refused with a localized error and no import is recorded
