import { createFileRoute } from '@tanstack/react-router'
import { useSurfaceTabsStore } from '@garden/app-state/surface-tabs'
import { AgentInteractionScreen } from '@/features/chat/components/agent-interaction-screen'

export const Route = createFileRoute('/_authenticated/_app/chats/$threadId')({
  // Client-only tab bookkeeping on direct loads; the strip (parent layout)
  // resolves the real title live from the sessions query cache.
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
    <AgentInteractionScreen
      className="min-h-0 flex-1 bg-background"
      sessionId={threadId}
    />
  )
}
