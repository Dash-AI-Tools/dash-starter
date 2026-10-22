import { readFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import EmailChange from '#mails/email_change'
import User from '#models/user'
import { emailChangeLink } from '#services/auth_tokens'
import {
  AVATAR_MAX_BYTES,
  AVATAR_MIME_TYPES,
  avatarKey,
  avatarRejectedError,
  canDeleteAccount,
} from '#services/profile'
import { destroyUserSessions, invalidateUserSessions } from '#services/sessions'
import { TERMS_VERSION } from '#legal'
import UserTransformer from '#transformers/user_transformer'
import {
  changeEmailValidator,
  changePasswordValidator,
  deleteAccountValidator,
  rememberOrganizationValidator,
  updateProfileValidator,
} from '#validators/profile'
import type { HttpContext } from '@adonisjs/core/http'
import { errors as VineErrors } from '@vinejs/vine'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'

export default class ProfileController {
  /**
   * The profile of the signed-in user.
   */
  async show({ auth, serialize }: HttpContext) {
    return serialize(UserTransformer.transform(auth.getUserOrFail()))
  }

  /**
   * Updates the name and the preferences of the user. The locale and the
   * theme are applied right away: the next request of the browser is already
   * answered in the new language.
   */
  async update(ctx: HttpContext) {
    const { request, auth, serialize } = ctx

    const payload = await request.validateUsing(updateProfileValidator)
    const user = auth.getUserOrFail()

    user.merge(payload)
    await user.save()

    return serialize.withoutWrapping({
      user: UserTransformer.transform(user),
    })
  }

  /**
   * Stores the avatar of the user in the disk and points the profile to it.
   * Only PNG, JPEG and WebP images of up to 2 MB are accepted.
   */
  async avatar(ctx: HttpContext) {
    const { request, auth, serialize, i18n } = ctx

    const user = auth.getUserOrFail()
    const file = request.file('avatar')

    if (!file || !file.tmpPath) {
      throw avatarRejectedError(i18n.t('profile.avatar_missing'), 'avatar_missing')
    }

    const mimeType = `${file.type}/${file.subtype}`

    if (!AVATAR_MIME_TYPES.includes(mimeType as (typeof AVATAR_MIME_TYPES)[number])) {
      throw avatarRejectedError(i18n.t('profile.avatar_invalid_type'), 'avatar_invalid_type')
    }

    if (file.size > AVATAR_MAX_BYTES) {
      throw avatarRejectedError(i18n.t('profile.avatar_too_large'), 'avatar_too_large')
    }

    const previous = user.avatarPath
    const key = avatarKey(user.id, mimeType, randomBytes(8).toString('hex'))

    const disk = await this.disk()
    await disk.put(key, await readFile(file.tmpPath))

    user.avatarPath = await disk.getUrl(key)
    await user.save()

    /**
     * The file of the previous avatar is removed, so the disk does not grow
     * with every new picture.
     */
    if (previous) {
      await this.removeAvatar(previous)
    }

    return serialize.withoutWrapping({
      user: UserTransformer.transform(user),
    })
  }

  /**
   * Asks for a change of the email address. The new address only becomes the
   * active one when the link sent to it is opened, so the current address
   * keeps working until then.
   */
  async email(ctx: HttpContext) {
    const { request, auth, i18n } = ctx

    const user = auth.getUserOrFail()
    const { email, currentPassword } = await request.validateUsing(changeEmailValidator)

    await this.assertCurrentPassword(
      user,
      currentPassword,
      i18n.t('profile.current_password_invalid')
    )

    if (email.toLowerCase() === user.email.toLowerCase()) {
      throw new VineErrors.E_VALIDATION_ERROR([
        {
          field: 'email',
          message: i18n.t('profile.email_same'),
          rule: 'email_same',
        },
      ])
    }

    await this.assertEmailIsFree(email, user, i18n.t('profile.email_pending'))

    user.pendingEmail = email
    await user.save()

    await mail.sendLater(new EmailChange(user, email, emailChangeLink(user, email), i18n.locale))

    return { sent: true }
  }

  /**
   * Changes the password. The other sessions of the user are closed, so a
   * stolen session cannot be used after the change.
   */
  async password(ctx: HttpContext) {
    const { request, auth, i18n } = ctx

    const user = auth.getUserOrFail()
    const { password, currentPassword } = await request.validateUsing(changePasswordValidator)

    await this.assertCurrentPassword(
      user,
      currentPassword,
      i18n.t('profile.current_password_invalid')
    )

    user.password = password
    await user.save()

    await invalidateUserSessions(ctx, user.id)

    return { success: true }
  }

  /**
   * Deletes the account of the user and everything that belongs to it. The
   * deletion is refused while the user is the only owner of an organization
   * that has other members.
   */
  async destroy(ctx: HttpContext) {
    const { request, auth, session, i18n } = ctx

    const user = auth.getUserOrFail()
    const { password } = await request.validateUsing(deleteAccountValidator)

    await this.assertCurrentPassword(user, password, i18n.t('profile.current_password_invalid'))

    if (!(await canDeleteAccount(user))) {
      throw new VineErrors.E_VALIDATION_ERROR([
        {
          field: 'password',
          message: i18n.t('profile.delete_blocked'),
          rule: 'delete_blocked',
        },
      ])
    }

    await destroyUserSessions(user.id)
    await auth.use('web').logout()
    session.clear()

    await user.delete()

    return { success: true }
  }

  /**
   * Accepts the current version of the terms of service. The accounts that
   * were created with an older version are asked to accept them again.
   */
  async terms({ auth, serialize }: HttpContext) {
    const user = auth.getUserOrFail()

    user.termsVersion = TERMS_VERSION
    user.termsAcceptedAt = DateTime.now()
    await user.save()

    return serialize.withoutWrapping({
      user: UserTransformer.transform(user),
    })
  }

  /**
   * Remembers the organization the user is working in, so the next visit
   * lands on it.
   */
  async rememberOrganization(ctx: HttpContext) {
    const { request, auth, serialize } = ctx

    const user = auth.getUserOrFail()
    const { organizationId } = await request.validateUsing(rememberOrganizationValidator)

    /**
     * Only an organization the user belongs to can be remembered.
     */
    const belongs = await user
      .related('memberships')
      .query()
      .where('organizationId', organizationId)
      .first()

    if (!belongs) {
      throw new VineErrors.E_VALIDATION_ERROR([
        {
          field: 'organizationId',
          message: ctx.i18n.t('profile.organization_not_found'),
          rule: 'organization_not_found',
        },
      ])
    }

    user.lastOrganizationId = organizationId
    await user.save()

    return serialize.withoutWrapping({
      user: UserTransformer.transform(user),
    })
  }

  /**
   * Checks the password of the user, so a stolen session cannot change the
   * credentials of the account.
   */
  private async assertCurrentPassword(user: User, password: string, message: string) {
    if (!(await user.verifyPassword(password))) {
      throw new VineErrors.E_VALIDATION_ERROR([
        {
          field: 'currentPassword',
          message,
          rule: 'current_password_invalid',
        },
      ])
    }
  }

  /**
   * An address that is already waiting for a confirmation in another account
   * cannot be taken, so two accounts never wait for the same address.
   */
  private async assertEmailIsFree(email: string, user: User, message: string) {
    const pending = await User.query().where('pending_email', email).whereNot('id', user.id).first()

    if (pending) {
      throw new VineErrors.E_VALIDATION_ERROR([
        {
          field: 'email',
          message,
          rule: 'email_pending',
        },
      ])
    }
  }

  /**
   * Removes the file of a previous avatar from the disk. A file that cannot
   * be removed does not stop the upload that already succeeded.
   */
  private async removeAvatar(path: string) {
    try {
      const disk = await this.disk()
      const key = path.split('/api/uploads/')[1]

      if (key) {
        await disk.delete(key)
      }
    } catch {
      /**
       * The file stays in the disk when it cannot be removed.
       */
    }
  }

  /**
   * The disk that holds the files. The module is loaded on demand, so the
   * drive is only resolved when a file is really written.
   */
  private async disk() {
    const { default: drive } = await import('@adonisjs/drive/services/main')
    return drive.use()
  }
}
