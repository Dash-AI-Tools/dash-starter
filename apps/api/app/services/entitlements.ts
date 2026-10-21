import type Organization from '#models/organization'
import { FREE_PLAN_SEATS } from '#services/organizations'

/**
 * The limits of the plan of an organization.
 *
 * shortcut: the plans arrive with the billing group, so every organization
 * has the limits of the free plan for now. The reader of the plan replaces
 * this body and the rest of the code keeps working.
 */
export function entitlements(_organization: Organization): { seats: number } {
  return { seats: FREE_PLAN_SEATS }
}
