# Design

## The data

`users` gains one nullable column:

| Column    | Type        | What it is                                                        |
| --------- | ----------- | ----------------------------------------------------------------- |
| `palette` | string(16)  | The id of the palette the user picked, or `null` for no choice     |

It is nullable on purpose: no choice means "follow the configured default", so changing the default of the product also changes the palette of every user who never picked one. An empty string is not a valid value.

## The API

- `apps/api/app/validators/profile.ts` adds `palette` to the update validator, as an enum of the six ids. An unknown id is a normal Vine validation error (422, localized).
- `apps/api/app/transformers/user_transformer.ts` returns `palette`, so the session and the profile carry it.
- `PATCH /api/v1/profile` already exists; no route changes and no new endpoint.
- The palette ids are declared in the API next to the locales and the themes, as the existing duplication between `apps/web/src/lib/palettes.ts` and the API validators does. `docs/architecture.md` does not change.

## The web app

- `apps/web/src/providers/palette-provider.tsx` becomes the owner of the saved preference. It moves inside `AppProviders` in `apps/web/src/main.tsx`, because it reads the session with `useCurrentUser()`.
- On load the provider still starts from `DEFAULT_PALETTE` (or the demo pick of the browser), then adopts `user.palette` when the session answers. The configured default is applied on first paint in `main.tsx` as today.
- `setPalette(next)` applies the palette at once and then persists it with `client.api.profile.update({ body: { palette: next } })` when there is a session, updating the cached user. A failed request reverts the palette and shows the localized error. Without a session it keeps the demo behaviour: browser storage only, and only when demo mode is on.
- `apps/web/src/components/palette-picker.tsx` gains no second component: it renders for a signed-in user even when demo mode is off, and for a visitor only in demo mode. The existing swatches, keyboard handling and localized names are reused.
- `apps/web/src/components/app/top-bar.tsx` keeps `<PalettePicker />`; `apps/web/src/layouts/PublicLayout.tsx` keeps it for the demo visitors.
- `apps/web/src/pages/ProfilePage.tsx` does not gain a second control; the selector in the top bar is the one place to pick a palette.

## The tradeoff

The account palette arrives with the session request, after the first paint, so a cold load paints the configured default first and then the saved palette. The alternative is caching the palette in `localStorage`, which would show one user's palette to the next user of a shared browser. The product has no server rendering to inline the preference, so the brief change of palette is accepted; the default is always a valid palette and no content depends on it.

## Tests

- API functional: the profile update saves a palette, an unknown id is refused, the session returns the palette, and one user's palette never appears in another user's session.
- Web unit: the provider adopts the session palette, a pick calls the profile update and survives a reload of the provider, a failed update reverts, the demo pick stays local, and the selector renders for a signed-in user with demo mode off.
- The existing accessibility and locale tests of the picker keep covering the keyboard and the Spanish names.
- End to end: a user picks a palette, reloads, and the dashboard is still in that palette.
