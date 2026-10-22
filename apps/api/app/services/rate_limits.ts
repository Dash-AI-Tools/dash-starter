import type { HttpContext } from '@adonisjs/core/http'
import limiter from '@adonisjs/limiter/services/main'

/** Requests allowed per IP and window on every auth endpoint. */
const IP_REQUESTS = 30
const IP_WINDOW = '15 minutes'

/** Requests allowed per email and window on the endpoints that touch one address. */
const EMAIL_REQUESTS = 3
const EMAIL_WINDOW = '1 hour'

/** Failed logins allowed per email and window. */
const FAILED_LOGIN_REQUESTS = 5
const FAILED_LOGIN_WINDOW = '15 minutes'

/** Messages allowed per member and window in the chat. */
const CHAT_REQUESTS = 20
const CHAT_WINDOW = '1 minute'

/** Window of the budgets of the MCP server. */
const MCP_WINDOW = '1 minute'

/**
 * The limiters are created on demand: the manager caches them by
 * configuration, so every call returns the same instance.
 */
const ipLimiter = () => limiter.use({ requests: IP_REQUESTS, duration: IP_WINDOW })
const emailLimiter = () => limiter.use({ requests: EMAIL_REQUESTS, duration: EMAIL_WINDOW })
const failedLoginLimiter = () =>
  limiter.use({ requests: FAILED_LOGIN_REQUESTS, duration: FAILED_LOGIN_WINDOW })
const chatLimiter = () => limiter.use({ requests: CHAT_REQUESTS, duration: CHAT_WINDOW })
/**
 * The limiter of the MCP server depends on the plan of the organization, so
 * the manager keeps one for every limit it is asked for.
 */
const mcpLimiter = (requests: number) => limiter.use({ requests, duration: MCP_WINDOW })

/**
 * Normalizes an address, so `Ada@example.com` and `ada@example.com` share
 * the same budget.
 */
function addressKey(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Applies the per-IP budget shared by every auth endpoint.
 */
export async function consumeIpBudget(ctx: HttpContext): Promise<void> {
  await ipLimiter().consume(`auth:ip:${ctx.request.ip()}`)
}

/**
 * Applies the per-email budget of the endpoints that act on one address.
 */
export async function consumeEmailBudget(email: string): Promise<void> {
  await emailLimiter().consume(`auth:email:${addressKey(email)}`)
}

/**
 * Runs a login attempt and counts the failures. The address is blocked with
 * a 429 once the budget of failed logins is spent; a successful login resets
 * the counter.
 */
export async function penalizeFailedLogin<T>(
  email: string,
  callback: () => Promise<T>
): Promise<T> {
  const outcome = await failedLoginLimiter().penalize(
    `auth:failed-login:${addressKey(email)}`,
    callback
  )

  if (outcome[0]) {
    throw outcome[0]
  }

  return outcome[1]
}

/**
 * Applies the per-member budget of the chat, so one member cannot spend the
 * credits of the organization at once.
 */
export async function consumeChatBudget(userId: number): Promise<void> {
  await chatLimiter().consume(`chat:user:${userId}`)
}

/**
 * Applies the budgets of the MCP server: one for the key and one for the
 * organization, so a key cannot spend the whole allowance of the
 * organization at once.
 */
export async function consumeMcpBudget(
  keyId: number,
  organizationId: number,
  requests: number
): Promise<void> {
  const budget = mcpLimiter(requests)

  await budget.consume(`mcp:key:${keyId}`)
  await budget.consume(`mcp:org:${organizationId}`)
}
