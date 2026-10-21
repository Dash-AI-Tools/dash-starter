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
 * The payload of the update of the profile. Every field is optional, so the
 * form can send only what changed.
 */
export const updateProfileValidator = vine.create({
  fullName: vine.string().trim().minLength(1).maxLength(120).optional(),
  locale: vine.enum(LOCALES).optional(),
  theme: vine.enum(THEMES).optional(),
})

/**
 * The payload of the change of the email address. The current password is
 * required, so a stolen session cannot move the account to another address.
 *
 * The pending address of the same user is left out of the uniqueness check,
 * so asking twice for the same address works.
 */
export function changeEmailValidator(userId: number) {
  return vine.create({
    email: vine
      .string()
      .trim()
      .email()
      .maxLength(254)
      .unique({ table: 'users', column: 'email' })
      .unique({
        table: 'users',
        column: 'pending_email',
        filter: (query) => {
          void query.whereNot('id', userId)
        },
      }),
    currentPassword: vine.string(),
  })
}

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
