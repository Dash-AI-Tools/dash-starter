import { test } from '@japa/runner'
import { EntitlementService } from '#services/entitlements'

test.group('The limits of the plan', () => {
  test('allows a usage that fits in the limit', ({ assert }) => {
    assert.isTrue(EntitlementService.allows(10, 7))
    assert.isTrue(EntitlementService.allows(10, 10))
  })

  test('refuses a usage that does not fit in the limit', ({ assert }) => {
    assert.isFalse(EntitlementService.allows(10, 11))
  })

  test('never refuses a usage when the limit does not exist', ({ assert }) => {
    assert.isTrue(EntitlementService.allows(-1, 0))
    assert.isTrue(EntitlementService.allows(-1, 1000))
  })
})
