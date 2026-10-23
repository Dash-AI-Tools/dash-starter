import vine from '@vinejs/vine'

/**
 * The locales a user can pick for the interface and for the emails.
 */
const LOCALES = ['en', 'es'] as const

/**
 * The themes a user can pick.
 */
const THEMES = ['light', 'dark', 'system'] as const

/**
 * The colour palettes a user can save. They match the palettes of the web
 * app in `apps/web/src/lib/palettes.ts`.
 */
const PALETTES = ['line', 'ink', 'ocean', 'forest', 'plum', 'ember'] as const

/**
 * The payload of the update of the profile. Every field is optional, so the
 * form can send only what changed.
 */
export const updateProfileValidator = vine.create({
  fullName: vine.string().trim().minLength(1).maxLength(120).optional(),
  locale: vine.enum(LOCALES).optional(),
  theme: vine.enum(THEMES).optional(),
  palette: vine.enum(PALETTES).optional(),
})

/**
 * The payload of the change of the email address. The current password is
 * required, so a stolen session cannot move the account to another address.
 *
 * The validator is a plain one, so the registry can describe the body of the
 * request. The address that is already waiting for a confirmation in another
 * account is checked by the controller, which knows who is asking.
 */
export const changeEmailValidator = vine.create({
  email: vine.string().trim().email().maxLength(254).unique({ table: 'users', column: 'email' }),
  currentPassword: vine.string(),
})

/**
 * The payload of the change of the password.
 */
export const changePasswordValidator = vine.create({
  password: vine.string().minLength(8).maxLength(72).confirmed({ as: 'passwordConfirmation' }),
  passwordConfirmation: vine.string().minLength(8).maxLength(72),
  currentPassword: vine.string(),
})

/**
 * The payload of the deletion of the account: the password confirms it.
 */
export const deleteAccountValidator = vine.create({
  password: vine.string(),
})

/**
 * The payload that remembers the organization the user is working in.
 */
export const rememberOrganizationValidator = vine.create({
  organizationId: vine.number().positive(),
})
