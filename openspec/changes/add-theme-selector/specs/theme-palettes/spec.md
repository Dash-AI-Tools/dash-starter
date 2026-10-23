# Spec Delta

## MODIFIED Requirements

### Requirement: Configured default palette

The product SHALL have exactly one configured default palette, declared in a single documented place in the web app, applied on first paint to every visitor and every signed-in user who has not saved a palette; a saved palette SHALL override it for that user only.

#### Scenario: Default applies

- **WHEN** the configured default palette is `ocean` and the visitor has no saved palette
- **THEN** the public site and the dashboard render with the Ocean palette for that visitor

#### Scenario: Saved palette wins

- **WHEN** a signed-in user saved Plum and the configured default is Ocean
- **THEN** every page shows Plum after the session loads, while a visitor without a saved palette still sees Ocean

#### Scenario: Unknown default

- **WHEN** the configured default is not one of the six palette ids
- **THEN** typechecking fails, so an invalid default cannot ship

### Requirement: Demo palette picker

When demo mode is on, a palette picker SHALL be available on the public site header to visitors without an account, listing every palette by its localized name with a colour preview; picking one SHALL apply it immediately without reload and remember it in that browser only. A signed-in user SHALL use the palette selector of the dashboard instead.

#### Scenario: Visitor tries a palette

- **WHEN** demo mode is on and a visitor without an account picks Plum on the landing page
- **THEN** the page re-colours to Plum at once and remembers it in that browser, and after the visitor signs in the palette of their account applies

#### Scenario: Remembered per browser

- **WHEN** the visitor reloads the page or returns later on the same browser
- **THEN** Plum is still applied, while another browser sees the configured default

#### Scenario: Demo mode off

- **WHEN** demo mode is off
- **THEN** no demo palette picker renders, and a palette stored earlier in the browser is ignored in favour of the saved palette of the signed-in user or the configured default

## ADDED Requirements

### Requirement: User palette preference

Every signed-in user SHALL be able to pick any of the six palettes from the dashboard top bar, outside demo mode; the pick SHALL apply immediately without reload, persist in the account across devices and override the configured default for that user only. The API SHALL reject a palette that is not one of the six ids.

#### Scenario: The pick applies at once

- **WHEN** a signed-in user picks Plum in the selector
- **THEN** every surface re-colours to Plum without a reload and the selector shows Plum as the current palette

#### Scenario: The pick follows the user

- **WHEN** a user picks Plum on one device and opens the dashboard on another
- **THEN** the dashboard shows Plum on the second device

#### Scenario: The pick does not leak

- **WHEN** a user picks Plum while another member of the same organization and a visitor keep the configured default
- **THEN** only the user who picked Plum sees Plum

#### Scenario: Keyboard and locale

- **WHEN** a keyboard user opens the selector with the locale set to Spanish
- **THEN** the palette names are in Spanish, the arrow keys move between them, Enter applies one, and the current palette is announced as checked

#### Scenario: Unknown palette

- **WHEN** the API receives a palette that is not one of the six ids
- **THEN** the update is refused with a localized validation error and the saved palette does not change
