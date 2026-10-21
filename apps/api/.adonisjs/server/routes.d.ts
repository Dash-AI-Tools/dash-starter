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
  }
  GET: {
    'health.show': { paramsTuple?: []; params?: {} }
    'auth.session.show': { paramsTuple?: []; params?: {} }
    'auth.email_verification.verify': { paramsTuple?: []; params?: {} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'health.show': { paramsTuple?: []; params?: {} }
    'auth.session.show': { paramsTuple?: []; params?: {} }
    'auth.email_verification.verify': { paramsTuple?: []; params?: {} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'auth.session.store': { paramsTuple?: []; params?: {} }
    'auth.session.login': { paramsTuple?: []; params?: {} }
    'auth.password_reset.store': { paramsTuple?: []; params?: {} }
    'auth.password_reset.update': { paramsTuple?: []; params?: {} }
    'auth.session.destroy': { paramsTuple?: []; params?: {} }
    'auth.email_verification.resend': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}