import type { SupportedLocale } from '#app/locales'
import { hasRole, type Role } from '#models/membership'
import type Membership from '#models/membership'
import type Organization from '#models/organization'
import type User from '#models/user'
import { type z } from 'zod'

/**
 * Who is calling a tool, and what it is allowed to do.
 */
export type ToolContext = {
  /** The organization the tool acts on. */
  organization: Organization
  /**
   * The membership of the caller, with the role it holds in the organization.
   * An API key has no membership: the scopes of the key are what grant the
   * permission in that case.
   */
  membership?: Membership
  /**
   * The user that made the call. A key of an organization whose creator was
   * removed has none.
   */
  user: User | null
  /** The language the tool answers in. */
  locale: SupportedLocale
  /**
   * The scopes of the caller, when the call comes from an API key instead of
   * a member of the organization. The chat has no scopes: there, the role of
   * the member is what grants the permission.
   */
  scopes?: string[]
}

/**
 * A tool of the product: something the assistant can do on behalf of the
 * member that is talking to it.
 */
export type ToolDefinition = {
  /** The name the model calls the tool by. */
  name: string
  /** The key of the description of the tool in the `chat` catalog. */
  descriptionKey: string
  /** The shape of the arguments of the tool. */
  schema: z.ZodType
  /** The role the caller has to hold to use the tool. */
  minRole: Role
  /** The scope an API key has to hold to use the tool. */
  scope: string
  /** What the tool does. */
  execute: (input: any, ctx: ToolContext) => Promise<unknown>
}

/**
 * The result of a call to a tool.
 */
export type ToolOutcome =
  /** The tool did its job. */
  | { status: 'ok'; data: unknown }
  /**
   * The caller is not allowed to use the tool. The message is written for the
   * model, so it never carries data of the organization.
   */
  | {
      status: 'denied'
      code: 'E_TOOL_FORBIDDEN' | 'E_TOOL_SCOPE' | 'E_TOOL_UNKNOWN' | 'E_TOOL_INPUT'
      message: string
    }

/**
 * The tools of the product.
 *
 * Every tool is defined once and behaves the same on every surface: the chat
 * and the MCP server share this registry, so the permission of a tool is
 * enforced in one place.
 */
export class ToolRegistry {
  /** The tools of the registry, by name. */
  #tools = new Map<string, ToolDefinition>()

  /**
   * Adds a tool to the registry.
   */
  register(tool: ToolDefinition): this {
    this.#tools.set(tool.name, tool)
    return this
  }

  /**
   * Every tool of the registry.
   */
  all(): ToolDefinition[] {
    return [...this.#tools.values()]
  }

  /**
   * The tool of a name, when it exists.
   */
  get(name: string): ToolDefinition | undefined {
    return this.#tools.get(name)
  }

  /**
   * Calls a tool with the permissions of the caller.
   *
   * The permission is checked here and not inside the tool, so every surface
   * enforces the same rules: a caller that is not allowed to use a tool gets
   * a message for the model and no data of the organization.
   */
  async call(name: string, input: unknown, ctx: ToolContext): Promise<ToolOutcome> {
    const tool = this.#tools.get(name)

    if (!tool) {
      return {
        status: 'denied',
        code: 'E_TOOL_UNKNOWN',
        message: `There is no tool called "${name}".`,
      }
    }

    if (!ctx.membership && !ctx.scopes) {
      return {
        status: 'denied',
        code: 'E_TOOL_FORBIDDEN',
        message: 'The caller has no permissions in this organization.',
      }
    }

    if (ctx.membership && !hasRole(ctx.membership.role, tool.minRole)) {
      return {
        status: 'denied',
        code: 'E_TOOL_FORBIDDEN',
        message: `The role "${ctx.membership.role}" cannot use the tool "${tool.name}".`,
      }
    }

    if (ctx.scopes && !ctx.scopes.includes(tool.scope)) {
      return {
        status: 'denied',
        code: 'E_TOOL_SCOPE',
        message: `The scope "${tool.scope}" is needed to use the tool "${tool.name}".`,
      }
    }

    const parsed = tool.schema.safeParse(input)

    if (!parsed.success) {
      return {
        status: 'denied',
        code: 'E_TOOL_INPUT',
        message: `The arguments of the tool "${tool.name}" are not valid.`,
      }
    }

    return { status: 'ok', data: await tool.execute(parsed.data, ctx) }
  }
}
