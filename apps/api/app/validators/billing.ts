import { PLAN_INTERVALS } from '#models/plan_price'
import vine from '@vinejs/vine'

/**
 * The plan the user wants to buy and the interval it is paid with.
 */
export const checkoutValidator = vine.create({
  plan: vine
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/)
    .maxLength(60),
  interval: vine.enum(PLAN_INTERVALS),
})

/**
 * The plan the organization wants to move to.
 */
export const changePlanValidator = vine.create({
  plan: vine
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/)
    .maxLength(60),
  interval: vine.enum(PLAN_INTERVALS),
})

/**
 * How the subscription is canceled: right away or when the period ends.
 */
export const cancelValidator = vine.create({
  mode: vine.enum(['immediate', 'scheduled']).optional(),
})
