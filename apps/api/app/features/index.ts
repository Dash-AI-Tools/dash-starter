import type Router from '@adonisjs/core/services/router'
// features:imports

/**
 * The routes of the features of the product, registered inside the `/api/v1`
 * group of `start/routes.ts`.
 *
 * This file is owned by the product, not by the template: a core update never
 * replaces it. `npm run make:feature <name>` adds the import and the call of a
 * new feature through the markers, so keep them in place.
 */
export function registerFeatureRoutes(router: typeof Router) {
  router.group(() => {
    // features:register
  })
}
