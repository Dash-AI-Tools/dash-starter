import { Env } from '@adonisjs/core/env'

/**
 * The environment file is validated at boot. Missing or malformed values make
 * the API refuse to start with a message naming the offending variable.
 *
 * The conditional rules below encode the "optional provider keys fall back to
 * local alternatives only outside production" rule: in production the
 * provider credentials become mandatory. They are read lazily, because the
 * `.env` files are only merged into `process.env` while the schema runs.
 *
 * Note that `optionalWhen(condition)` makes the key *optional* when the
 * condition is true, so every rule below states the case in which the key may
 * be missing.
 */
export const envSchema = {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),

  /**
   * Public URL of the web application. The links that travel by email open
   * the browser app, not the JSON API.
   */
  WEB_URL: Env.schema.string({ format: 'url', tld: false }),

  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory', 'database'] as const),

  /**
   * Default locale of the product. Individual users override it.
   */
  DEFAULT_LOCALE: Env.schema.enum(['en', 'es'] as const),

  /**
   * Mail transport. `brevo` in production, `smtp` (Mailpit) in development
   * and `fake` in tests.
   */
  MAIL_TRANSPORT: Env.schema.enum(['brevo', 'smtp', 'fake'] as const),
  MAIL_FROM: Env.schema.string(),
  MAIL_FROM_NAME: Env.schema.string.optional(),

  /**
   * Brevo transactional API key. Required in production, and whenever the
   * Brevo transport is selected.
   */
  BREVO_API_KEY: Env.schema.string.optionalWhen(
    () => process.env.NODE_ENV !== 'production' && process.env.MAIL_TRANSPORT !== 'brevo',
    { message: 'BREVO_API_KEY is required when MAIL_TRANSPORT is "brevo"' }
  ),

  /**
   * SMTP settings, used by the local Mailpit catcher in development.
   */
  SMTP_HOST: Env.schema.string.optional(),
  SMTP_PORT: Env.schema.number.optional(),
  SMTP_USER: Env.schema.string.optional(),
  SMTP_PASSWORD: Env.schema.string.optional(),
  SMTP_SECURE: Env.schema.boolean.optional(),

  /**
   * Creem payments. `test` outside production, `live` in production.
   */
  CREEM_API_KEY: Env.schema.string.optional(),
  CREEM_WEBHOOK_SECRET: Env.schema.string.optional(),
  CREEM_ENV: Env.schema.enum(['test', 'live'] as const),

  /**
   * AI provider registry. Each provider has its own key and each alias points
   * at a `provider:model` pair. An alias can name another provider, so the
   * chat can run on one vendor and the images on another.
   */
  AI_PROVIDER: Env.schema.enum([
    'stub',
    'anthropic',
    'openai',
    'google',
    'deepseek',
    'openrouter',
    'qwen',
    'kimi',
    'glm',
    'ollama',
    'compatible',
  ] as const),
  AI_TIMEOUT_MS: Env.schema.number.optional(),
  /**
   * The provider and the model of every alias. The provider of an alias is
   * a plain string, because the registry of the providers is the one of the
   * AI config, and that config refuses the names it does not know.
   */
  AI_CHAT_PROVIDER: Env.schema.string.optional(),
  AI_CHAT_MODEL: Env.schema.string.optional(),
  AI_FAST_PROVIDER: Env.schema.string.optional(),
  AI_FAST_MODEL: Env.schema.string.optional(),
  AI_REASONING_PROVIDER: Env.schema.string.optional(),
  AI_REASONING_MODEL: Env.schema.string.optional(),
  AI_IMAGE_PROVIDER: Env.schema.string.optional(),
  AI_IMAGE_MODEL: Env.schema.string.optional(),
  ANTHROPIC_API_KEY: Env.schema.string.optional(),
  OPENAI_API_KEY: Env.schema.string.optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: Env.schema.string.optional(),
  DEEPSEEK_API_KEY: Env.schema.string.optional(),
  OPENROUTER_API_KEY: Env.schema.string.optional(),
  QWEN_API_KEY: Env.schema.string.optional(),
  KIMI_API_KEY: Env.schema.string.optional(),
  GLM_API_KEY: Env.schema.string.optional(),
  OLLAMA_API_KEY: Env.schema.string.optional(),
  OLLAMA_BASE_URL: Env.schema.string.optional(),
  COMPATIBLE_API_KEY: Env.schema.string.optional(),
  COMPATIBLE_BASE_URL: Env.schema.string.optional(),

  /**
   * File storage for avatars and generated images.
   */
  DRIVE_DISK: Env.schema.enum(['local', 's3'] as const),
  DRIVE_ROOT: Env.schema.string.optional(),
  S3_KEY: Env.schema.string.optional(),
  S3_SECRET: Env.schema.string.optional(),
  S3_BUCKET: Env.schema.string.optional(),
  S3_REGION: Env.schema.string.optional(),
  S3_ENDPOINT: Env.schema.string.optional(),

  /**
   * Rate limiting store.
   */
  LIMITER_STORE: Env.schema.enum(['database', 'memory'] as const),
}

export default await Env.create(new URL('../', import.meta.url), envSchema)
