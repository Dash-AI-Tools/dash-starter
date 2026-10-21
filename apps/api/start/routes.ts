import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

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
     * The page that accepts an invitation reads the details of the
     * invitation with the token, so it works without an account.
     */
    router.get('invitations/:token', [controllers.Invitation, 'show'])

    router
      .post('invitations/:token/accept', [controllers.Invitation, 'accept'])
      .use(middleware.auth())
  })
  .prefix('/api/v1')
