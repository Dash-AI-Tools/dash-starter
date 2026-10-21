/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  health: {
    show: typeof routes['health.show']
  }
  auth: {
    session: {
      show: typeof routes['auth.session.show']
      store: typeof routes['auth.session.store']
      login: typeof routes['auth.session.login']
      destroy: typeof routes['auth.session.destroy']
    }
    emailVerification: {
      verify: typeof routes['auth.email_verification.verify']
      resend: typeof routes['auth.email_verification.resend']
    }
    passwordReset: {
      store: typeof routes['auth.password_reset.store']
      update: typeof routes['auth.password_reset.update']
    }
  }
  profile: {
    profile: {
      show: typeof routes['profile.profile.show']
    }
  }
}
