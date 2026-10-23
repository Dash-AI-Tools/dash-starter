# theme-palettes Specification

## Purpose

Lets a product built from the template take one of several ready, accessible colour palettes, chosen once at setup by a developer or agent, and lets the template's own demo show those palettes live behind a feature flag.

## Requirements

### Requirement: Preset palettes
The web app SHALL ship six palettes with stable ids `line`, `ink`, `ocean`, `forest`, `plum` and `ember`, each defining the full colour token set (ground, ink, primary, line, neutrals, borders, focus ring and the six station colours) for both light and dark mode.

#### Scenario: Palette covers both modes
- **WHEN** any palette is active in light mode and the user switches to dark mode
- **THEN** every surface uses that palette's dark tokens and no token falls back to another palette

#### Scenario: Stations stay distinct
- **WHEN** any palette is active
- **THEN** the six station colours are visibly distinct from each other, with Auth sharing the line colour as the first station

### Requirement: Palettes change tokens only
Applying a palette SHALL change only design-token values; components, layout, typography and copy SHALL stay identical across palettes.

#### Scenario: Same markup under every palette
- **WHEN** the landing page renders under two different palettes
- **THEN** the rendered markup is identical apart from the palette marker on the document root

### Requirement: Accessible palettes
Every palette SHALL meet WCAG 2.1 AA in light and dark mode: body text at least 4.5:1, large text and UI component boundaries at least 3:1, and visible focus indicators.

#### Scenario: Automated contrast check
- **WHEN** the palette test suite checks text, primary button and focus ring pairs for every palette in both modes
- **THEN** all pairs meet their AA thresholds

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

### Requirement: Setup-time palette choice
The installer SHALL let the developer or agent choose the default palette through an interactive prompt or a `--palette <id>` flag, write it as the configured default of the generated project, and reject unknown ids.

#### Scenario: Agent sets the palette non-interactively
- **WHEN** an agent runs the installer with `--palette forest --yes`
- **THEN** the generated project's configured default palette is `forest` and no prompt is shown

#### Scenario: Invalid palette flag
- **WHEN** the installer receives `--palette neon`
- **THEN** it exits non-zero listing the valid palette ids, without writing the project

#### Scenario: No choice made
- **WHEN** the developer accepts the defaults
- **THEN** the generated project uses the `line` palette

### Requirement: Demo mode flag
The web app SHALL read a `demo_mode` feature flag that defaults to off; generated projects SHALL have it off, and the template repository SHALL have it on.

#### Scenario: New installation
- **WHEN** a project is generated with the installer
- **THEN** its demo mode flag is off

#### Scenario: Flag absent
- **WHEN** the flag is not set in the environment
- **THEN** demo mode is off

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

### Requirement: Accessible, localized picker
The palette picker SHALL be keyboard operable, expose the current palette to assistive technology, and show palette names in the active locale.

#### Scenario: Keyboard selection in Spanish
- **WHEN** a keyboard user opens the picker with the locale set to Spanish
- **THEN** palette names are in Spanish, arrow keys move between palettes, Enter applies one, and the selected palette is announced as checked

### Requirement: Independent of light and dark mode
The palette SHALL be independent of the user's light/dark/system preference; changing one SHALL never change the other.

#### Scenario: Switch mode under a palette
- **WHEN** a signed-in user on the Ember palette switches from light to dark in preferences
- **THEN** the dashboard shows Ember's dark tokens and the palette stays Ember

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
