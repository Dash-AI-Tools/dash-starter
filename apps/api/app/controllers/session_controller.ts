import VerifyEmail from '#mails/verify_email'
import User from '#models/user'
import { emailVerificationLink } from '#services/auth_tokens'
import { consumeEmailBudget, consumeIpBudget, penalizeFailedLogin } from '#services/rate_limits'
import { tagSession } from '#services/sessions'
import { TERMS_VERSION } from '#terms'
import UserTransformer from '#transformers/user_transformer'
import { loginValidator, signupValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import { isValidRedirectUrl } from '@adonisjs/http-server/helpers'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'

/**
 * Where a signed-in user lands when no other destination is known.
 */
const DEFAULT_REDIRECT = '/app'

/**
 * Resolves the destination after a successful sign in. Only same-origin
 * destinations are accepted, so the endpoint cannot be turned into an open
 * redirect.
 */
function safeRedirect(ctx: HttpContext, redirectTo?: string | null): string {
  if (redirectTo && isValidRedirectUrl(redirectTo, ctx.request.host() ?? undefined)) {
    return redirectTo
  }

  return DEFAULT_REDIRECT
}

export default class SessionController {
  /**
   * Tells the browser who is signed in.
   *
   * The endpoint always answers, so the web app can read the session (and
   * with it the CSRF token) before the visitor signs in.
   */
  async show({ auth, serialize }: HttpContext) {
    const user = auth.user

    return serialize.withoutWrapping({
      user: user ? UserTransformer.transform(user) : null,
    })
  }

  /**
   * Creates the account, sends the verification email and signs the visitor
   * in.
   */
  async store(ctx: HttpContext) {
    const { request, response, auth, i18n, serialize } = ctx

    await consumeIpBudget(ctx)

    const { fullName, email, password } = await request.validateUsing(signupValidator)
    await consumeEmailBudget(email)

    const user = await User.create({
      fullName,
      email,
      password,
      locale: i18n.locale,
      termsVersion: TERMS_VERSION,
      termsAcceptedAt: DateTime.now(),
    })

    /**
     * The email is queued, so the visitor is not kept waiting for the
     * delivery.
     */
    await mail.sendLater(new VerifyEmail(user, emailVerificationLink(user), i18n.locale))

    await auth.use('web').login(user)
    await tagSession(ctx, user.id)

    response.status(201)

    return serialize.withoutWrapping({
      user: UserTransformer.transform(user),
      redirectTo: '/onboarding',
    })
  }

  /**
   * Signs a user in. The same error is returned for an unknown address and
   * for a wrong password, so the endpoint cannot be used to find out which
   * addresses have an account.
   */
  async login(ctx: HttpContext) {
    const { request, auth, serialize } = ctx

    await consumeIpBudget(ctx)

    const { email, password, redirectTo } = await request.validateUsing(loginValidator)

    const user = await penalizeFailedLogin(email, () => User.verifyCredentials(email, password))

    await auth.use('web').login(user)
    await tagSession(ctx, user.id)

    return serialize.withoutWrapping({
      user: UserTransformer.transform(user),
      redirectTo: safeRedirect(ctx, redirectTo),
    })
  }

  /**
   * Ends the session. The stored session is dropped, so the cookie that
   * travels with it is worthless.
   */
  async destroy({ auth, session }: HttpContext) {
    await auth.use('web').logout()
    session.clear()

    return { success: true }
  }
}
