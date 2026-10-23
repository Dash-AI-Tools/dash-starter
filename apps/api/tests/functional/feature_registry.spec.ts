import { test } from '@japa/runner'

/**
 * The features of the product register their routes through
 * `app/features/index.ts`, inside the `/api/v1` group of `start/routes.ts`.
 *
 * The template ships the registry empty, so the core side pins only that no
 * route exists until a feature exports it. The generator emits the functional
 * test of each feature, which proves that its endpoint is served.
 */
test.group('Feature registry', () => {
  test('a path that no feature exports is not found under /api/v1', async ({ client }) => {
    const response = await client.get('/api/v1/feature-probe')

    response.assertStatus(404)
  })
})
