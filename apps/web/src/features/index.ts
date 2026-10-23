import type { RouteObject } from 'react-router'
import type { NavItem } from '@/lib/nav'
// features:imports

/**
 * The pages of the features of the product, mounted under `/app/:orgSlug`
 * next to the pages of the core.
 *
 * This file is owned by the product, not by the template: a core update never
 * replaces it. `npm run make:feature <name>` adds the import and the entries
 * of a new feature through the markers, so keep them in place.
 */
export const featureRoutes: RouteObject[] = [
  // features:routes
]

/**
 * The destinations of the features, appended to the main group of the
 * navigation in the order they are declared.
 */
export const featureNav: NavItem[] = [
  // features:nav
]
