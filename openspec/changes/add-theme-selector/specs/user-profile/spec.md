# Spec Delta

## MODIFIED Requirements

### Requirement: Preferences

A user SHALL be able to set their preferred locale, theme (light, dark, system) and palette (one of the six presets), and the choice SHALL apply immediately and persist across devices.

#### Scenario: Switch to Spanish

- **WHEN** a user selects Spanish in preferences
- **THEN** the dashboard re-renders in Spanish and later emails to that user are in Spanish

#### Scenario: Palette across devices

- **WHEN** a user picks the Ember palette in the dashboard on one device and signs in on another
- **THEN** the second device renders Ember, and the profile of the user returns Ember as the saved palette
