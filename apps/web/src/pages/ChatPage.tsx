import { useParams } from 'react-router'
import { ChatPanel } from '@/components/chat/chat-panel'

/**
 * The chat of an organization: the assistant the members talk to.
 */
export default function ChatPage() {
  const { orgSlug = '' } = useParams()

  return <ChatPanel orgSlug={orgSlug} />
}
