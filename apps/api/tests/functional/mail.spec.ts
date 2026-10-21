import { test } from '@japa/runner'
import EmailChange from '#mails/email_change'
import OrganizationInvitation from '#mails/organization_invitation'
import PasswordChanged from '#mails/password_changed'
import PaymentFailed from '#mails/payment_failed'
import QuotaThreshold from '#mails/quota_threshold'
import ResetPassword from '#mails/reset_password'
import SubscriptionCanceled from '#mails/subscription_canceled'
import SubscriptionStarted from '#mails/subscription_started'
import VerifyEmail from '#mails/verify_email'
import Welcome from '#mails/welcome'
import User from '#models/user'
import mail from '@adonisjs/mail/services/main'

const LINK = 'https://app.example.com/action?token=abc'

/**
 * Creates an account directly in the database, without going through the
 * sign-up endpoint.
 */
async function createUser() {
  return User.create({
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    password: 'supersecret',
    locale: 'en',
    termsVersion: '2026-01-01',
  })
}

/**
 * Every email of the catalog, in the two languages of the product.
 */
function catalog(user: User) {
  return [
    { email: new VerifyEmail(user, LINK, 'en'), subject: 'Verify your email address' },
    { email: new VerifyEmail(user, LINK, 'es'), subject: 'Verifica tu correo electrónico' },
    {
      email: new EmailChange(user, 'new@example.com', LINK, 'en'),
      subject: 'Confirm your new email address',
    },
    {
      email: new EmailChange(user, 'new@example.com', LINK, 'es'),
      subject: 'Confirma tu nuevo correo electrónico',
    },
    { email: new ResetPassword(user, LINK, 'en'), subject: 'Reset your password' },
    { email: new ResetPassword(user, LINK, 'es'), subject: 'Restablece tu contraseña' },
    { email: new PasswordChanged(user, new Date(), 'en'), subject: 'Your password was changed' },
    { email: new PasswordChanged(user, new Date(), 'es'), subject: 'Tu contraseña ha cambiado' },
    {
      email: new OrganizationInvitation({
        email: 'invitee@example.com',
        name: 'Grace Hopper',
        organizationName: 'Acme',
        inviterName: 'Ada',
        acceptUrl: LINK,
        expiresAt: new Date(),
        locale: 'en',
      }),
      subject: 'Ada invited you to Acme',
    },
    {
      email: new OrganizationInvitation({
        email: 'invitee@example.com',
        name: 'Grace Hopper',
        organizationName: 'Acme',
        inviterName: 'Ada',
        acceptUrl: LINK,
        expiresAt: new Date(),
        locale: 'es',
      }),
      subject: 'Ada te ha invitado a Acme',
    },
    { email: new Welcome(user, 'en'), subject: 'Welcome to Dash' },
    { email: new Welcome(user, 'es'), subject: 'Te damos la bienvenida a Dash' },
    {
      email: new SubscriptionStarted({
        email: user.email,
        name: user.fullName,
        planName: 'Pro',
        amount: 29,
        currency: 'EUR',
        renewsAt: new Date(),
        manageUrl: LINK,
        locale: 'en',
      }),
      subject: 'Your Pro subscription started',
    },
    {
      email: new SubscriptionStarted({
        email: user.email,
        name: user.fullName,
        planName: 'Pro',
        amount: 29,
        currency: 'EUR',
        renewsAt: new Date(),
        manageUrl: LINK,
        locale: 'es',
      }),
      subject: 'Tu suscripción Pro ha comenzado',
    },
    {
      email: new PaymentFailed({
        email: user.email,
        name: user.fullName,
        planName: 'Pro',
        amount: 29,
        currency: 'EUR',
        manageUrl: LINK,
        locale: 'en',
      }),
      subject: 'The payment of your subscription failed',
    },
    {
      email: new PaymentFailed({
        email: user.email,
        name: user.fullName,
        planName: 'Pro',
        amount: 29,
        currency: 'EUR',
        manageUrl: LINK,
        locale: 'es',
      }),
      subject: 'El pago de tu suscripción ha fallado',
    },
    {
      email: new SubscriptionCanceled({
        email: user.email,
        name: user.fullName,
        planName: 'Pro',
        plansUrl: LINK,
        locale: 'en',
      }),
      subject: 'Your subscription was canceled',
    },
    {
      email: new SubscriptionCanceled({
        email: user.email,
        name: user.fullName,
        planName: 'Pro',
        plansUrl: LINK,
        locale: 'es',
      }),
      subject: 'Tu suscripción ha sido cancelada',
    },
    {
      email: new QuotaThreshold({
        email: user.email,
        name: user.fullName,
        scope: 'ai',
        threshold: 80,
        used: 80,
        limit: 100,
        usageUrl: LINK,
        locale: 'en',
      }),
      subject: 'You have used 80% of your AI quota',
    },
    {
      email: new QuotaThreshold({
        email: user.email,
        name: user.fullName,
        scope: 'ai',
        threshold: 100,
        used: 100,
        limit: 100,
        usageUrl: LINK,
        locale: 'en',
      }),
      subject: 'You have used all your AI credits',
    },
    {
      email: new QuotaThreshold({
        email: user.email,
        name: user.fullName,
        scope: 'mcp',
        threshold: 100,
        used: 100,
        limit: 100,
        usageUrl: LINK,
        locale: 'es',
      }),
      subject: 'Has usado todos tus créditos de MCP',
    },
  ]
}

test.group('Transactional emails', () => {
  test('the subject of every email follows the locale of the recipient', async ({ assert }) => {
    const fakeMailer = mail.fake()
    const user = await createUser()
    const emails = catalog(user)

    for (const email of emails) {
      await mail.sendLater(email.email)
    }

    const subjects = fakeMailer.mails.queued().map((queued) => queued.subject)
    assert.deepEqual(
      subjects,
      emails.map((email) => email.subject)
    )
  })

  test('the body of the email is written in the language of the recipient', async ({ assert }) => {
    const fakeMailer = mail.fake()
    const user = await createUser()

    await mail.sendLater(new ResetPassword(user, LINK, 'es'))

    const [queued] = fakeMailer.mails.queued()
    const html = queued.message.nodeMailerMessage.html ?? ''
    const text = queued.message.nodeMailerMessage.text ?? ''

    assert.include(html, 'Elige una nueva contraseña')
    assert.include(html, LINK)
    assert.include(html, 'Elegir una nueva contraseña')
    assert.include(text, 'Elige una nueva contraseña')
    assert.include(text, LINK)
  })

  test('the plain text alternative keeps the links usable', async ({ assert }) => {
    const fakeMailer = mail.fake()
    const user = await createUser()
    const link = 'https://app.example.com/action?token=abc&next=%2Fhome'

    await mail.sendLater(new ResetPassword(user, link, 'en'))

    const [queued] = fakeMailer.mails.queued()
    const text = queued.message.nodeMailerMessage.text ?? ''

    assert.include(text, link)
    assert.notInclude(text, '&amp;')
  })

  test('the email carries the product name and the support contact', async ({ assert }) => {
    const fakeMailer = mail.fake()
    const user = await createUser()

    await mail.sendLater(new Welcome(user, 'en'))

    const [queued] = fakeMailer.mails.queued()
    const html = queued.message.nodeMailerMessage.html ?? ''

    assert.include(html, 'Dash')
    assert.include(html, 'support@dash-starter.test')
  })
})
