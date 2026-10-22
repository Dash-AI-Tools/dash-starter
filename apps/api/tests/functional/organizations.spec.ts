import { test } from '@japa/runner'
import OrganizationInvitation from '#mails/organization_invitation'
import Membership from '#models/membership'
import Organization from '#models/organization'
import Plan from '#models/plan'
import User from '#models/user'
import { slugify } from '#services/organizations'
import { Browser } from '#tests/helpers/browser'
import type { ApiClient } from '@japa/api-client'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'

/**
 * Creates an account with a confirmed email address.
 */
async function createUser(email: string, verified = true) {
  return User.create({
    fullName: 'Test User',
    email,
    password: 'supersecret',
    locale: 'en',
    termsVersion: '2026-01-01',
    emailVerifiedAt: verified ? DateTime.now() : null,
  })
}

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
 * An organization with an owner.
 */
async function createOrganization(owner: User, name = 'Acme Labs', slug?: string) {
  const organization = await Organization.create({
    name,
    slug: slug ?? slugify(name),
    defaultLocale: 'en',
  })

  await Membership.create({
    organizationId: organization.id,
    userId: owner.id,
    role: 'owner',
  })

  return organization
}

/**
 * The token of the link that accepts an invitation.
 */
function tokenOf(url: string): string {
  const segments = new URL(url).pathname.split('/')
  return segments[segments.length - 2] ?? ''
}

test.group('Create organization', () => {
  test('creates the organization with a suggested slug and makes the caller its owner', async ({
    client,
    assert,
  }) => {
    const user = await createUser('ada@example.com')
    const browser = await signIn(client, 'ada@example.com')

    const response = await browser.post('/api/v1/orgs', { body: { name: 'Acme Labs' } })

    response.assertStatus(201)
    assert.equal(response.body().organization.name, 'Acme Labs')
    assert.equal(response.body().organization.slug, 'acme-labs')

    const membership = await Membership.query().where('userId', user.id).first()
    assert.equal(membership!.role, 'owner')
    assert.equal(membership!.organizationId, response.body().organization.id)
  })

  test('lists the organizations of the caller', async ({ client, assert }) => {
    const user = await createUser('ada@example.com')
    await createOrganization(user, 'Acme Labs')

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.get('/api/v1/orgs')

    response.assertStatus(200)
    assert.lengthOf(response.body().organizations, 1)
    assert.equal(response.body().organizations[0].slug, 'acme-labs')
    assert.equal(response.body().organizations[0].role, 'owner')
  })

  test('refuses a slug that is already taken and suggests another one', async ({
    client,
    assert,
  }) => {
    const owner = await createUser('ada@example.com')
    await createOrganization(owner, 'Acme Labs', 'acme-labs')

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.post('/api/v1/orgs', {
      body: { name: 'Another Labs', slug: 'acme-labs' },
    })

    response.assertStatus(422)

    const error = response.body().errors.find((entry: { field: string }) => entry.field === 'slug')
    assert.equal(error.code, 'slug_taken')
    assert.include(error.message, 'acme-labs-2')
  })
})

test.group('Tenancy', () => {
  test('hides the organization of another tenant', async ({ client, assert }) => {
    const owner = await createUser('ada@example.com')
    await createOrganization(owner, 'Acme Labs')

    await createUser('outsider@example.com')
    const browser = await signIn(client, 'outsider@example.com')

    const response = await browser.get('/api/v1/orgs/acme-labs')

    response.assertStatus(404)
    assert.equal(response.body().code, 'E_ORGANIZATION_NOT_FOUND')
  })

  test('hides the organization of another tenant even with a valid member', async ({ client }) => {
    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner, 'Acme Labs')

    const outsider = await createUser('outsider@example.com')
    await Membership.create({
      organizationId: organization.id,
      userId: outsider.id,
      role: 'member',
    })

    const browser = await signIn(client, 'outsider@example.com')
    const response = await browser.get('/api/v1/orgs/does-not-exist')

    response.assertStatus(404)
  })

  test('refuses an admin action to a member', async ({ client }) => {
    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner, 'Acme Labs')

    const member = await createUser('member@example.com')
    await Membership.create({
      organizationId: organization.id,
      userId: member.id,
      role: 'member',
    })

    const browser = await signIn(client, 'member@example.com')
    const response = await browser.post('/api/v1/orgs/acme-labs/invitations', {
      body: { email: 'someone@example.com', role: 'member' },
    })

    response.assertStatus(403)
  })
})

test.group('Members', () => {
  test('lists the members of the organization', async ({ client, assert }) => {
    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner, 'Acme Labs')

    const member = await createUser('member@example.com')
    await Membership.create({
      organizationId: organization.id,
      userId: member.id,
      role: 'member',
    })

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.get('/api/v1/orgs/acme-labs/members')

    response.assertStatus(200)
    assert.lengthOf(response.body().members, 2)
    assert.equal(response.body().members[0].role, 'owner')
    assert.equal(response.body().members[0].user.email, 'ada@example.com')
  })

  test('changes the role of a member', async ({ client, assert }) => {
    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner, 'Acme Labs')

    const member = await createUser('member@example.com')
    await Membership.create({
      organizationId: organization.id,
      userId: member.id,
      role: 'member',
    })

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.patch(`/api/v1/orgs/acme-labs/members/${member.id}`, {
      body: { role: 'admin' },
    })

    response.assertStatus(200)
    assert.equal(response.body().member.role, 'admin')

    await member.refresh()
    const membership = await Membership.query()
      .where('organizationId', organization.id)
      .where('userId', member.id)
      .first()
    assert.equal(membership!.role, 'admin')
  })

  test('does not let an admin touch the owner', async ({ client }) => {
    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner, 'Acme Labs')

    const admin = await createUser('admin@example.com')
    await Membership.create({
      organizationId: organization.id,
      userId: admin.id,
      role: 'admin',
    })

    const browser = await signIn(client, 'admin@example.com')
    const response = await browser.patch(`/api/v1/orgs/acme-labs/members/${owner.id}`, {
      body: { role: 'member' },
    })

    response.assertStatus(403)
  })

  test('does not let an admin hand the ownership over', async ({ client }) => {
    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner, 'Acme Labs')

    const admin = await createUser('admin@example.com')
    await Membership.create({
      organizationId: organization.id,
      userId: admin.id,
      role: 'admin',
    })

    const member = await createUser('member@example.com')
    await Membership.create({
      organizationId: organization.id,
      userId: member.id,
      role: 'member',
    })

    const browser = await signIn(client, 'admin@example.com')
    const response = await browser.patch(`/api/v1/orgs/acme-labs/members/${member.id}`, {
      body: { role: 'owner' },
    })

    response.assertStatus(403)
  })

  test('removes a member, who loses the access right away', async ({ client }) => {
    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner, 'Acme Labs')

    const member = await createUser('member@example.com')
    await Membership.create({
      organizationId: organization.id,
      userId: member.id,
      role: 'member',
    })

    const admin = await signIn(client, 'ada@example.com')
    const response = await admin.delete(`/api/v1/orgs/acme-labs/members/${member.id}`)
    response.assertStatus(200)

    const memberBrowser = await signIn(client, 'member@example.com')
    const refused = await memberBrowser.get('/api/v1/orgs/acme-labs')
    refused.assertStatus(404)
  })

  test('lets a member leave the organization', async ({ client, assert }) => {
    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner, 'Acme Labs')

    const member = await createUser('member@example.com')
    await Membership.create({
      organizationId: organization.id,
      userId: member.id,
      role: 'member',
    })

    const browser = await signIn(client, 'member@example.com')
    const response = await browser.post('/api/v1/orgs/acme-labs/leave')
    response.assertStatus(200)

    const membership = await Membership.query()
      .where('organizationId', organization.id)
      .where('userId', member.id)
      .first()
    assert.isNull(membership)
  })

  test('refuses to leave the organization as the last owner', async ({ client, assert }) => {
    const owner = await createUser('ada@example.com')
    await createOrganization(owner, 'Acme Labs')

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.post('/api/v1/orgs/acme-labs/leave')

    response.assertStatus(422)
    assert.equal(response.body().code, 'E_LAST_OWNER')
  })

  test('refuses to demote the last owner', async ({ client, assert }) => {
    const owner = await createUser('ada@example.com')
    await createOrganization(owner, 'Acme Labs')

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.patch(`/api/v1/orgs/acme-labs/members/${owner.id}`, {
      body: { role: 'member' },
    })

    response.assertStatus(422)
    assert.equal(response.body().code, 'E_LAST_OWNER')
  })
})

test.group('Invitations', () => {
  test('invites somebody and lists the pending invitation', async ({ client, assert }) => {
    const fakeMailer = mail.fake()
    const owner = await createUser('ada@example.com')
    await createOrganization(owner, 'Acme Labs')

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.post('/api/v1/orgs/acme-labs/invitations', {
      body: { email: 'ana@example.com', role: 'member' },
    })

    response.assertStatus(201)
    assert.equal(response.body().invitation.email, 'ana@example.com')
    assert.equal(response.body().invitation.role, 'member')

    const list = await browser.get('/api/v1/orgs/acme-labs/invitations')
    list.assertStatus(200)
    assert.lengthOf(list.body().invitations, 1)

    /**
     * The invitation is on its way, with a link that accepts it.
     */
    fakeMailer.mails.assertQueued(OrganizationInvitation)
    const [queued] = fakeMailer.mails.queued((message) => message instanceof OrganizationInvitation)
    assert.include((queued as OrganizationInvitation).link, '/invitations/')
  })

  test('refuses to invite somebody without a confirmed email', async ({ client, assert }) => {
    const owner = await createUser('ada@example.com', false)
    await createOrganization(owner, 'Acme Labs')

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.post('/api/v1/orgs/acme-labs/invitations', {
      body: { email: 'ana@example.com', role: 'member' },
    })

    response.assertStatus(403)
    assert.equal(response.body().code, 'E_EMAIL_NOT_VERIFIED')
  })

  test('accepts the invitation of the same email address', async ({ client, assert }) => {
    const fakeMailer = mail.fake()
    const owner = await createUser('ada@example.com')
    await createOrganization(owner, 'Acme Labs')

    const admin = await signIn(client, 'ada@example.com')
    await admin.post('/api/v1/orgs/acme-labs/invitations', {
      body: { email: 'ana@example.com', role: 'admin' },
    })

    const [queued] = fakeMailer.mails.queued(
      (message) => message instanceof OrganizationInvitation
    ) as OrganizationInvitation[]
    const token = tokenOf(queued.link)

    await createUser('ana@example.com')
    const invitee = await signIn(client, 'ana@example.com')
    const response = await invitee.post(`/api/v1/invitations/${token}/accept`)

    response.assertStatus(200)
    assert.equal(response.body().membership.role, 'admin')

    const membership = await Membership.query()
      .whereHas('user', (query) => query.where('email', 'ana@example.com'))
      .first()
    assert.equal(membership!.role, 'admin')
  })

  test('refuses an invitation that goes to another email address', async ({ client, assert }) => {
    const fakeMailer = mail.fake()
    const owner = await createUser('ada@example.com')
    await createOrganization(owner, 'Acme Labs')

    const admin = await signIn(client, 'ada@example.com')
    await admin.post('/api/v1/orgs/acme-labs/invitations', {
      body: { email: 'ana@example.com', role: 'member' },
    })

    const [queued] = fakeMailer.mails.queued(
      (message) => message instanceof OrganizationInvitation
    ) as OrganizationInvitation[]
    const token = tokenOf(queued.link)

    await createUser('someone@example.com')
    const other = await signIn(client, 'someone@example.com')
    const response = await other.post(`/api/v1/invitations/${token}/accept`)

    response.assertStatus(403)
    assert.equal(response.body().code, 'E_INVITATION_MISMATCH')
  })

  test('refuses an invitation when the plan has no seats left', async ({ client, assert }) => {
    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner, 'Acme Labs')

    /**
     * The owner takes one seat and the two members take the other two.
     */
    for (const email of ['one@example.com', 'two@example.com']) {
      const member = await createUser(email)
      await Membership.create({
        organizationId: organization.id,
        userId: member.id,
        role: 'member',
      })
    }

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.post('/api/v1/orgs/acme-labs/invitations', {
      body: { email: 'ana@example.com', role: 'member' },
    })

    response.assertStatus(402)
    assert.equal(response.body().code, 'E_SEAT_LIMIT_REACHED')
  })

  test('invites somebody when the plan does not limit the seats', async ({ client }) => {
    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner, 'Acme Labs')

    /**
     * A limit of `-1` means that the seats are not limited, so the check of
     * the seats never blocks.
     */
    const plan = await Plan.query().where('key', 'free').firstOrFail()
    plan.entitlements = { ...plan.entitlements, seats: -1 }
    await plan.save()

    for (const email of ['one@example.com', 'two@example.com', 'three@example.com']) {
      const member = await createUser(email)
      await Membership.create({
        organizationId: organization.id,
        userId: member.id,
        role: 'member',
      })
    }

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.post('/api/v1/orgs/acme-labs/invitations', {
      body: { email: 'ana@example.com', role: 'member' },
    })

    response.assertStatus(201)
  })

  test('refuses to invite a member twice', async ({ client, assert }) => {
    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner, 'Acme Labs')

    const member = await createUser('ana@example.com')
    await Membership.create({
      organizationId: organization.id,
      userId: member.id,
      role: 'member',
    })

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.post('/api/v1/orgs/acme-labs/invitations', {
      body: { email: 'ana@example.com', role: 'member' },
    })

    response.assertStatus(422)

    const error = response.body().errors.find((entry: { field: string }) => entry.field === 'email')
    assert.equal(error.code, 'already_member')
  })

  test('revokes an invitation, and the link stops working', async ({ client, assert }) => {
    const fakeMailer = mail.fake()
    const owner = await createUser('ada@example.com')
    await createOrganization(owner, 'Acme Labs')

    const browser = await signIn(client, 'ada@example.com')
    const created = await browser.post('/api/v1/orgs/acme-labs/invitations', {
      body: { email: 'ana@example.com', role: 'member' },
    })
    created.assertStatus(201)

    const revoked = await browser.delete(
      `/api/v1/orgs/acme-labs/invitations/${created.body().invitation.id}`
    )
    revoked.assertStatus(200)

    const list = await browser.get('/api/v1/orgs/acme-labs/invitations')
    assert.lengthOf(list.body().invitations, 0)

    const [queued] = fakeMailer.mails.queued(
      (message) => message instanceof OrganizationInvitation
    ) as OrganizationInvitation[]
    const token = tokenOf(queued.link)

    await createUser('ana@example.com')
    const invitee = await signIn(client, 'ana@example.com')
    const response = await invitee.post(`/api/v1/invitations/${token}/accept`)

    response.assertStatus(404)
    assert.equal(response.body().code, 'E_INVITATION_INVALID')
  })

  test('shows the details of an invitation to the page that accepts it', async ({
    client,
    assert,
  }) => {
    const fakeMailer = mail.fake()
    const owner = await createUser('ada@example.com')
    await createOrganization(owner, 'Acme Labs')

    const browser = await signIn(client, 'ada@example.com')
    await browser.post('/api/v1/orgs/acme-labs/invitations', {
      body: { email: 'ana@example.com', role: 'member' },
    })

    const [queued] = fakeMailer.mails.queued(
      (message) => message instanceof OrganizationInvitation
    ) as OrganizationInvitation[]
    const token = tokenOf(queued.link)

    const response = await browser.get(`/api/v1/invitations/${token}`)

    response.assertStatus(200)
    assert.equal(response.body().invitation.email, 'ana@example.com')
    assert.equal(response.body().invitation.status, 'pending')
    assert.equal(response.body().invitation.organization.name, 'Acme Labs')
  })
})

test.group('Organization settings', () => {
  test('updates the name, the slug and the default language', async ({ client, assert }) => {
    const owner = await createUser('ada@example.com')
    await createOrganization(owner, 'Acme Labs')

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.patch('/api/v1/orgs/acme-labs', {
      body: { name: 'Acme Corp', slug: 'acme-corp', defaultLocale: 'es' },
    })

    response.assertStatus(200)
    assert.equal(response.body().organization.name, 'Acme Corp')
    assert.equal(response.body().organization.slug, 'acme-corp')
    assert.equal(response.body().organization.defaultLocale, 'es')
  })

  test('does not resolve the old slug after the change', async ({ client }) => {
    const owner = await createUser('ada@example.com')
    await createOrganization(owner, 'Acme Labs')

    const browser = await signIn(client, 'ada@example.com')
    await browser.patch('/api/v1/orgs/acme-labs', { body: { slug: 'acme-corp' } })

    const old = await browser.get('/api/v1/orgs/acme-labs')
    old.assertStatus(404)

    const current = await browser.get('/api/v1/orgs/acme-corp')
    current.assertStatus(200)
  })

  test('refuses a slug that is already taken', async ({ client, assert }) => {
    const owner = await createUser('ada@example.com')
    await createOrganization(owner, 'Acme Labs')

    const other = await createUser('other@example.com')
    await createOrganization(other, 'Other Labs', 'other-labs')

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.patch('/api/v1/orgs/acme-labs', {
      body: { slug: 'other-labs' },
    })

    response.assertStatus(422)

    const error = response.body().errors.find((entry: { field: string }) => entry.field === 'slug')
    assert.equal(error.code, 'slug_taken')
  })

  test('does not let a member change the settings', async ({ client }) => {
    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner, 'Acme Labs')

    const member = await createUser('member@example.com')
    await Membership.create({
      organizationId: organization.id,
      userId: member.id,
      role: 'member',
    })

    const browser = await signIn(client, 'member@example.com')
    const response = await browser.patch('/api/v1/orgs/acme-labs', { body: { name: 'Hacked' } })

    response.assertStatus(403)
  })

  test('transfers the ownership to another member', async ({ client, assert }) => {
    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner, 'Acme Labs')

    const admin = await createUser('admin@example.com')
    await Membership.create({
      organizationId: organization.id,
      userId: admin.id,
      role: 'admin',
    })

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.post('/api/v1/orgs/acme-labs/transfer-ownership', {
      body: { userId: admin.id },
    })

    response.assertStatus(200)
    assert.equal(response.body().member.role, 'owner')

    const target = await Membership.query()
      .where('organizationId', organization.id)
      .where('userId', admin.id)
      .first()
    const actor = await Membership.query()
      .where('organizationId', organization.id)
      .where('userId', owner.id)
      .first()

    assert.equal(target!.role, 'owner')
    assert.equal(actor!.role, 'admin')
  })

  test('does not let the owner hand the ownership over to themselves', async ({
    client,
    assert,
  }) => {
    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner, 'Acme Labs')

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.post('/api/v1/orgs/acme-labs/transfer-ownership', {
      body: { userId: owner.id },
    })

    response.assertStatus(422)
    assert.equal(response.body().code, 'E_VALIDATION_ERROR')

    const membership = await Membership.query()
      .where('organizationId', organization.id)
      .where('userId', owner.id)
      .first()

    assert.equal(membership!.role, 'owner')
  })

  test('does not let an admin delete the organization', async ({ client }) => {
    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner, 'Acme Labs')

    const admin = await createUser('admin@example.com')
    await Membership.create({
      organizationId: organization.id,
      userId: admin.id,
      role: 'admin',
    })

    const browser = await signIn(client, 'admin@example.com')
    const response = await browser.delete('/api/v1/orgs/acme-labs', {
      body: { name: 'Acme Labs' },
    })

    response.assertStatus(403)
  })

  test('deletes the organization after the name is typed again', async ({ client, assert }) => {
    const owner = await createUser('ada@example.com')
    await createOrganization(owner, 'Acme Labs')

    const browser = await signIn(client, 'ada@example.com')

    const wrongName = await browser.delete('/api/v1/orgs/acme-labs', { body: { name: 'Other' } })
    wrongName.assertStatus(422)

    const response = await browser.delete('/api/v1/orgs/acme-labs', { body: { name: 'Acme Labs' } })
    response.assertStatus(200)

    const gone = await browser.get('/api/v1/orgs/acme-labs')
    gone.assertStatus(404)

    assert.isNull(await Organization.findBy('slug', 'acme-labs'))
  })
})
