import { I18n } from '@adonisjs/i18n'
import i18nManager from '@adonisjs/i18n/services/main'
import type { NextFn } from '@adonisjs/core/types/http'
import { type HttpContext, RequestValidator } from '@adonisjs/core/http'

/**
 * Cookie holding the visitor's explicit language choice. It is written by the
 * browser as a plain value, so it is read without a signature or an encoding.
 */
export const LOCALE_COOKIE = 'locale'

/**
 * The signed-in user's stored preference. The column is added to the users
 * table with the rest of the profile fields, so it is read defensively.
 */
type LocaleAwareUser = { locale?: string | null }

/**
 * Resolves the locale of a request in this order: the signed-in user's
 * preference, the explicit choice stored in the cookie, the browser
 * `Accept-Language` header and finally the product default.
 */
export default class DetectUserLocaleMiddleware {
  static {
    /**
     * Validation messages are read from the translation catalogs, using the
     * locale resolved for the current request.
     */
    RequestValidator.messagesProvider = (ctx) => {
      return ctx.i18n.createMessagesProvider()
    }
  }

  protected getRequestLocale(ctx: HttpContext) {
    /**
     * The signed-in user's preference always wins, so a user who chose
     * English keeps it even from a Spanish browser.
     */
    const user = ctx.auth.user as LocaleAwareUser | undefined
    if (user?.locale) {
      return user.locale
    }

    const cookieLocale = ctx.request.plainCookie(LOCALE_COOKIE, { encoded: false })
    if (cookieLocale && i18nManager.supportedLocales().includes(cookieLocale)) {
      return cookieLocale
    }

    const accepted = i18nManager.getSupportedLocaleFor(ctx.request.languages())
    return accepted || i18nManager.defaultLocale
  }

  async handle(ctx: HttpContext, next: NextFn) {
    const locale = this.getRequestLocale(ctx)

    ctx.i18n = i18nManager.locale(locale)
    ctx.containerResolver.bindValue(I18n, ctx.i18n)

    return next()
  }
}

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    i18n: I18n
  }
}
