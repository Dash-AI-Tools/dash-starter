import { common } from './common'
import { auth } from './auth'
import { publicSite } from './public'
import { legal } from './legal'
import { dashboard } from './dashboard'
import { organizations } from './organizations'
import { onboarding } from './onboarding'
import { billing } from './billing'
import { chat } from './chat'
import { apiKeys } from './apiKeys'
import { profile } from './profile'
import { consent } from './consent'
import { showcase } from './showcase' // showcase:line
import type { Messages } from '../en'

/**
 * The Spanish catalogs, in the same order as the English ones.
 */
export const catalogs = {
  common,
  auth,
  publicSite,
  legal,
  dashboard,
  organizations,
  onboarding,
  billing,
  chat,
  apiKeys,
  profile,
  consent,
  showcase, // showcase:line
}

/**
 * The Spanish catalog. `satisfies Messages` makes a missing or extra key a
 * type error, so the build fails when a translation goes missing.
 */
export const es = {
  ...common,
  ...auth,
  ...publicSite,
  ...legal,
  ...dashboard,
  ...organizations,
  ...onboarding,
  ...billing,
  ...chat,
  ...apiKeys,
  ...profile,
  ...consent,
  ...showcase, // showcase:line
} satisfies Messages
