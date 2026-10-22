import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'drive.local.serve': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'health.show': { paramsTuple?: []; params?: {} }
    'auth.session.show': { paramsTuple?: []; params?: {} }
    'auth.session.store': { paramsTuple?: []; params?: {} }
    'auth.session.login': { paramsTuple?: []; params?: {} }
    'auth.email_verification.verify': { paramsTuple?: []; params?: {} }
    'auth.email_change.verify': { paramsTuple?: []; params?: {} }
    'auth.password_reset.store': { paramsTuple?: []; params?: {} }
    'auth.password_reset.update': { paramsTuple?: []; params?: {} }
    'auth.session.destroy': { paramsTuple?: []; params?: {} }
    'auth.email_verification.resend': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile.update': { paramsTuple?: []; params?: {} }
    'profile.avatar': { paramsTuple?: []; params?: {} }
    'profile.email': { paramsTuple?: []; params?: {} }
    'profile.password': { paramsTuple?: []; params?: {} }
    'profile.destroy': { paramsTuple?: []; params?: {} }
    'profile.terms': { paramsTuple?: []; params?: {} }
    'profile.remember_organization': { paramsTuple?: []; params?: {} }
    'organization.index': { paramsTuple?: []; params?: {} }
    'organization.store': { paramsTuple?: []; params?: {} }
    'organization.show': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'organization.update': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'organization.destroy': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'organization.transfer': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'member.index': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'member.update': { paramsTuple: [ParamValue,ParamValue]; params: {'orgSlug': ParamValue,'userId': ParamValue} }
    'member.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'orgSlug': ParamValue,'userId': ParamValue} }
    'member.leave': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'invitation.index': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'invitation.store': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'invitation.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'orgSlug': ParamValue,'id': ParamValue} }
    'invitation.show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'invitation.accept': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'onboarding.show': { paramsTuple?: []; params?: {} }
    'onboarding.use_case': { paramsTuple?: []; params?: {} }
    'onboarding.invites': { paramsTuple?: []; params?: {} }
    'onboarding.plan': { paramsTuple?: []; params?: {} }
    'onboarding.complete': { paramsTuple?: []; params?: {} }
    'onboarding.accept_invitation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'plan.index': { paramsTuple?: []; params?: {} }
    'billing.show': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'billing.portal': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'billing.change_plan': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'billing.cancel': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'billing.checkout': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'creem_webhook': { paramsTuple?: []; params?: {} }
    'chat.status': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'chat.send': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'chat.conversations': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'chat.show': { paramsTuple: [ParamValue,ParamValue]; params: {'orgSlug': ParamValue,'id': ParamValue} }
    'chat.rename': { paramsTuple: [ParamValue,ParamValue]; params: {'orgSlug': ParamValue,'id': ParamValue} }
    'chat.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'orgSlug': ParamValue,'id': ParamValue} }
  }
  GET: {
    'drive.local.serve': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'health.show': { paramsTuple?: []; params?: {} }
    'auth.session.show': { paramsTuple?: []; params?: {} }
    'auth.email_verification.verify': { paramsTuple?: []; params?: {} }
    'auth.email_change.verify': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'organization.index': { paramsTuple?: []; params?: {} }
    'organization.show': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'member.index': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'invitation.index': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'invitation.show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'onboarding.show': { paramsTuple?: []; params?: {} }
    'plan.index': { paramsTuple?: []; params?: {} }
    'billing.show': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'billing.portal': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'chat.status': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'chat.conversations': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'chat.show': { paramsTuple: [ParamValue,ParamValue]; params: {'orgSlug': ParamValue,'id': ParamValue} }
  }
  HEAD: {
    'drive.local.serve': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'health.show': { paramsTuple?: []; params?: {} }
    'auth.session.show': { paramsTuple?: []; params?: {} }
    'auth.email_verification.verify': { paramsTuple?: []; params?: {} }
    'auth.email_change.verify': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'organization.index': { paramsTuple?: []; params?: {} }
    'organization.show': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'member.index': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'invitation.index': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'invitation.show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'onboarding.show': { paramsTuple?: []; params?: {} }
    'plan.index': { paramsTuple?: []; params?: {} }
    'billing.show': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'billing.portal': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'chat.status': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'chat.conversations': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'chat.show': { paramsTuple: [ParamValue,ParamValue]; params: {'orgSlug': ParamValue,'id': ParamValue} }
  }
  POST: {
    'auth.session.store': { paramsTuple?: []; params?: {} }
    'auth.session.login': { paramsTuple?: []; params?: {} }
    'auth.password_reset.store': { paramsTuple?: []; params?: {} }
    'auth.password_reset.update': { paramsTuple?: []; params?: {} }
    'auth.session.destroy': { paramsTuple?: []; params?: {} }
    'auth.email_verification.resend': { paramsTuple?: []; params?: {} }
    'profile.avatar': { paramsTuple?: []; params?: {} }
    'profile.email': { paramsTuple?: []; params?: {} }
    'profile.password': { paramsTuple?: []; params?: {} }
    'profile.terms': { paramsTuple?: []; params?: {} }
    'profile.remember_organization': { paramsTuple?: []; params?: {} }
    'organization.store': { paramsTuple?: []; params?: {} }
    'organization.transfer': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'member.leave': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'invitation.store': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'invitation.accept': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'onboarding.use_case': { paramsTuple?: []; params?: {} }
    'onboarding.invites': { paramsTuple?: []; params?: {} }
    'onboarding.plan': { paramsTuple?: []; params?: {} }
    'onboarding.complete': { paramsTuple?: []; params?: {} }
    'onboarding.accept_invitation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'billing.change_plan': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'billing.cancel': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'billing.checkout': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'creem_webhook': { paramsTuple?: []; params?: {} }
    'chat.send': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
  }
  PATCH: {
    'profile.update': { paramsTuple?: []; params?: {} }
    'organization.update': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'member.update': { paramsTuple: [ParamValue,ParamValue]; params: {'orgSlug': ParamValue,'userId': ParamValue} }
    'chat.rename': { paramsTuple: [ParamValue,ParamValue]; params: {'orgSlug': ParamValue,'id': ParamValue} }
  }
  DELETE: {
    'profile.destroy': { paramsTuple?: []; params?: {} }
    'organization.destroy': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'member.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'orgSlug': ParamValue,'userId': ParamValue} }
    'invitation.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'orgSlug': ParamValue,'id': ParamValue} }
    'chat.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'orgSlug': ParamValue,'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}