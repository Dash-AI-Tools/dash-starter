/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  drive: {
    local: {
      serve: typeof routes['drive.local.serve']
    }
  }
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
    emailChange: {
      verify: typeof routes['auth.email_change.verify']
    }
    passwordReset: {
      store: typeof routes['auth.password_reset.store']
      update: typeof routes['auth.password_reset.update']
    }
  }
  profile: {
    show: typeof routes['profile.show']
    update: typeof routes['profile.update']
    avatar: typeof routes['profile.avatar']
    email: typeof routes['profile.email']
    password: typeof routes['profile.password']
    destroy: typeof routes['profile.destroy']
    terms: typeof routes['profile.terms']
    rememberOrganization: typeof routes['profile.remember_organization']
  }
  organization: {
    index: typeof routes['organization.index']
    store: typeof routes['organization.store']
    show: typeof routes['organization.show']
    update: typeof routes['organization.update']
    destroy: typeof routes['organization.destroy']
    transfer: typeof routes['organization.transfer']
  }
  member: {
    index: typeof routes['member.index']
    update: typeof routes['member.update']
    destroy: typeof routes['member.destroy']
    leave: typeof routes['member.leave']
  }
  invitation: {
    index: typeof routes['invitation.index']
    store: typeof routes['invitation.store']
    destroy: typeof routes['invitation.destroy']
    show: typeof routes['invitation.show']
    accept: typeof routes['invitation.accept']
  }
  onboarding: {
    show: typeof routes['onboarding.show']
    useCase: typeof routes['onboarding.use_case']
    invites: typeof routes['onboarding.invites']
    plan: typeof routes['onboarding.plan']
    complete: typeof routes['onboarding.complete']
    acceptInvitation: typeof routes['onboarding.accept_invitation']
  }
}
