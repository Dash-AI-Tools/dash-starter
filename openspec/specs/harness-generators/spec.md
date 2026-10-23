# harness-generators Specification

## Purpose
Lets the harness scaffold code through the generators of the stack, in the house style, and hand the agents only the output they need to read: the created paths, the failing checks, paired catalog keys and the context of a layer.

## Requirements

### Requirement: Generators of the stack

The harness SHALL scaffold every layer that has a generator in the stack through that generator, run in the workspace that owns the layer, and SHALL report only the paths it created. A layer without a generator SHALL be reported as such, so the agent writes it by imitation.

#### Scenario: An API controller is generated

- **WHEN** an agent asks the harness for a controller named `invoices` in the API
- **THEN** the API's own generator creates it under `apps/api/app/controllers/`, and the output lists that one path and nothing else

#### Scenario: A layer without a generator

- **WHEN** an agent asks for a layer the stack cannot generate, such as an ability
- **THEN** the harness exits non-zero, creates no file, and names the file to imitate instead

#### Scenario: An existing file is never overwritten

- **WHEN** the file a generator would create already exists
- **THEN** the harness exits non-zero and the existing file is unchanged

### Requirement: House-style generated code

The files the API generators create SHALL follow the conventions of the repository (import aliases, comment style, the patterns of its controllers, services, transformers, migrations and tests), so a generated file passes format, lint and typecheck without edits.

#### Scenario: Every generated API file passes the checks

- **WHEN** one file of each generated API layer is created in a clean checkout
- **THEN** format, lint and typecheck pass with no edit to the generated files

### Requirement: Trimmed check output

The harness SHALL run the format, lint, typecheck and test steps of the workspaces a change touched and SHALL print a one-line result per step plus, for a failing step, only its failure lines up to a bounded length.

#### Scenario: A passing run prints one line per step

- **WHEN** every check of the touched workspaces passes
- **THEN** the output is one line per step and the command exits 0

#### Scenario: A failure prints only what failed

- **WHEN** one test fails among hundreds
- **THEN** the output names the failing test and its assertion, omits the passing tests, stays within the bound, and the command exits non-zero

### Requirement: Paired catalog keys

The harness SHALL add a user-facing string to the English and the Spanish catalog of the same namespace in one call, for the web app and for the API, and SHALL refuse a key that already exists in either catalog.

#### Scenario: A key lands in both locales

- **WHEN** an agent adds the key `invoicesTitle` with its English and Spanish text to the billing namespace of the web app
- **THEN** both catalogs hold the key with their text, and the web typecheck passes

#### Scenario: A duplicate key is refused

- **WHEN** the key already exists in one of the two catalogs
- **THEN** the command exits non-zero and neither catalog changes

### Requirement: Layer context on demand

The harness SHALL print, for a named layer, the generator to run, the file to imitate and the files that register it, from the same source as the table of `docs/architecture.md`, so the two cannot disagree.

#### Scenario: The context of a layer matches the architecture guide

- **WHEN** an agent asks for the context of the API endpoint layer
- **THEN** the output names the generator, the file to imitate and the registration files that `docs/architecture.md` names for that layer
