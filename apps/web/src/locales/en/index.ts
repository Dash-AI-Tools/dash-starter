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

/**
 * The catalogs of every namespace, in the order they are merged. The flat
 * dictionary below is built from them, so a key shared by two namespaces
 * always means the same string in every page.
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
 * The English catalog. Every other locale is checked against this shape, so a
 * missing translation is a type error.
 */
export const en = {
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
}

/** Shape every locale must satisfy: one string per key. */
export type Messages = { [K in keyof typeof en]: string }

/** Every key of the catalog, usable as the argument of `t()`. */
export type TranslationKey = keyof Messages
