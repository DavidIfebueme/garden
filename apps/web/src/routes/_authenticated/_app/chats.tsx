import { createFileRoute } from '@tanstack/react-router'
import { AgentInteractionScreen } from '@/features/chat/components/agent-interaction-screen'
import { ChatTabsStrip } from '@/components/shell/chat-tabs'

export const Route = createFileRoute('/_authenticated/_app/chats')({
  component: ChatsRoute,
})

function ChatsRoute() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatTabsStrip activeId={null} />
      <AgentInteractionScreen className="min-h-0 flex-1 bg-background" />
    </div>
  )
}
