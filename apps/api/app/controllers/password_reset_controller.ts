import { E_INVALID_RESET_TOKEN } from '#exceptions/errors'
import ResetPassword from '#mails/reset_password'
import User from '#models/user'
import { consumePasswordResetToken, createPasswordResetToken } from '#services/auth_tokens'
import { consumeEmailBudget, consumeIpBudget } from '#services/rate_limits'
import { invalidateUserSessions } from '#services/sessions'
import { forgotPasswordValidator, resetPasswordValidator } from '#validators/user'
import env from '#start/env'
import type { HttpContext } from '@adonisjs/core/http'
import mail from '@adonisjs/mail/services/main'

export default class PasswordResetController {
  /**
   * Sends the reset link. The answer is the same whether the address has an
   * account or not, so the endpoint cannot be used to find out who is
   * registered.
   */
  async store(ctx: HttpContext) {
    const { request, i18n } = ctx

    await consumeIpBudget(ctx)

    const { email } = await request.validateUsing(forgotPasswordValidator)
    await consumeEmailBudget(email)

    const user = await User.findBy('email', email)

    if (user) {
      const token = await createPasswordResetToken(user)
      const link = `${env.get('WEB_URL')}/reset-password?token=${token}`

      await mail.sendLater(new ResetPassword(user, link, i18n.locale))
    }

    return { success: true }
  }

  /**
   * Sets the new password. The token is single-use, and the other sessions
   * of the user stop working.
   */
  async update(ctx: HttpContext) {
    const { request } = ctx

    await consumeIpBudget(ctx)

    const { token, password } = await request.validateUsing(resetPasswordValidator)

    const user = await consumePasswordResetToken(token)

    if (!user) {
      throw new E_INVALID_RESET_TOKEN()
    }

    user.password = password
    await user.save()

    await invalidateUserSessions(ctx, user.id)

    return { success: true }
  }
}
