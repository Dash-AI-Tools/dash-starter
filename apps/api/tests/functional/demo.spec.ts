import { test } from '@japa/runner'
import Membership from '#models/membership'
import Organization from '#models/organization'
import User from '#models/user'
import { DEMO_EMAIL, DEMO_SLUG, seedDemo } from '#services/demo'
import db from '@adonisjs/lucid/services/db'

/**
 * How many rows a table holds.
 */
async function countOf(table: string, column: string, value: string): Promise<number> {
  const row = await db.query().from(table).where(column, value).count('* as total').firstOrFail()

  return Number(row.total)
}

test.group('The demo data of the development environment', () => {
  test('creates the demo account and its organization', async ({ assert }) => {
    await seedDemo('development')

    const user = await User.query().where('email', DEMO_EMAIL).firstOrFail()
    assert.isNotNull(user.emailVerifiedAt)

    const organization = await Organization.query().where('slug', DEMO_SLUG).firstOrFail()
    assert.isNotNull(organization.onboardedAt)

    const membership = await Membership.query()
      .where('organizationId', organization.id)
      .where('userId', user.id)
      .firstOrFail()

    assert.equal(membership.role, 'owner')
  })

  test('does not create the demo account in production', async ({ assert }) => {
    await seedDemo('production')

    assert.equal(await countOf('users', 'email', DEMO_EMAIL), 0)
    assert.equal(await countOf('organizations', 'slug', DEMO_SLUG), 0)
  })

  test('does not duplicate the demo account when it runs again', async ({ assert }) => {
    await seedDemo('development')
    await seedDemo('development')

    assert.equal(await countOf('users', 'email', DEMO_EMAIL), 1)
    assert.equal(await countOf('organizations', 'slug', DEMO_SLUG), 1)

    const memberships = await db.query().from('memberships').count('* as total').firstOrFail()
    assert.equal(Number(memberships.total), 1)
  })
})
