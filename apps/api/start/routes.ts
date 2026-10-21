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

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())
  })
  .prefix('/api/v1')
