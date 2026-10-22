/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'drive.local.serve': {
    methods: ["GET","HEAD"],
    pattern: '/api/uploads/*',
    tokens: [[0,"api"],[0,"uploads"],[2,"*"]],
    types: placeholder as Registry['drive.local.serve']['types'],
  },
  'health.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/health',
    tokens: [[0,"api"],[0,"v1"],[0,"health"]],
    types: placeholder as Registry['health.show']['types'],
  },
  'auth.session.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/auth/session',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"session"]],
    types: placeholder as Registry['auth.session.show']['types'],
  },
  'auth.session.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/signup',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"signup"]],
    types: placeholder as Registry['auth.session.store']['types'],
  },
  'auth.session.login': {
    methods: ["POST"],
    pattern: '/api/v1/auth/login',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"login"]],
    types: placeholder as Registry['auth.session.login']['types'],
  },
  'auth.email_verification.verify': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/auth/verify-email',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"verify-email"]],
    types: placeholder as Registry['auth.email_verification.verify']['types'],
  },
  'auth.email_change.verify': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/auth/email-change/verify',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"email-change"],[0,"verify"]],
    types: placeholder as Registry['auth.email_change.verify']['types'],
  },
  'auth.password_reset.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/forgot-password',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"forgot-password"]],
    types: placeholder as Registry['auth.password_reset.store']['types'],
  },
  'auth.password_reset.update': {
    methods: ["POST"],
    pattern: '/api/v1/auth/reset-password',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"reset-password"]],
    types: placeholder as Registry['auth.password_reset.update']['types'],
  },
  'auth.session.destroy': {
    methods: ["POST"],
    pattern: '/api/v1/auth/logout',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"logout"]],
    types: placeholder as Registry['auth.session.destroy']['types'],
  },
  'auth.email_verification.resend': {
    methods: ["POST"],
    pattern: '/api/v1/auth/resend-verification',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"resend-verification"]],
    types: placeholder as Registry['auth.email_verification.resend']['types'],
  },
  'profile.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/account/profile',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"profile"]],
    types: placeholder as Registry['profile.show']['types'],
  },
  'profile.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/account/profile',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"profile"]],
    types: placeholder as Registry['profile.update']['types'],
  },
  'profile.avatar': {
    methods: ["POST"],
    pattern: '/api/v1/account/profile/avatar',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"profile"],[0,"avatar"]],
    types: placeholder as Registry['profile.avatar']['types'],
  },
  'profile.email': {
    methods: ["POST"],
    pattern: '/api/v1/account/profile/email',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"profile"],[0,"email"]],
    types: placeholder as Registry['profile.email']['types'],
  },
  'profile.password': {
    methods: ["POST"],
    pattern: '/api/v1/account/profile/password',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"profile"],[0,"password"]],
    types: placeholder as Registry['profile.password']['types'],
  },
  'profile.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/account/profile',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"profile"]],
    types: placeholder as Registry['profile.destroy']['types'],
  },
  'profile.terms': {
    methods: ["POST"],
    pattern: '/api/v1/account/terms',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"terms"]],
    types: placeholder as Registry['profile.terms']['types'],
  },
  'profile.remember_organization': {
    methods: ["POST"],
    pattern: '/api/v1/account/organization',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"organization"]],
    types: placeholder as Registry['profile.remember_organization']['types'],
  },
  'organization.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/orgs',
    tokens: [[0,"api"],[0,"v1"],[0,"orgs"]],
    types: placeholder as Registry['organization.index']['types'],
  },
  'organization.store': {
    methods: ["POST"],
    pattern: '/api/v1/orgs',
    tokens: [[0,"api"],[0,"v1"],[0,"orgs"]],
    types: placeholder as Registry['organization.store']['types'],
  },
  'organization.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/orgs/:orgSlug',
    tokens: [[0,"api"],[0,"v1"],[0,"orgs"],[1,"orgSlug"]],
    types: placeholder as Registry['organization.show']['types'],
  },
  'organization.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/orgs/:orgSlug',
    tokens: [[0,"api"],[0,"v1"],[0,"orgs"],[1,"orgSlug"]],
    types: placeholder as Registry['organization.update']['types'],
  },
  'organization.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/orgs/:orgSlug',
    tokens: [[0,"api"],[0,"v1"],[0,"orgs"],[1,"orgSlug"]],
    types: placeholder as Registry['organization.destroy']['types'],
  },
  'organization.transfer': {
    methods: ["POST"],
    pattern: '/api/v1/orgs/:orgSlug/transfer-ownership',
    tokens: [[0,"api"],[0,"v1"],[0,"orgs"],[1,"orgSlug"],[0,"transfer-ownership"]],
    types: placeholder as Registry['organization.transfer']['types'],
  },
  'member.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/orgs/:orgSlug/members',
    tokens: [[0,"api"],[0,"v1"],[0,"orgs"],[1,"orgSlug"],[0,"members"]],
    types: placeholder as Registry['member.index']['types'],
  },
  'member.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/orgs/:orgSlug/members/:userId',
    tokens: [[0,"api"],[0,"v1"],[0,"orgs"],[1,"orgSlug"],[0,"members"],[1,"userId"]],
    types: placeholder as Registry['member.update']['types'],
  },
  'member.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/orgs/:orgSlug/members/:userId',
    tokens: [[0,"api"],[0,"v1"],[0,"orgs"],[1,"orgSlug"],[0,"members"],[1,"userId"]],
    types: placeholder as Registry['member.destroy']['types'],
  },
  'member.leave': {
    methods: ["POST"],
    pattern: '/api/v1/orgs/:orgSlug/leave',
    tokens: [[0,"api"],[0,"v1"],[0,"orgs"],[1,"orgSlug"],[0,"leave"]],
    types: placeholder as Registry['member.leave']['types'],
  },
  'invitation.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/orgs/:orgSlug/invitations',
    tokens: [[0,"api"],[0,"v1"],[0,"orgs"],[1,"orgSlug"],[0,"invitations"]],
    types: placeholder as Registry['invitation.index']['types'],
  },
  'invitation.store': {
    methods: ["POST"],
    pattern: '/api/v1/orgs/:orgSlug/invitations',
    tokens: [[0,"api"],[0,"v1"],[0,"orgs"],[1,"orgSlug"],[0,"invitations"]],
    types: placeholder as Registry['invitation.store']['types'],
  },
  'invitation.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/orgs/:orgSlug/invitations/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"orgs"],[1,"orgSlug"],[0,"invitations"],[1,"id"]],
    types: placeholder as Registry['invitation.destroy']['types'],
  },
  'invitation.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/invitations/:token',
    tokens: [[0,"api"],[0,"v1"],[0,"invitations"],[1,"token"]],
    types: placeholder as Registry['invitation.show']['types'],
  },
  'invitation.accept': {
    methods: ["POST"],
    pattern: '/api/v1/invitations/:token/accept',
    tokens: [[0,"api"],[0,"v1"],[0,"invitations"],[1,"token"],[0,"accept"]],
    types: placeholder as Registry['invitation.accept']['types'],
  },
  'onboarding.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/onboarding',
    tokens: [[0,"api"],[0,"v1"],[0,"onboarding"]],
    types: placeholder as Registry['onboarding.show']['types'],
  },
  'onboarding.use_case': {
    methods: ["POST"],
    pattern: '/api/v1/onboarding/use-case',
    tokens: [[0,"api"],[0,"v1"],[0,"onboarding"],[0,"use-case"]],
    types: placeholder as Registry['onboarding.use_case']['types'],
  },
  'onboarding.invites': {
    methods: ["POST"],
    pattern: '/api/v1/onboarding/invites',
    tokens: [[0,"api"],[0,"v1"],[0,"onboarding"],[0,"invites"]],
    types: placeholder as Registry['onboarding.invites']['types'],
  },
  'onboarding.plan': {
    methods: ["POST"],
    pattern: '/api/v1/onboarding/plan',
    tokens: [[0,"api"],[0,"v1"],[0,"onboarding"],[0,"plan"]],
    types: placeholder as Registry['onboarding.plan']['types'],
  },
  'onboarding.complete': {
    methods: ["POST"],
    pattern: '/api/v1/onboarding/complete',
    tokens: [[0,"api"],[0,"v1"],[0,"onboarding"],[0,"complete"]],
    types: placeholder as Registry['onboarding.complete']['types'],
  },
  'onboarding.accept_invitation': {
    methods: ["POST"],
    pattern: '/api/v1/onboarding/invitations/:id/accept',
    tokens: [[0,"api"],[0,"v1"],[0,"onboarding"],[0,"invitations"],[1,"id"],[0,"accept"]],
    types: placeholder as Registry['onboarding.accept_invitation']['types'],
  },
  'plan.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/plans',
    tokens: [[0,"api"],[0,"v1"],[0,"plans"]],
    types: placeholder as Registry['plan.index']['types'],
  },
  'billing.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/orgs/:orgSlug/billing',
    tokens: [[0,"api"],[0,"v1"],[0,"orgs"],[1,"orgSlug"],[0,"billing"]],
    types: placeholder as Registry['billing.show']['types'],
  },
  'billing.portal': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/orgs/:orgSlug/billing/portal',
    tokens: [[0,"api"],[0,"v1"],[0,"orgs"],[1,"orgSlug"],[0,"billing"],[0,"portal"]],
    types: placeholder as Registry['billing.portal']['types'],
  },
  'billing.change_plan': {
    methods: ["POST"],
    pattern: '/api/v1/orgs/:orgSlug/billing/change-plan',
    tokens: [[0,"api"],[0,"v1"],[0,"orgs"],[1,"orgSlug"],[0,"billing"],[0,"change-plan"]],
    types: placeholder as Registry['billing.change_plan']['types'],
  },
  'billing.cancel': {
    methods: ["POST"],
    pattern: '/api/v1/orgs/:orgSlug/billing/cancel',
    tokens: [[0,"api"],[0,"v1"],[0,"orgs"],[1,"orgSlug"],[0,"billing"],[0,"cancel"]],
    types: placeholder as Registry['billing.cancel']['types'],
  },
  'billing.checkout': {
    methods: ["POST"],
    pattern: '/api/v1/orgs/:orgSlug/billing/checkout',
    tokens: [[0,"api"],[0,"v1"],[0,"orgs"],[1,"orgSlug"],[0,"billing"],[0,"checkout"]],
    types: placeholder as Registry['billing.checkout']['types'],
  },
  'creem_webhook': {
    methods: ["POST"],
    pattern: '/api/v1/webhooks/creem',
    tokens: [[0,"api"],[0,"v1"],[0,"webhooks"],[0,"creem"]],
    types: placeholder as Registry['creem_webhook']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
