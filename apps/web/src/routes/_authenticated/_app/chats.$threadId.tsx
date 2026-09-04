import { createFileRoute } from '@tanstack/react-router'
import { useSurfaceTabsStore } from '@garden/app-state/surface-tabs'
import { AgentInteractionScreen } from '@/features/chat/components/agent-interaction-screen'
import { ChatTabsStrip } from '@/components/shell/chat-tabs'

export const Route = createFileRoute('/_authenticated/_app/chats/$threadId')({
  // Same client-only tab bookkeeping as tasks.$issueId: record the open thread
  // on direct loads; the strip resolves the real title live from the sessions
  // query cache.
  loader: ({ params }) => {
    if (typeof window === 'undefined') return
    useSurfaceTabsStore
      .getState()
      .upsertTab('chats', { id: params.threadId, title: 'Chat' })
  },
  component: ChatThreadRoute,
})

function ChatThreadRoute() {
  const { threadId } = Route.useParams()
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatTabsStrip activeId={threadId} />
      <AgentInteractionScreen
        className="min-h-0 flex-1 bg-background"
        sessionId={threadId}
      />
    </div>
  )
}
