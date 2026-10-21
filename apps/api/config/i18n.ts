import app from '@adonisjs/core/services/app'
import env from '#start/env'
import { defineConfig, formatters, loaders } from '@adonisjs/i18n'

const i18nConfig = defineConfig({
  defaultLocale: env.get('DEFAULT_LOCALE'),
  supportedLocales: ['en', 'es'],
  formatter: formatters.icu(),

  loaders: [
    loaders.fs({
      location: app.languageFilesPath(),
    }),
  ],
})

export default i18nConfig
