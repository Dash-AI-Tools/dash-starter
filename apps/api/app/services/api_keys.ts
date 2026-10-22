import { E_API_KEY_NOT_FOUND } from '#exceptions/errors'
import ApiKey from '#models/api_key'
import Organization from '#models/organization'
import User from '#models/user'
import { AccessToken, DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { Secret } from '@adonisjs/core/helpers'
import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'

/**
 * The prefix of the secrets of the keys, so a leaked one is easy to spot.
 */
export const API_KEY_PREFIX = 'dash_'

/**
 * The bucket of the tokens of the MCP server.
 */
export const API_KEY_TYPE = 'mcp'

/**
 * The scopes a key can hold. A key that reads the data of the organization
 * needs `mcp:read`, and a key that writes needs `mcp:write`.
 */
export const API_KEY_SCOPES = ['mcp:read', 'mcp:write'] as const

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number]

/**
 * The provider of the framework, attached to the organization: it hashes the
 * secret of a key, verifies it and keeps the scopes of the key as its
 * abilities.
 */
const provider = new DbAccessTokensProvider({
  tokenableModel: Organization,
  table: 'api_keys',
  type: API_KEY_TYPE,
  prefix: API_KEY_PREFIX,
})

/**
 * Creates a key for the organization and answers with the secret, which is
 * shown to the admin only once.
 */
export async function createApiKey(
  organization: Organization,
  creator: User,
  input: { name: string; scopes: string[]; expiresAt?: DateTime | null }
): Promise<{ key: ApiKey; secret: string }> {
  const token = await provider.create(organization, input.scopes, {
    name: input.name,
    expiresIn: expiresInOf(input.expiresAt),
  })

  const prefix = `${API_KEY_PREFIX}${randomBytes(4).toString('hex')}`

  /**
   * The provider writes the columns it knows about, so the prefix and the
   * creator of the key are written right after it.
   */
  const id = Number(token.identifier)

  await ApiKey.query().where('id', id).update({
    prefix,
    createdById: creator.id,
  })

  const key = await ApiKey.findOrFail(id)

  return { key, secret: token.value!.release() }
}

/**
 * The keys of the organization, the newest first.
 */
export function listApiKeys(organization: Organization): Promise<ApiKey[]> {
  return ApiKey.query()
    .where('tokenableId', organization.id)
    .where('type', API_KEY_TYPE)
    .orderBy('createdAt', 'desc')
}

/**
 * Revokes a key, so the clients that hold it stop working right away.
 */
export async function revokeApiKey(organization: Organization, id: number): Promise<ApiKey> {
  const key = await ApiKey.query().where('tokenableId', organization.id).where('id', id).first()

  if (!key) {
    throw new E_API_KEY_NOT_FOUND()
  }

  key.revokedAt = DateTime.now()
  await key.save()

  return key
}

/**
 * The organization and the key a secret belongs to.
 *
 * A key that was revoked, that expired or that does not exist has no
 * organization: the caller answers with a 401 and no tool runs.
 */
export async function verifyApiKey(secret: string) {
  const decoded = AccessToken.decode(API_KEY_PREFIX, secret)

  if (!decoded) {
    return null
  }

  const key = await ApiKey.query()
    .where('id', decoded.identifier)
    .where('type', API_KEY_TYPE)
    .whereNull('revokedAt')
    .first()

  if (!key) {
    return null
  }

  const token = await provider.verify(new Secret(secret))

  if (!token) {
    return null
  }

  const organization = await Organization.find(key.tokenableId)

  if (!organization) {
    return null
  }

  const creator = key.createdById ? await User.find(key.createdById) : null

  return { organization, key, creator, scopes: token.abilities }
}

/**
 * The seconds left until the key expires, when it expires at all.
 */
function expiresInOf(expiresAt?: DateTime | null): number | undefined {
  if (!expiresAt) {
    return undefined
  }

  const seconds = Math.floor((expiresAt.toMillis() - Date.now()) / 1000)

  return seconds > 0 ? seconds : 1
}
