import { test } from '@japa/runner'
import BulkImport from '#models/bulk_import'
import Invitation from '#models/invitation'
import Membership from '#models/membership'
import { createMember, createOrganization } from '#tests/helpers/ai'
import { Browser } from '#tests/helpers/browser'
import type { ApiClient } from '@japa/api-client'

/**
 * A browser with a signed-in session.
 */
async function signIn(client: ApiClient, email: string) {
  const browser = new Browser(client)
  const response = await browser.post('/api/v1/auth/login', {
    body: { email, password: 'supersecret' },
  })

  response.assertStatus(200)

  return browser
}

/**
 * A CSV file with the header and one line per address.
 */
function csv(...rows: string[]) {
  return Buffer.from(['email,role', ...rows].join('\n'))
}

/**
 * Imports a CSV as the signed-in owner of the organization.
 */
function upload(browser: Browser, slug: string, contents: Buffer, filename = 'team.csv') {
  return browser.upload(`/api/v1/orgs/${slug}/imports`, 'file', {
    contents,
    filename,
    contentType: 'text/csv',
  })
}

test.group('Bulk import', () => {
  test('saves the defaults of an import and cascades with the organization', async ({ assert }) => {
    const owner = await createMember('owner@example.com')
    const organization = await createOrganization(owner)

    const created = await BulkImport.create({
      organizationId: organization.id,
      fileName: 'team.csv',
    })
    const record = await BulkImport.findOrFail(created.id)

    assert.equal(record.state, 'pending')
    assert.equal(record.totalRows, 0)
    assert.equal(record.importedRows, 0)
    assert.isNull(record.errors)

    await organization.delete()

    assert.isNull(await BulkImport.find(record.id))
  })

  test('turns every row into an invitation, not a membership', async ({ client, assert }) => {
    const owner = await createMember('owner@example.com')
    const organization = await createOrganization(owner)
    const browser = await signIn(client, 'owner@example.com')

    const response = await upload(
      browser,
      organization.slug,
      csv('ada@example.com,member', 'grace@example.com,admin')
    )

    response.assertStatus(201)

    const record = response.body().import
    assert.equal(record.state, 'done')
    assert.equal(record.totalRows, 2)
    assert.equal(record.importedRows, 2)
    assert.deepEqual(record.errors, [])

    const invitations = await Invitation.query().where('organizationId', organization.id)

    assert.lengthOf(invitations, 2)
    assert.sameMembers(
      invitations.map((invitation) => `${invitation.email}:${invitation.role}`),
      ['ada@example.com:member', 'grace@example.com:admin']
    )

    /**
     * The owner is the only member: nobody joined before accepting.
     */
    assert.lengthOf(await Membership.query().where('organizationId', organization.id), 1)
  })

  test('reports the failing rows and still invites the others', async ({ client, assert }) => {
    const owner = await createMember('owner@example.com')
    const organization = await createOrganization(owner)

    const member = await createMember('member@example.com')

    await Membership.create({
      organizationId: organization.id,
      userId: member.id,
      role: 'member',
    })

    const browser = await signIn(client, 'owner@example.com')
    const response = await upload(
      browser,
      organization.slug,
      csv('member@example.com,member', 'not-an-address,member', 'ana@example.com,member')
    )

    response.assertStatus(201)

    const record = response.body().import
    assert.equal(record.state, 'done')
    assert.equal(record.totalRows, 3)
    assert.equal(record.importedRows, 1)
    assert.deepEqual(
      record.errors.map((error: { line: number; email: string }) => error.line),
      [2, 3]
    )
    assert.lengthOf(await Invitation.query().where('organizationId', organization.id), 1)
  })

  test('stops at the seats of the plan and reports the remaining rows', async ({
    client,
    assert,
  }) => {
    const owner = await createMember('owner@example.com')
    const organization = await createOrganization(owner)

    /**
     * The free plan has three seats: with only the owner, two are left.
     */
    const browser = await signIn(client, 'owner@example.com')
    const response = await upload(
      browser,
      organization.slug,
      csv(
        'one@example.com',
        'two@example.com',
        'three@example.com',
        'four@example.com',
        'five@example.com'
      )
    )

    response.assertStatus(201)

    const record = response.body().import
    assert.equal(record.importedRows, 2)
    assert.lengthOf(record.errors, 3)
    assert.include(record.errors[0].reason, 'seats')
    assert.lengthOf(await Invitation.query().where('organizationId', organization.id), 2)
  })

  test('never returns an import of another organization', async ({ client, assert }) => {
    const owner = await createMember('owner@example.com')
    const organization = await createOrganization(owner)

    const record = await BulkImport.create({
      organizationId: organization.id,
      fileName: 'team.csv',
    })

    const otherOwner = await createMember('other@example.com')
    const otherOrganization = await createOrganization(otherOwner, 'Other Labs')
    const browser = await signIn(client, 'other@example.com')

    const response = await browser.get(
      `/api/v1/orgs/${otherOrganization.slug}/imports/${record.id}`
    )

    response.assertStatus(404)
    assert.equal(response.body().code, 'E_BULK_IMPORT_NOT_FOUND')
  })

  test('refuses a member that is not an owner or an admin', async ({ client, assert }) => {
    const owner = await createMember('owner@example.com')
    const organization = await createOrganization(owner)
    const member = await createMember('member@example.com')

    await Membership.create({
      organizationId: organization.id,
      userId: member.id,
      role: 'member',
    })

    const browser = await signIn(client, 'member@example.com')
    const response = await upload(browser, organization.slug, csv('ana@example.com'))

    response.assertStatus(403)
    assert.lengthOf(await BulkImport.all(), 0)
    assert.lengthOf(await Invitation.all(), 0)
  })

  test('refuses a file that is not a CSV', async ({ client, assert }) => {
    const owner = await createMember('owner@example.com')
    const organization = await createOrganization(owner)
    const browser = await signIn(client, 'owner@example.com')

    const response = await upload(
      browser,
      organization.slug,
      Buffer.from('email\nana@example.com'),
      'team.txt'
    )

    response.assertStatus(422)
    assert.equal(response.body().code, 'E_VALIDATION_ERROR')
    assert.lengthOf(await BulkImport.all(), 0)
  })

  test('refuses a file over 1 MB', async ({ client, assert }) => {
    const owner = await createMember('owner@example.com')
    const organization = await createOrganization(owner)
    const browser = await signIn(client, 'owner@example.com')

    const response = await upload(browser, organization.slug, Buffer.alloc(1024 * 1024 + 1, 'a'))

    response.assertStatus(422)
    assert.lengthOf(await BulkImport.all(), 0)
  })

  test('refuses a file of more than 500 rows', async ({ client, assert }) => {
    const owner = await createMember('owner@example.com')
    const organization = await createOrganization(owner)
    const browser = await signIn(client, 'owner@example.com')

    const rows = Array.from({ length: 501 }, (_, index) => `person${index}@example.com`)
    const response = await upload(browser, organization.slug, csv(...rows))

    response.assertStatus(422)
    assert.lengthOf(await BulkImport.all(), 0)
  })

  test('refuses the sixth import of an organization within an hour', async ({ client, assert }) => {
    const owner = await createMember('owner@example.com')
    const organization = await createOrganization(owner)
    const browser = await signIn(client, 'owner@example.com')

    for (let index = 0; index < 5; index++) {
      const response = await upload(browser, organization.slug, csv(`person${index}@example.com`))
      response.assertStatus(201)
    }

    const refused = await upload(browser, organization.slug, csv('person5@example.com'))

    refused.assertStatus(429)
    assert.lengthOf(await BulkImport.all(), 5)
  })
})
