import Invitation from '#models/invitation'
import Membership from '#models/membership'
import type Organization from '#models/organization'
import type { OnboardingState } from '#models/organization'
import type User from '#models/user'

/**
 * The steps of the setup of an organization, in the order they happen.
 *
 * `details` is the step that creates the organization, `complete` is the last
 * screen of the wizard and `done` means that the organization is ready and
 * the user belongs to it already.
 */
export type OnboardingStep = 'details' | 'use-case' | 'invites' | 'plan' | 'complete' | 'done'

/**
 * The setup of the organization of the user: the organization that is being
 * set up, the progress saved in it and the step that comes next.
 */
export type Onboarding = {
  /** The organization that is being set up, when there is one. */
  organization: Organization | null
  /** The progress saved so far. */
  state: OnboardingState | null
  /** The step that comes next. */
  step: OnboardingStep
}

/**
 * The step that comes next, derived from the progress saved so far.
 */
export function stepOf(state: OnboardingState | null): OnboardingStep {
  if (!state?.teamSize) return 'use-case'
  if (!state?.invitesSentAt) return 'invites'
  if (!state?.plan) return 'plan'

  return 'complete'
}

/**
 * The setup of the organization of the user: the organization that is being
 * set up, with the progress saved in it.
 */
export async function onboardingFor(user: User): Promise<Onboarding> {
  const memberships = await Membership.query()
    .where('userId', user.id)
    .preload('organization')
    .orderBy('createdAt', 'asc')

  const organizations = memberships.map((membership) => membership.organization)

  /**
   * A user without an organization starts at the first step: the details of
   * the organization that is about to be created.
   */
  if (organizations.length === 0) {
    return { organization: null, state: null, step: 'details' }
  }

  const organization = organizations.find((entry) => !entry.onboardedAt)

  /**
   * Every organization of the user is ready already: there is nothing left
   * to set up.
   */
  if (!organization) {
    return { organization: organizations[0], state: null, step: 'done' }
  }

  const state = organization.onboardingState ?? null

  return { organization, state, step: stepOf(state) }
}

/**
 * Saves the progress of the setup in the organization, so the user can come
 * back to the step he left.
 */
export async function saveProgress(
  organization: Organization,
  progress: Partial<OnboardingState>
): Promise<OnboardingState> {
  const state: OnboardingState = { ...(organization.onboardingState ?? {}), ...progress }

  organization.onboardingState = state
  await organization.save()

  return state
}

/**
 * The invitations that wait for the answer of the user, addressed to the
 * email address of their account.
 */
export async function pendingInvitationsFor(user: User): Promise<Invitation[]> {
  const invitations = await Invitation.query()
    .where('email', user.email)
    .whereNull('acceptedAt')
    .whereNull('revokedAt')
    .where('expiresAt', '>', new Date())
    .preload('organization')
    .orderBy('createdAt', 'desc')

  /**
   * An invitation of an organization the user already belongs to is of no
   * use: the membership is there already.
   */
  const memberships = await Membership.query().where('userId', user.id).select('organizationId')

  return invitations.filter(
    (invitation) =>
      !memberships.some((membership) => membership.organizationId === invitation.organizationId)
  )
}
