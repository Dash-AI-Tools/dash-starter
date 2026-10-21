import User from '#models/user'
import { EMAIL_CHANGE_PURPOSE } from '#services/auth_tokens'
import env from '#start/env'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Builds the link back to the web app, where the visitor sees the outcome
 * of the confirmation.
 */
function webRedirect(status: string): string {
  return `${env.get('WEB_URL')}/verify-email?status=${status}`
}

export default class EmailChangeController {
  /**
   * Moves the account to the new address. The link is signed and expires, so
   * a forged or an old link is rejected, and the new address only becomes
   * the active one when the link is opened.
   */
  async verify({ request, response }: HttpContext) {
    if (!request.hasValidSignature(EMAIL_CHANGE_PURPOSE)) {
      const expires = Number(request.input('expires'))
      const expired = Number.isFinite(expires) && expires < Date.now()

      return response.redirect(webRedirect(expired ? 'expired' : 'invalid'))
    }

    const user = await User.find(Number(request.input('user')))
    const email = String(request.input('email') ?? '')

    if (!user || !email || user.pendingEmail?.toLowerCase() !== email.toLowerCase()) {
      return response.redirect(webRedirect('invalid'))
    }

    user.email = email
    user.pendingEmail = null
    await user.save()

    return response.redirect(webRedirect('email-changed'))
  }
}
