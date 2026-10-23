# Proposal

## Why

The palette of the product is decided once, by the developer, and a signed-in user cannot change it. The only selector is the demo picker, which is local to one browser and disappears when demo mode is off. Yet the palettes are already a user-facing preference: people work in light or dark, and a colour set that suits one team does not suit another.

## What Changes

- A palette preference per user, saved in the account and applied on every device, with the configured default when the user never picked one.
- A theme selector in the dashboard top bar for every signed-in user, outside demo mode, with the six palettes, their localized names and a colour preview.
- The demo palette picker stays for visitors without an account; a signed-in user gets the persistent selector instead.
- `PATCH /api/v1/profile` accepts the palette, and the session returns it.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `theme-palettes`: the configured default only applies when the user has no saved palette; the demo picker is for visitors without an account; a signed-in user picks a palette that persists in the account.
- `user-profile`: the preferences include the palette, saved with the locale and the theme.

## Impact

- Affected code: `apps/api/database/migrations/` (a nullable `palette` on `users`), `apps/api/database/schema.ts`, `apps/api/app/validators/profile.ts`, `apps/api/app/transformers/user_transformer.ts`, `apps/api/start/routes.ts` (no route change), `apps/web/src/lib/palettes.ts`, `apps/web/src/providers/palette-provider.tsx`, `apps/web/src/components/palette-picker.tsx`, `apps/web/src/components/app/top-bar.tsx`, `apps/web/src/layouts/PublicLayout.tsx`, `apps/web/src/pages/ProfilePage.tsx`, `apps/web/src/locales/{en,es}/`, `README.md`
- No new dependency. `docs/architecture.md` does not change: the palette ids are already a web constant and the API validates its own copy, as it does for locales and themes.
