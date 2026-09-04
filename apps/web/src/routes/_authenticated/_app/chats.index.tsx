import { createFileRoute } from '@tanstack/react-router'
import { AgentInteractionScreen } from '@/features/chat/components/agent-interaction-screen'

export const Route = createFileRoute('/_authenticated/_app/chats/')({
  component: ChatsIndexRoute,
})

function ChatsIndexRoute() {
  return <AgentInteractionScreen className="min-h-0 flex-1 bg-background" />
}
