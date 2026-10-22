import { createRequire } from 'node:module'
import adonisConfig from '@adonisjs/prettier-config'

const require = createRequire(import.meta.url)

/**
 * One Prettier configuration for the whole monorepo: the API, the web app, the
 * installer and the end to end suites are formatted with the same rules. The
 * settings come from the AdonisJS preset and the `prettier-edge` plugin formats
 * the Edge templates of the mails.
 */
export default {
  ...adonisConfig,
  plugins: [require.resolve('prettier-edge')],
}
