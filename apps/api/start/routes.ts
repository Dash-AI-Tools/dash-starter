import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'
import { registerFeatureRoutes } from '#features/index'

router.get('/', () => {
  return { hello: 'world' }
})

router
  .group(() => {
    router.get('health', [controllers.Health, 'show'])

    router
      .group(() => {
        router.get('session', [controllers.Session, 'show'])
        router.post('signup', [controllers.Session, 'store'])
        router.post('login', [controllers.Session, 'login'])
        router.get('verify-email', [controllers.EmailVerification, 'verify'])
        router.get('email-change/verify', [controllers.EmailChange, 'verify'])
        router.post('forgot-password', [controllers.PasswordReset, 'store'])
        router.post('reset-password', [controllers.PasswordReset, 'update'])

        router
          .group(() => {
            router.post('logout', [controllers.Session, 'destroy'])
            router.post('resend-verification', [controllers.EmailVerification, 'resend'])
          })
          .use(middleware.auth())
      })
      .prefix('auth')
      .as('auth')

    /**
     * The account of the visitor: the profile, the preferences and the
     * credentials.
     */
    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.patch('profile', [controllers.Profile, 'update'])
        router.post('profile/avatar', [controllers.Profile, 'avatar'])
        router.post('profile/email', [controllers.Profile, 'email'])
        router.post('profile/password', [controllers.Profile, 'password'])
        router.delete('profile', [controllers.Profile, 'destroy'])
        router.post('terms', [controllers.Profile, 'terms'])
        router.post('organization', [controllers.Profile, 'rememberOrganization'])
      })
      .prefix('account')
      .use(middleware.auth())

    /**
     * The organizations of the user.
     */
    router
      .group(() => {
        router.get('orgs', [controllers.Organization, 'index'])
        router.post('orgs', [controllers.Organization, 'store'])
      })
      .use(middleware.auth())

    /**
     * The organization of the request is resolved through the membership of
     * the caller, so a user that does not belong to it gets a 404.
     */
    router
      .group(() => {
        router.get('orgs/:orgSlug', [controllers.Organization, 'show'])
        router.patch('orgs/:orgSlug', [controllers.Organization, 'update'])
        router.delete('orgs/:orgSlug', [controllers.Organization, 'destroy'])
        router.post('orgs/:orgSlug/transfer-ownership', [controllers.Organization, 'transfer'])

        router.get('orgs/:orgSlug/members', [controllers.Member, 'index'])
        router.patch('orgs/:orgSlug/members/:userId', [controllers.Member, 'update'])
        router.delete('orgs/:orgSlug/members/:userId', [controllers.Member, 'destroy'])
        router.post('orgs/:orgSlug/leave', [controllers.Member, 'leave'])
      })
      .use([middleware.auth(), middleware.org()])

    /**
     * The metrics of the dashboard home. Every member of the organization
     * reads them: the response carries no email and no key name.
     */
    router
      .group(() => {
        router.get('orgs/:orgSlug/dashboard', [controllers.Dashboard, 'show'])
      })
      .use([middleware.auth(), middleware.org()])

    /**
     * The invitations of an organization need a confirmed email address from
     * the inviter.
     */
    router
      .group(() => {
        router.get('orgs/:orgSlug/invitations', [controllers.Invitation, 'index'])
        router.post('orgs/:orgSlug/invitations', [controllers.Invitation, 'store'])
        router.delete('orgs/:orgSlug/invitations/:id', [controllers.Invitation, 'destroy'])
      })
      .use([middleware.auth(), middleware.org(), middleware.verified()])

    /**
     * The bulk import of invitations. The file is read in the request and
     * every row becomes an invitation; the state of the import stays in the
     * history of the organization.
     */
    router
      .group(() => {
        router.post('orgs/:orgSlug/imports', [controllers.BulkImport, 'store'])
        router.get('orgs/:orgSlug/imports/:id', [controllers.BulkImport, 'show'])
      })
      .use([middleware.auth(), middleware.org(), middleware.verified()])

    /**
     * The page that accepts an invitation reads the details of the
     * invitation with the token, so it works without an account.
     */
    router.get('invitations/:token', [controllers.Invitation, 'show'])

    router
      .post('invitations/:token/accept', [controllers.Invitation, 'accept'])
      .use(middleware.auth())

    /**
     * The setup of the first organization of the user: the progress is saved
     * after every step, so the user can come back to it later.
     */
    router
      .group(() => {
        router.get('onboarding', [controllers.Onboarding, 'show'])
        router.post('onboarding/use-case', [controllers.Onboarding, 'useCase'])
        router.post('onboarding/invites', [controllers.Onboarding, 'invites'])
        router.post('onboarding/plan', [controllers.Onboarding, 'plan'])
        router.post('onboarding/complete', [controllers.Onboarding, 'complete'])
      })
      .use(middleware.auth())

    /**
     * The invitations of the user are accepted without the token of the
     * link, because the address of the account is the one the invitation
     * was sent to. The address has to be confirmed for that.
     */
    router
      .post('onboarding/invitations/:id/accept', [controllers.Onboarding, 'acceptInvitation'])
      .use([middleware.auth(), middleware.verified()])

    /**
     * The catalog of the plans: the pricing page reads it before the
     * visitor has an account.
     */
    router.get('plans', [controllers.Plan, 'index'])

    /**
     * The billing of the organization. The checkout needs a confirmed
     * email address, because the receipt of the payment travels to it.
     */
    router
      .group(() => {
        router.get('orgs/:orgSlug/billing', [controllers.Billing, 'show'])
        router.get('orgs/:orgSlug/billing/portal', [controllers.Billing, 'portal'])
        router.get('orgs/:orgSlug/billing/invoices', [controllers.Billing, 'invoices'])
        router.post('orgs/:orgSlug/billing/change-plan', [controllers.Billing, 'changePlan'])
        router.post('orgs/:orgSlug/billing/cancel', [controllers.Billing, 'cancel'])
      })
      .use([middleware.auth(), middleware.org()])

    router
      .post('orgs/:orgSlug/billing/checkout', [controllers.Billing, 'checkout'])
      .use([middleware.auth(), middleware.org(), middleware.verified()])

    /**
     * The events of the payment provider. The endpoint is public: the
     * signature of the request is what proves that it comes from Creem.
     */
    router.post('webhooks/creem', [controllers.CreemWebhook, 'handle'])

    /**
     * The keys of the organization that let an external agent reach the MCP
     * server.
     */
    router
      .group(() => {
        router.get('orgs/:orgSlug/api-keys', [controllers.ApiKey, 'index'])
        router.post('orgs/:orgSlug/api-keys', [controllers.ApiKey, 'store'])
        router.delete('orgs/:orgSlug/api-keys/:id', [controllers.ApiKey, 'destroy'])
      })
      .use([middleware.auth(), middleware.org()])

    /**
     * The assistant of the organization: its conversations and the streamed
     * answer of the model.
     */
    router
      .group(() => {
        router.get('orgs/:orgSlug/chat', [controllers.Chat, 'status'])
        router.post('orgs/:orgSlug/chat', [controllers.Chat, 'send'])
        router.get('orgs/:orgSlug/chat/conversations', [controllers.Chat, 'conversations'])
        router.get('orgs/:orgSlug/chat/conversations/:id', [controllers.Chat, 'show'])
        router.patch('orgs/:orgSlug/chat/conversations/:id', [controllers.Chat, 'rename'])
        router.delete('orgs/:orgSlug/chat/conversations/:id', [controllers.Chat, 'destroy'])
      })
      .use([middleware.auth(), middleware.org()])

    /**
     * The features of the product. They live in `app/features`, which a core
     * update never touches, so a feature is added without editing this file.
     */
    registerFeatureRoutes(router)
  })
  .prefix('/api/v1')

/**
 * The MCP server of the organizations.
 *
 * It lives at the root of the API because the clients of the protocol
 * address it directly, and it authenticates with the key of the
 * organization instead of with a session.
 */
router.post('/mcp', [controllers.Mcp, 'handle'])
router.get('/mcp', [controllers.Mcp, 'stream'])
