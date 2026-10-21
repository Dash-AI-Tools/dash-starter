import { test } from '@japa/runner'
import vine from '@vinejs/vine'
import { localizedText } from '#validators/localized_text_rule'

const validator = vine.create({
  name: vine.record(vine.string()).use(localizedText()),
})
/**
 * The rule rejects the value by throwing, so the error is caught instead of
 * being reported as a failed validation.
 */
async function validate(value: unknown) {
  try {
    await validator.validate({ name: value })
    return null
  } catch (error) {
    return error as Error
  }
}

test.group('localizedText rule', () => {
  test('accepts an object with every supported locale', async ({ assert }) => {
    const result = await validator.validate({ name: { en: 'Pro', es: 'Pro' } })

    assert.deepEqual(result.name, { en: 'Pro', es: 'Pro' })
  })

  test('rejects a missing locale', async ({ assert }) => {
    const error = await validate({ en: 'Pro' })

    assert.isNotNull(error)
    assert.include(error!.message, 'es')
  })

  test('rejects an empty translation', async ({ assert }) => {
    const error = await validate({ en: 'Pro', es: '  ' })

    assert.isNotNull(error)
  })

  test('rejects an unsupported locale', async ({ assert }) => {
    const error = await validate({ en: 'Pro', es: 'Pro', fr: 'Pro' })

    assert.isNotNull(error)
    assert.include(error!.message, 'fr')
  })

  test('rejects a value that is not an object', async ({ assert }) => {
    const error = await validate('Pro')

    assert.isNotNull(error)
  })
})
