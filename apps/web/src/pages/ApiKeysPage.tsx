import { useParams } from 'react-router'
import { ApiKeysSettings } from '@/components/api-keys/api-keys-settings'

/**
 * The API keys of the organization: the credentials an external agent uses to
 * reach the MCP server.
 */
export default function ApiKeysPage() {
  const { orgSlug = '' } = useParams()

  return <ApiKeysSettings orgSlug={orgSlug} />
}
