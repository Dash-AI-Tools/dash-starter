import VerifyEmail from '#mails/verify_email'
import User from '#models/user'
import { EMAIL_VERIFICATION_PURPOSE, emailVerificationLink } from '#services/auth_tokens'
import { consumeEmailBudget, consumeIpBudget } from '#services/rate_limits'
import env from '#start/env'
import type { HttpContext } from '@adonisjs/core/http'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'

/**
 * Builds the link back to the web app, where the visitor sees the outcome
 * of the verification.
 */
function webRedirect(status: string): string {
  return `${env.get('WEB_URL')}/verify-email?status=${status}`
}

export default class EmailVerificationController {
  /**
   * Marks the email as verified. The link is signed and expires, so a
   * forged or an old link is rejected.
   */
  async verify({ request, response }: HttpContext) {
    if (!request.hasValidSignature(EMAIL_VERIFICATION_PURPOSE)) {
      /**
       * The expiry travels with the signature, so an expired link can be
       * told apart from a forged one.
       */
      const expires = Number(request.input('expires'))
      const expired = Number.isFinite(expires) && expires < Date.now()

      return response.redirect(webRedirect(expired ? 'expired' : 'invalid'))
    }

    const user = await User.find(Number(request.input('user')))

    if (!user) {
      return response.redirect(webRedirect('invalid'))
    }

    if (user.isEmailVerified) {
      return response.redirect(webRedirect('already'))
    }

    user.emailVerifiedAt = DateTime.now()
    await user.save()

    return response.redirect(webRedirect('success'))
  }

  /**
   * Sends the verification link again, for the users that did not open the
   * first one.
   */
  async resend(ctx: HttpContext) {
    const { auth, i18n } = ctx

    await consumeIpBudget(ctx)

    const user = auth.getUserOrFail()
    await consumeEmailBudget(user.email)

    if (user.isEmailVerified) {
      return { sent: false }
    }

    await mail.sendLater(new VerifyEmail(user, emailVerificationLink(user), i18n.locale))

    return { sent: true }
  }
}
