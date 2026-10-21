import Membership from '#models/membership'
import Organization from '#models/organization'
import { availableSlug, slugify, slugTakenError } from '#services/organizations'
import MembershipTransformer from '#transformers/membership_transformer'
import { MembershipOrganizationTransformer } from '#transformers/organization_transformer'
import {
  createOrganizationValidator,
  deleteOrganizationValidator,
  transferOwnershipValidator,
  updateOrganizationValidator,
} from '#validators/organization'
import type { HttpContext } from '@adonisjs/core/http'
import { errors as VineErrors } from '@vinejs/vine'

export default class OrganizationController {
  /**
   * The organizations the caller belongs to, with the role they hold in each
   * one of them.
   */
  async index({ auth, serialize }: HttpContext) {
    const memberships = await Membership.query()
      .where('userId', auth.getUserOrFail().id)
      .preload('organization')
      .orderBy('createdAt', 'asc')

    return serialize.withoutWrapping({
      organizations: MembershipOrganizationTransformer.transform(memberships),
    })
  }

  /**
   * Creates an organization and makes the caller its owner.
   *
   * The slug is optional: when it is not given, one is built from the name.
   * A slug that is already in use is refused with a suggestion, so the user
   * does not have to guess a free one.
   */
  async store(ctx: HttpContext) {
    const { request, auth, response, serialize, i18n } = ctx
    const { name, slug } = await request.validateUsing(createOrganizationValidator)

    const wanted = slug ?? slugify(name)
    const taken = await Organization.query().where('slug', wanted).first()

    if (taken && slug) {
      throw slugTakenError(
        i18n.t('organizations.slug_taken', { suggestion: await availableSlug(wanted) })
      )
    }

    const organization = await Organization.create({
      name,
      slug: taken ? await availableSlug(wanted) : wanted,
      defaultLocale: i18n.locale,
    })

    const membership = await Membership.create({
      organizationId: organization.id,
      userId: auth.getUserOrFail().id,
      role: 'owner',
    })
    await membership.load('organization')

    /**
     * The new organization is the one the user lands on.
     */
    const user = auth.getUserOrFail()
    user.lastOrganizationId = organization.id
    await user.save()

    response.status(201)

    return serialize.withoutWrapping({
      organization: MembershipOrganizationTransformer.transform(membership),
    })
  }

  /**
   * Shows one organization, with the role the caller holds in it.
   */
  async show({ membership, serialize }: HttpContext) {
    return serialize.withoutWrapping({
      organization: MembershipOrganizationTransformer.transform(membership),
    })
  }

  /**
   * Updates the settings of an organization.
   */
  async update(ctx: HttpContext) {
    const { request, organization, membership, bouncer, serialize, i18n } = ctx

    await bouncer.authorize('updateOrganization', membership)

    const payload = await request.validateUsing(updateOrganizationValidator)

    if (payload.slug && payload.slug !== organization.slug) {
      const taken = await Organization.query().where('slug', payload.slug).first()

      if (taken) {
        throw slugTakenError(
          i18n.t('organizations.slug_taken', { suggestion: await availableSlug(payload.slug) })
        )
      }
    }

    organization.merge(payload)
    await organization.save()

    return serialize.withoutWrapping({
      organization: MembershipOrganizationTransformer.transform(membership),
    })
  }

  /**
   * Deletes an organization and all of its data.
   *
   * shortcut: the cancellation of the subscription arrives with the billing
   * group, when the payments of the organization exist.
   */
  async destroy(ctx: HttpContext) {
    const { request, organization, membership, bouncer, i18n } = ctx

    await bouncer.authorize('deleteOrganization', membership)

    const { name } = await request.validateUsing(deleteOrganizationValidator)

    if (name !== organization.name) {
      throw new VineErrors.E_VALIDATION_ERROR([
        {
          field: 'name',
          message: i18n.t('organizations.name_mismatch', { name: organization.name }),
          rule: 'name_mismatch',
        },
      ])
    }

    await organization.delete()

    return { success: true }
  }

  /**
   * Hands the ownership of the organization over to another member. The
   * caller becomes an admin.
   */
  async transfer(ctx: HttpContext) {
    const { request, organization, membership, bouncer, serialize, i18n } = ctx

    await bouncer.authorize('transferOwnership', membership)

    const { userId } = await request.validateUsing(transferOwnershipValidator)

    /**
     * Handing the ownership over to oneself would leave the organization
     * without an owner, because the caller becomes an admin right after.
     */
    if (Number(userId) === membership.userId) {
      throw new VineErrors.E_VALIDATION_ERROR([
        {
          field: 'userId',
          message: i18n.t('organizations.cannot_transfer_to_self'),
          rule: 'cannot_transfer_to_self',
        },
      ])
    }

    const target = await Membership.query()
      .where('organizationId', organization.id)
      .where('userId', userId)
      .preload('user')
      .firstOrFail()

    target.role = 'owner'
    await target.save()

    membership.role = 'admin'
    await membership.save()
    return serialize.withoutWrapping({
      member: MembershipTransformer.transform(target),
    })
  }
}
