import { test } from '@japa/runner'
import { Env, type errors as EnvErrors } from '@adonisjs/core/env'
import { envSchema } from '#start/env'

type EnvValidationException = InstanceType<typeof EnvErrors.E_INVALID_ENV_VARIABLES>

/**
 * A complete, valid environment. Tests override single keys to assert that
 * one missing or malformed value is enough to stop the boot.
 */
const validEnv: Record<string, string> = {
  NODE_ENV: 'development',
  PORT: '3333',
  HOST: 'localhost',
  LOG_LEVEL: 'info',
  APP_KEY: 'test-app-key',
  APP_URL: 'http://localhost:3333',
  WEB_URL: 'http://localhost:5173',
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_USER: 'dash',
  DB_PASSWORD: 'dash',
  DB_DATABASE: 'dash',
  SESSION_DRIVER: 'cookie',
  DEFAULT_LOCALE: 'en',
  MAIL_TRANSPORT: 'smtp',
  MAIL_FROM: 'Dash <no-reply@dash-starter.test>',
  CREEM_ENV: 'test',
  AI_PROVIDER: 'stub',
  DRIVE_DISK: 'local',
  LIMITER_STORE: 'memory',
}

/**
 * Validate a plain object against the env schema. The `optionalWhen` rules
 * read `process.env` lazily, so the values under test are published there.
 */
function validate(values: Record<string, string>) {
  const original = { ...process.env }

  for (const key of Object.keys(process.env)) {
    if (key in envSchema) delete process.env[key]
  }
  Object.assign(process.env, values)

  try {
    return Env.rules(envSchema).validate(values)
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!(key in original)) delete process.env[key]
    }
    Object.assign(process.env, original)
  }
}

/**
 * Run the validation and return the raised error, so the tests can assert on
 * the message naming the offending variable.
 */
function validationError(values: Record<string, string>) {
  try {
    validate(values)
  } catch (error) {
    return error as EnvValidationException
  }
  throw new Error('Expected the environment validation to fail')
}

test.group('Env validation', () => {
  test('boots with a complete environment', ({ assert }) => {
    const values = validate(validEnv)
    assert.equal(values.APP_KEY.release(), 'test-app-key')
    assert.equal(values.MAIL_TRANSPORT, 'smtp')
  })

  test('fails without APP_KEY', ({ assert }) => {
    const values = { ...validEnv }
    delete values.APP_KEY

    assert.include(validationError(values).help, 'APP_KEY')
  })

  test('fails in production without BREVO_API_KEY', ({ assert }) => {
    const values = { ...validEnv, NODE_ENV: 'production' }

    assert.include(validationError(values).help, 'BREVO_API_KEY')
  })

  test('accepts production with BREVO_API_KEY', ({ assert }) => {
    const values = {
      ...validEnv,
      NODE_ENV: 'production',
      MAIL_TRANSPORT: 'brevo',
      BREVO_API_KEY: 'brevo-key',
    }

    const validated = validate(values)
    assert.equal(validated.BREVO_API_KEY, 'brevo-key')
  })

  test('fails on a malformed value', ({ assert }) => {
    const values = { ...validEnv, PORT: 'not-a-number' }

    assert.include(validationError(values).help, 'PORT')
  })
})
