import { AiService } from '#services/ai'
import type { ToolDefinition } from '#tools/registry'
import { z } from 'zod'

/**
 * Writes a short text with the model of the `fast` alias.
 *
 * The call goes through the AI service, so the credits of the organization
 * are counted as they are for any other feature.
 */
export const generateTextTool: ToolDefinition = {
  name: 'generate_text',
  descriptionKey: 'chat.tools.generateText',
  schema: z.object({
    /** What the text has to say. */
    prompt: z.string().min(1).max(2000),
  }),
  minRole: 'member',
  scope: 'mcp:write',
  async execute(input, ctx) {
    const service = new AiService()

    const result = await service.generateText(
      { organization: ctx.organization, user: ctx.user, feature: 'chat.tool', alias: 'fast' },
      { prompt: input.prompt }
    )

    return { text: result.text, credits: result.credits }
  },
}
