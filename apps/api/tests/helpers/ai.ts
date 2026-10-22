import { buildAiRegistry } from '#config/ai'
import type { AiRegistry } from '#config/ai'
import Membership from '#models/membership'
import Organization from '#models/organization'
import User from '#models/user'
import { MockImageModelV4, MockLanguageModelV4 } from 'ai/test'
import { DateTime } from 'luxon'

/**
 * The registry the tests use: the stub provider and a short timeout.
 */
export function stubRegistry(): AiRegistry {
  return buildAiRegistry({
    nodeEnv: 'test',
    provider: 'stub',
    aliases: {},
    keys: {},
    timeoutMs: 1_000,
  })
}

/**
 * A member with a confirmed email address.
 */
export async function createMember(email = 'ada@example.com') {
  return User.create({
    fullName: 'Ada Lovelace',
    email,
    password: 'supersecret',
    locale: 'en',
    termsVersion: '2026-01-01',
    emailVerifiedAt: DateTime.now(),
  })
}

/**
 * An organization with an owner.
 */
export async function createOrganization(owner: User, name = 'Acme Labs') {
  const organization = await Organization.create({
    name,
    slug: `${name.toLowerCase().replaceAll(' ', '-')}-${owner.id}`,
    defaultLocale: 'en',
  })

  await Membership.create({
    organizationId: organization.id,
    userId: owner.id,
    role: 'owner',
  })

  return organization
}

/**
 * A model that answers with a text and a number of tokens.
 */
export function mockModel(tokens: { input: number; output: number } = { input: 0, output: 0 }) {
  return new MockLanguageModelV4({
    provider: 'mock',
    modelId: 'mock',
    doGenerate: async () => ({
      content: [{ type: 'text' as const, text: 'The answer of the mock' }],
      finishReason: { unified: 'stop' as const, raw: 'stop' },
      usage: {
        inputTokens: { total: tokens.input, noCache: tokens.input, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: tokens.output, text: tokens.output, reasoning: 0 },
      },
      warnings: [],
    }),
  })
}

/**
 * A model that always fails, as a provider that is down would do.
 */
export function failingModel() {
  return new MockLanguageModelV4({
    provider: 'mock',
    modelId: 'mock',
    doGenerate: async () => {
      throw new Error('The provider is down')
    },
  })
}

/**
 * A model that draws a placeholder image.
 */
export function mockImageModel() {
  return new MockImageModelV4({
    provider: 'mock',
    modelId: 'mock',
    doGenerate: async () => ({
      images: [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
      warnings: [],
      response: { timestamp: new Date(), modelId: 'mock', headers: undefined },
    }),
  })
}
