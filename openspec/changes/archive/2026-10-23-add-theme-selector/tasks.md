# Tasks

## 1. The data

- [x] 1.1 [backend] Add the migration that adds the nullable `palette` (string 16) to `users`, and regenerate `apps/api/database/schema.ts`
- [x] 1.2 [backend] Add the model test in `apps/api/tests/`: a new user has no palette, and the column round-trips a valid id

## 2. The API

- [x] 2.1 [backend] Add `palette` to the update validator in `apps/api/app/validators/profile.ts` as an enum of the six ids, and to `apps/api/app/transformers/user_transformer.ts`
- [x] 2.2 [backend] Add the functional tests in `apps/api/tests/functional/`: the update saves a palette, an unknown id is refused and leaves the saved one untouched, the session returns the palette, and another user never receives it

## 3. The web app

- [x] 3.1 [frontend] Move `PaletteProvider` inside `AppProviders` in `apps/web/src/main.tsx`, adopt `user.palette` when the session answers, and make `setPalette` persist it with `client.api.profile.update` while keeping the demo pick local in `apps/web/src/providers/palette-provider.tsx`
- [x] 3.2 [frontend] Render `PalettePicker` for a signed-in user outside demo mode, and only for a demo visitor otherwise, in `apps/web/src/components/palette-picker.tsx`, with the existing names, swatches and keyboard behaviour
- [x] 3.3 [frontend] Update the provider and picker tests in `apps/web/src/providers/palette-provider.test.tsx` and `apps/web/src/components/palette-picker.test.tsx`: the session palette is adopted, a pick persists and survives a remount, a failed update reverts, a demo pick stays in the browser, the selector renders for a signed-in user with demo mode off, and it stays keyboard operable and localized
- [x] 3.4 [frontend] Update the user fixtures of the web tests for the new `palette` field of the session payload

## 4. The journeys

- [x] 4.1 [e2e] Add the journey in `e2e/specs/`: a signed-in user picks a palette, reloads, and the dashboard keeps that palette

## 5. The documentation

- [x] 5.1 [docs] Update the color palettes section of `README.md`: the configured default, the demo picker of the visitors and the palette saved by a signed-in user
