import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'health.show': { paramsTuple?: []; params?: {} }
    'auth.session.show': { paramsTuple?: []; params?: {} }
    'auth.session.store': { paramsTuple?: []; params?: {} }
    'auth.session.login': { paramsTuple?: []; params?: {} }
    'auth.email_verification.verify': { paramsTuple?: []; params?: {} }
    'auth.password_reset.store': { paramsTuple?: []; params?: {} }
    'auth.password_reset.update': { paramsTuple?: []; params?: {} }
    'auth.session.destroy': { paramsTuple?: []; params?: {} }
    'auth.email_verification.resend': { paramsTuple?: []; params?: {} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
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
  }
  GET: {
    'health.show': { paramsTuple?: []; params?: {} }
    'auth.session.show': { paramsTuple?: []; params?: {} }
    'auth.email_verification.verify': { paramsTuple?: []; params?: {} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'organization.index': { paramsTuple?: []; params?: {} }
    'organization.show': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'member.index': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'invitation.index': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'invitation.show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
  }
  HEAD: {
    'health.show': { paramsTuple?: []; params?: {} }
    'auth.session.show': { paramsTuple?: []; params?: {} }
    'auth.email_verification.verify': { paramsTuple?: []; params?: {} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'organization.index': { paramsTuple?: []; params?: {} }
    'organization.show': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'member.index': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'invitation.index': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'invitation.show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
  }
  POST: {
    'auth.session.store': { paramsTuple?: []; params?: {} }
    'auth.session.login': { paramsTuple?: []; params?: {} }
    'auth.password_reset.store': { paramsTuple?: []; params?: {} }
    'auth.password_reset.update': { paramsTuple?: []; params?: {} }
    'auth.session.destroy': { paramsTuple?: []; params?: {} }
    'auth.email_verification.resend': { paramsTuple?: []; params?: {} }
    'organization.store': { paramsTuple?: []; params?: {} }
    'organization.transfer': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'member.leave': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'invitation.store': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'invitation.accept': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
  }
  PATCH: {
    'organization.update': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'member.update': { paramsTuple: [ParamValue,ParamValue]; params: {'orgSlug': ParamValue,'userId': ParamValue} }
  }
  DELETE: {
    'organization.destroy': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'member.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'orgSlug': ParamValue,'userId': ParamValue} }
    'invitation.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'orgSlug': ParamValue,'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}