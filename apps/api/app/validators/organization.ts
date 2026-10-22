import { ROLES } from '#models/membership'
import vine from '@vinejs/vine'

/**
 * The locales an organization can use by default.
 */
const LOCALES = ['en', 'es'] as const

/**
 * A URL slug: lowercase letters, numbers and single dashes.
 */
const slug = () =>
  vine
    .string()
    .trim()
    .minLength(2)
    .maxLength(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)

/**
 * The payload of the creation of an organization. The slug is optional: the
 * API suggests one built from the name.
 */
export const createOrganizationValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120),
  slug: slug().optional(),
})

/**
 * The payload of the update of an organization. Every field is optional, so
 * the form can send only what changed.
 */
export const updateOrganizationValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120).optional(),
  slug: slug().optional(),
  logoPath: vine.string().trim().maxLength(255).nullable().optional(),
  defaultLocale: vine.enum(LOCALES).optional(),
})

/**
 * The payload of the confirmation of the deletion of an organization: the
 * name of the organization has to be typed again.
 */
export const deleteOrganizationValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120),
})

/**
 * The payload of the transfer of the ownership of an organization.
 */
export const transferOwnershipValidator = vine.create({
  userId: vine.number().positive(),
})

/**
 * The payload of the change of the role of a member.
 */
export const changeRoleValidator = vine.create({
  role: vine.enum(ROLES),
})

/**
 * The payload of an invitation.
 */
export const createInvitationValidator = vine.create({
  email: vine.string().trim().email().maxLength(254),
  role: vine.enum(ROLES),
})

/**
 * The filters of the list of members. The search narrows the list down to the
 * members whose name or email address contains it.
 */
export const searchMembersValidator = vine.create({
  search: vine.string().trim().maxLength(200).optional(),
})
