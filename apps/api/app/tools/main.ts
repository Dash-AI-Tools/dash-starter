import { aiUsageTool } from '#tools/ai_usage'
import { generateTextTool } from '#tools/generate_text'
import { listMembersTool } from '#tools/list_members'
import { organizationInfoTool } from '#tools/organization_info'
import { ToolRegistry } from '#tools/registry'

/**
 * The tools of the product.
 *
 * The chat and the MCP server read this registry, so a tool is defined once
 * and behaves the same on both surfaces.
 */
export const toolRegistry = new ToolRegistry()
  .register(organizationInfoTool)
  .register(listMembersTool)
  .register(aiUsageTool)
  .register(generateTextTool)
