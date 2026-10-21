/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
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
  'profile.profile.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/account/profile',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"profile"]],
    types: placeholder as Registry['profile.profile.show']['types'],
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
