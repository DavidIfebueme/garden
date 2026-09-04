import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { ChatTabsStrip } from '@/components/shell/chat-tabs'

/**
 * Chats surface layout: owns the thread tab strip for the composer home and
 * open threads (TanStack nests chats.$threadId under this route — the Outlet
 * renders the child).
 */
export const Route = createFileRoute('/_authenticated/_app/chats')({
  component: ChatsLayout,
})

function ChatsLayout() {
  const activeId = useRouterState({
    select: (s) => {
      const params = s.matches[s.matches.length - 1]?.params as
        | { threadId?: string }
        | undefined
      return params?.threadId ?? null
    },
  })
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatTabsStrip activeId={activeId} />
      <Outlet />
    </div>
  )
}
