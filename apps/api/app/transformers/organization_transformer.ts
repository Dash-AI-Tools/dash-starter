import type Membership from '#models/membership'
import type Organization from '#models/organization'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * An organization, as the settings and the switcher show it.
 */
export default class OrganizationTransformer extends BaseTransformer<Organization> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'name',
      'slug',
      'logoPath',
      'defaultLocale',
      'onboardedAt',
      'createdAt',
      'updatedAt',
    ])
  }
}

/**
 * An organization of the user, with the role the user holds in it.
 */
export class MembershipOrganizationTransformer extends BaseTransformer<Membership> {
  toObject() {
    return {
      ...new OrganizationTransformer(this.resource.organization).toObject(),
      role: this.resource.role,
    }
  }
}
