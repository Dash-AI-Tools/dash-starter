import { E_MEMBERSHIP_NOT_FOUND } from '#exceptions/errors'
import Membership from '#models/membership'
import type Organization from '#models/organization'
import { assertAnotherOwner } from '#services/organizations'
import MembershipTransformer from '#transformers/membership_transformer'
import { changeRoleValidator } from '#validators/organization'
import type { HttpContext } from '@adonisjs/core/http'

export default class MemberController {
  /**
   * The members of the organization, with the role of each one of them.
   *
   * Every member of the organization can see the list: it is the directory
   * of their own organization. Changing or removing a member is a job of
   * the admins.
   */
  async index({ organization, serialize }: HttpContext) {
    const memberships = await organization
      .related('memberships')
      .query()
      .preload('user')
      .orderBy('createdAt', 'asc')

    return serialize.withoutWrapping({
      members: MembershipTransformer.transform(memberships),
    })
  }

  /**
   * Changes the role of a member. An admin cannot touch the owner of the
   * organization, and cannot hand the ownership over.
   */
  async update(ctx: HttpContext) {
    const { request, organization, membership, bouncer, serialize } = ctx

    const { role } = await request.validateUsing(changeRoleValidator)
    const member = await this.findMember(organization, ctx.params.userId)

    await bouncer.authorize('changeMemberRole', { actor: membership, member, role })

    /**
     * The organization always keeps an owner.
     */
    if (member.role === 'owner' && role !== 'owner') {
      await assertAnotherOwner(organization)
    }

    member.role = role
    await member.save()

    return serialize.withoutWrapping({
      member: MembershipTransformer.transform(member),
    })
  }

  /**
   * Removes a member of the organization. The member loses the access to the
   * data of the organization right away.
   */
  async destroy(ctx: HttpContext) {
    const { organization, membership, bouncer } = ctx

    const member = await this.findMember(organization, ctx.params.userId)

    await bouncer.authorize('removeMember', { actor: membership, member })

    if (member.role === 'owner') {
      await assertAnotherOwner(organization)
    }

    await member.delete()

    return { success: true }
  }

  /**
   * Leaves the organization. The last owner cannot leave it.
   */
  async leave(ctx: HttpContext) {
    const { organization, membership } = ctx

    if (membership.role === 'owner') {
      await assertAnotherOwner(organization)
    }

    await membership.delete()

    return { success: true }
  }

  /**
   * The membership of a member of the organization, looked up inside the
   * organization: a member of another organization is not found.
   */
  private async findMember(organization: Organization, userId: string) {
    const member = await Membership.query()
      .where('organizationId', organization.id)
      .where('userId', Number(userId))
      .preload('user')
      .first()

    if (!member) {
      throw new E_MEMBERSHIP_NOT_FOUND()
    }

    return member
  }
}
