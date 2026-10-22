import { TERMS_VERSION } from '#legal'
import Membership from '#models/membership'
import Organization from '#models/organization'
import User from '#models/user'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'

/**
 * The address of the demo account.
 */
export const DEMO_EMAIL = 'demo@example.test'

/**
 * The password of the demo account.
 */
export const DEMO_PASSWORD = 'supersecret'

/**
 * The name of the organization of the demo account.
 */
export const DEMO_ORGANIZATION = 'Demo Organization'

/**
 * The slug of the organization of the demo account.
 */
export const DEMO_SLUG = 'demo-organization'

/**
 * Creates the demo account and its organization, so a developer can sign in
 * without going through the signup.
 *
 * The demo data never leaves the development environment: the guard below
 * refuses every other one, and the seeder that calls it is only enabled in
 * development.
 */
export async function seedDemo(environment: string = app.nodeEnvironment): Promise<void> {
  if (environment !== 'development') {
    return
  }

  const user = await findOrCreateUser()
  const organization = await findOrCreateOrganization()

  const membership = await Membership.query()
    .where('organizationId', organization.id)
    .where('userId', user.id)
    .first()

  if (!membership) {
    await Membership.create({
      organizationId: organization.id,
      userId: user.id,
      role: 'owner',
    })
  }

  /**
   * The demo account lands in the demo organization, without the setup of the
   * workspace in the way.
   */
  if (user.lastOrganizationId !== organization.id) {
    user.lastOrganizationId = organization.id
    await user.save()
  }
}

/**
 * The demo account, created the first time it is asked for.
 */
async function findOrCreateUser(): Promise<User> {
  const existing = await User.query().where('email', DEMO_EMAIL).first()

  if (existing) {
    return existing
  }

  return User.create({
    fullName: 'Demo User',
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    emailVerifiedAt: DateTime.now(),
    locale: 'en',
    termsVersion: TERMS_VERSION,
    termsAcceptedAt: DateTime.now(),
  })
}

/**
 * The demo organization, created the first time it is asked for.
 */
async function findOrCreateOrganization(): Promise<Organization> {
  const existing = await Organization.query().where('slug', DEMO_SLUG).first()

  if (existing) {
    return existing
  }

  return Organization.create({
    name: DEMO_ORGANIZATION,
    slug: DEMO_SLUG,
    defaultLocale: 'en',
    onboardedAt: DateTime.now(),
  })
}
