import vine from '@vinejs/vine'

/**
 * The sizes of the team the wizard offers.
 */
export const TEAM_SIZES = ['1', '2', '3', '4'] as const

/**
 * What an organization will use the product for.
 */
export const USE_CASES = ['content', 'support', 'data', 'assistant'] as const

/**
 * The intervals a plan can be paid with.
 */
export const INTERVALS = ['month', 'year'] as const

/**
 * The payload of the use case step: the size of the team and what the
 * organization will use the product for.
 */
export const useCaseValidator = vine.create({
  teamSize: vine.enum(TEAM_SIZES),
  useCase: vine.enum(USE_CASES),
})

/**
 * The payload of the invites step. The list is empty when the user skips the
 * step, and the addresses have to be different from each other.
 */
export const onboardingInvitesValidator = vine.create({
  emails: vine
    .array(vine.string().trim().email().maxLength(254))
    .maxLength(20)
    .distinct()
    .optional(),
})

/**
 * The payload of the plan step: the plan the user chose and the interval it
 * is paid with.
 */
export const onboardingPlanValidator = vine.create({
  plan: vine
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/)
    .maxLength(60),
  interval: vine.enum(INTERVALS),
})
