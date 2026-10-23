/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractRawResponse, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'drive.local.serve': {
    methods: ["GET","HEAD"]
    pattern: '/api/uploads/*'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { '*': ParamValue[] }
      query: {}
      response: unknown
      errorResponse: unknown
      rawResponse: ExtractRawResponse<unknown>
    }
  }
  'health.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/health'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/health_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/health_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/health_controller').default['show']>>>
    }
  }
  'auth.session.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/auth/session'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/session_controller').default['show']>>>
    }
  }
  'auth.session.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/signup'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').signupValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').signupValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/session_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.session.login': {
    methods: ["POST"]
    pattern: '/api/v1/auth/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['login']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['login']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/session_controller').default['login']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.email_verification.verify': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/auth/verify-email'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/email_verification_controller').default['verify']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/email_verification_controller').default['verify']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/email_verification_controller').default['verify']>>>
    }
  }
  'auth.email_change.verify': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/auth/email-change/verify'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/email_change_controller').default['verify']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/email_change_controller').default['verify']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/email_change_controller').default['verify']>>>
    }
  }
  'auth.password_reset.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/forgot-password'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').forgotPasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').forgotPasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/password_reset_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/password_reset_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/password_reset_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.password_reset.update': {
    methods: ["POST"]
    pattern: '/api/v1/auth/reset-password'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').resetPasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').resetPasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/password_reset_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/password_reset_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/password_reset_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.session.destroy': {
    methods: ["POST"]
    pattern: '/api/v1/auth/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/session_controller').default['destroy']>>>
    }
  }
  'auth.email_verification.resend': {
    methods: ["POST"]
    pattern: '/api/v1/auth/resend-verification'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/email_verification_controller').default['resend']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/email_verification_controller').default['resend']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/email_verification_controller').default['resend']>>>
    }
  }
  'profile.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/account/profile'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
    }
  }
  'profile.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/account/profile'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/profile').updateProfileValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/profile').updateProfileValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.avatar': {
    methods: ["POST"]
    pattern: '/api/v1/account/profile/avatar'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['avatar']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['avatar']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['avatar']>>>
    }
  }
  'profile.email': {
    methods: ["POST"]
    pattern: '/api/v1/account/profile/email'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/profile').changeEmailValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/profile').changeEmailValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['email']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['email']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['email']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.password': {
    methods: ["POST"]
    pattern: '/api/v1/account/profile/password'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/profile').changePasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/profile').changePasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['password']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['password']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['password']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/account/profile'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/profile').deleteAccountValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/profile').deleteAccountValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['destroy']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['destroy']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.terms': {
    methods: ["POST"]
    pattern: '/api/v1/account/terms'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['terms']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['terms']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['terms']>>>
    }
  }
  'profile.remember_organization': {
    methods: ["POST"]
    pattern: '/api/v1/account/organization'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/profile').rememberOrganizationValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/profile').rememberOrganizationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['rememberOrganization']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['rememberOrganization']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['rememberOrganization']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'organization.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/orgs'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/organization_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/organization_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/organization_controller').default['index']>>>
    }
  }
  'organization.store': {
    methods: ["POST"]
    pattern: '/api/v1/orgs'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/organization').createOrganizationValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/organization').createOrganizationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/organization_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/organization_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/organization_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'organization.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/orgs/:orgSlug'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { orgSlug: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/organization_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/organization_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/organization_controller').default['show']>>>
    }
  }
  'organization.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/orgs/:orgSlug'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/organization').updateOrganizationValidator)>>
      paramsTuple: [ParamValue]
      params: { orgSlug: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/organization').updateOrganizationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/organization_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/organization_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/organization_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'organization.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/orgs/:orgSlug'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/organization').deleteOrganizationValidator)>>
      paramsTuple: [ParamValue]
      params: { orgSlug: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/organization').deleteOrganizationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/organization_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/organization_controller').default['destroy']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/organization_controller').default['destroy']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'organization.transfer': {
    methods: ["POST"]
    pattern: '/api/v1/orgs/:orgSlug/transfer-ownership'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/organization').transferOwnershipValidator)>>
      paramsTuple: [ParamValue]
      params: { orgSlug: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/organization').transferOwnershipValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/organization_controller').default['transfer']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/organization_controller').default['transfer']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/organization_controller').default['transfer']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'member.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/orgs/:orgSlug/members'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { orgSlug: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/organization').searchMembersValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/member_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/member_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/member_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'member.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/orgs/:orgSlug/members/:userId'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/organization').changeRoleValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { orgSlug: ParamValue; userId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/organization').changeRoleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/member_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/member_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/member_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'member.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/orgs/:orgSlug/members/:userId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { orgSlug: ParamValue; userId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/member_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/member_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/member_controller').default['destroy']>>>
    }
  }
  'member.leave': {
    methods: ["POST"]
    pattern: '/api/v1/orgs/:orgSlug/leave'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { orgSlug: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/member_controller').default['leave']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/member_controller').default['leave']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/member_controller').default['leave']>>>
    }
  }
  'dashboard.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/orgs/:orgSlug/dashboard'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { orgSlug: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/dashboard_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/dashboard_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/dashboard_controller').default['show']>>>
    }
  }
  'invitation.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/orgs/:orgSlug/invitations'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { orgSlug: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/invitation_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/invitation_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/invitation_controller').default['index']>>>
    }
  }
  'invitation.store': {
    methods: ["POST"]
    pattern: '/api/v1/orgs/:orgSlug/invitations'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/organization').createInvitationValidator)>>
      paramsTuple: [ParamValue]
      params: { orgSlug: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/organization').createInvitationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/invitation_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/invitation_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/invitation_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'invitation.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/orgs/:orgSlug/invitations/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { orgSlug: ParamValue; id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/invitation_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/invitation_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/invitation_controller').default['destroy']>>>
    }
  }
  'bulk_import.store': {
    methods: ["POST"]
    pattern: '/api/v1/orgs/:orgSlug/imports'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { orgSlug: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/bulk_import_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/bulk_import_controller').default['store']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/bulk_import_controller').default['store']>>>
    }
  }
  'bulk_import.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/orgs/:orgSlug/imports/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { orgSlug: ParamValue; id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/bulk_import_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/bulk_import_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/bulk_import_controller').default['show']>>>
    }
  }
  'invitation.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/invitations/:token'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/invitation_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/invitation_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/invitation_controller').default['show']>>>
    }
  }
  'invitation.accept': {
    methods: ["POST"]
    pattern: '/api/v1/invitations/:token/accept'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/invitation_controller').default['accept']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/invitation_controller').default['accept']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/invitation_controller').default['accept']>>>
    }
  }
  'onboarding.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/onboarding'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['show']>>>
    }
  }
  'onboarding.use_case': {
    methods: ["POST"]
    pattern: '/api/v1/onboarding/use-case'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/onboarding').useCaseValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/onboarding').useCaseValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['useCase']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['useCase']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['useCase']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'onboarding.invites': {
    methods: ["POST"]
    pattern: '/api/v1/onboarding/invites'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/onboarding').onboardingInvitesValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/onboarding').onboardingInvitesValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['invites']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['invites']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['invites']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'onboarding.plan': {
    methods: ["POST"]
    pattern: '/api/v1/onboarding/plan'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/onboarding').onboardingPlanValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/onboarding').onboardingPlanValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['plan']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['plan']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['plan']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'onboarding.complete': {
    methods: ["POST"]
    pattern: '/api/v1/onboarding/complete'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['complete']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['complete']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['complete']>>>
    }
  }
  'onboarding.accept_invitation': {
    methods: ["POST"]
    pattern: '/api/v1/onboarding/invitations/:id/accept'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['acceptInvitation']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['acceptInvitation']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['acceptInvitation']>>>
    }
  }
  'plan.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/plans'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/plan_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/plan_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/plan_controller').default['index']>>>
    }
  }
  'billing.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/orgs/:orgSlug/billing'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { orgSlug: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['show']>>>
    }
  }
  'billing.portal': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/orgs/:orgSlug/billing/portal'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { orgSlug: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['portal']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['portal']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['portal']>>>
    }
  }
  'billing.invoices': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/orgs/:orgSlug/billing/invoices'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { orgSlug: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['invoices']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['invoices']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['invoices']>>>
    }
  }
  'billing.change_plan': {
    methods: ["POST"]
    pattern: '/api/v1/orgs/:orgSlug/billing/change-plan'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/billing').changePlanValidator)>>
      paramsTuple: [ParamValue]
      params: { orgSlug: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/billing').changePlanValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['changePlan']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['changePlan']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['changePlan']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'billing.cancel': {
    methods: ["POST"]
    pattern: '/api/v1/orgs/:orgSlug/billing/cancel'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/billing').cancelValidator)>>
      paramsTuple: [ParamValue]
      params: { orgSlug: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/billing').cancelValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['cancel']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['cancel']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['cancel']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'billing.checkout': {
    methods: ["POST"]
    pattern: '/api/v1/orgs/:orgSlug/billing/checkout'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/billing').checkoutValidator)>>
      paramsTuple: [ParamValue]
      params: { orgSlug: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/billing').checkoutValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['checkout']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['checkout']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['checkout']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'creem_webhook': {
    methods: ["POST"]
    pattern: '/api/v1/webhooks/creem'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/creem_webhook_controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/creem_webhook_controller').default['handle']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/creem_webhook_controller').default['handle']>>>
    }
  }
  'api_key.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/orgs/:orgSlug/api-keys'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { orgSlug: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/api_key_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/api_key_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/api_key_controller').default['index']>>>
    }
  }
  'api_key.store': {
    methods: ["POST"]
    pattern: '/api/v1/orgs/:orgSlug/api-keys'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/api_key').createApiKeyValidator)>>
      paramsTuple: [ParamValue]
      params: { orgSlug: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/api_key').createApiKeyValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/api_key_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/api_key_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/api_key_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'api_key.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/orgs/:orgSlug/api-keys/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { orgSlug: ParamValue; id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/api_key_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/api_key_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/api_key_controller').default['destroy']>>>
    }
  }
  'chat.status': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/orgs/:orgSlug/chat'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { orgSlug: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/chat_controller').default['status']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/chat_controller').default['status']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/chat_controller').default['status']>>>
    }
  }
  'chat.send': {
    methods: ["POST"]
    pattern: '/api/v1/orgs/:orgSlug/chat'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/chat').sendMessageValidator)>>
      paramsTuple: [ParamValue]
      params: { orgSlug: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/chat').sendMessageValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/chat_controller').default['send']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/chat_controller').default['send']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/chat_controller').default['send']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'chat.conversations': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/orgs/:orgSlug/chat/conversations'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { orgSlug: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/chat_controller').default['conversations']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/chat_controller').default['conversations']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/chat_controller').default['conversations']>>>
    }
  }
  'chat.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/orgs/:orgSlug/chat/conversations/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { orgSlug: ParamValue; id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/chat_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/chat_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/chat_controller').default['show']>>>
    }
  }
  'chat.rename': {
    methods: ["PATCH"]
    pattern: '/api/v1/orgs/:orgSlug/chat/conversations/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/chat').renameConversationValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { orgSlug: ParamValue; id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/chat').renameConversationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/chat_controller').default['rename']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/chat_controller').default['rename']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/chat_controller').default['rename']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'chat.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/orgs/:orgSlug/chat/conversations/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { orgSlug: ParamValue; id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/chat_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/chat_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/chat_controller').default['destroy']>>>
    }
  }
  'mcp': {
    methods: ["POST"]
    pattern: '/mcp'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/mcp_controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/mcp_controller').default['handle']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/mcp_controller').default['handle']>>>
    }
  }
  'mcp.stream': {
    methods: ["GET","HEAD"]
    pattern: '/mcp'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/mcp_controller').default['stream']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/mcp_controller').default['stream']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/mcp_controller').default['stream']>>>
    }
  }
}
