import { useCallback, useMemo, useState } from 'react'
import {
  Outlet,
  useNavigate,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Result } from 'better-result'
import { toast } from 'sonner'
import { AppSidebar } from '@garden/ui/components/shell/app-sidebar'
import { AppTopBar } from '@garden/ui/components/shell/app-topbar'
import { Button } from '@garden/ui/components/ui/button'
import { Skeleton } from '@garden/ui/components/ui/skeleton'
import { useAuthStore } from '@garden/app-state/auth'
import { useWorkspaceStore } from '@garden/app-state/workspace'
import { deduplicateInboxItems, inboxListOptions } from '@/lib/inbox/queries'
import { workspaceListOptions } from '@/lib/workspace/queries'
import {
  agentListOptions,
  connectionListOptions,
  memberListOptions,
  skillListOptions,
} from '@/lib/workspace/queries'
import { useSettingsDialogStore } from '@/features/settings'
import { SettingsDialog } from '@/features/settings'
import { SearchCommand } from '@/features/search'
import { SearchTrigger } from '@/features/search'
import { ChatRuntimeProvider } from '@/features/chat/chat-runtime-provider'
import { CreateWorkspaceModal } from '@/features/modals/create-workspace'
import { NAV_ITEMS, navItemForPathname } from '@/features/navigation/nav-items'
import { UserCard } from './user-card'
import { WorkspaceSwitcher } from './workspace-switcher'

/**
 * Mount-only prefetch for workspace-wide caches (agents, members, skills,
 * connections) so dialogs/pickers read warm caches instead of cold-fetching on
 * open. Moved unchanged from the retired workspace-layout; still renders null.
 */
function WorkspaceWarmCaches({ wsId }: { wsId: string }) {
  useQuery(agentListOptions(wsId))
  useQuery(memberListOptions(wsId))
  useQuery(skillListOptions(wsId))
  useQuery(connectionListOptions(wsId))
  return null
}

function WorkspaceLoadingSkeleton() {
  return (
    <section
      className="flex h-full flex-1 flex-col gap-3 p-4"
      aria-label="Loading workspace"
      aria-busy="true"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="size-7 rounded-md" />
        <Skeleton className="h-3 w-40" />
      </div>
      <Skeleton className="h-9 w-full rounded-md" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-11/12 rounded-md" />
        <Skeleton className="h-4 w-10/12 rounded-md" />
        <Skeleton className="h-4 w-9/12 rounded-md" />
      </div>
    </section>
  )
}

function WorkspaceSetupState({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="flex h-full flex-1 items-center justify-center px-6">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="space-y-1.5">
          <h2 className="text-sm font-medium text-text-neutral-default">
            Create a workspace
          </h2>
          <p className="text-sm text-text-secondary">
            Your account is ready. Create a workspace or open an invitation link
            to join one.
          </p>
        </div>
        <Button size="sm" onClick={onCreate}>
          New workspace
        </Button>
      </div>
    </section>
  )
}

/**
 * The redesigned app shell: flat labeled sidebar + 40px top bar + routed
 * content pane (Penpot "Garden" file, 2026-09). Replaces the icon rail +
 * context rail + FlexLayout dock. All authenticated surfaces render as routes
 * inside the Outlet; chat runtime, search, settings dialog, and workspace
 * cache warming mount once here.
 */
export function AppShell() {
  const navigate = useNavigate()
  const router = useRouter()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const queryClient = useQueryClient()

  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const workspace = useWorkspaceStore((state) => state.workspace)
  const switchWorkspace = useWorkspaceStore((state) => state.switchWorkspace)
  const clearWorkspace = useWorkspaceStore((state) => state.clearWorkspace)
  const openSettingsDialog = useSettingsDialogStore((s) => s.openSettings)

  const [collapsed, setCollapsed] = useState(false)
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false)

  const workspaceId = workspace?.id ?? ''
  const workspaceListQuery = useQuery(workspaceListOptions())
  const { data: rawInboxItems = [] } = useQuery({
    ...inboxListOptions(workspaceId),
    enabled: !!workspaceId,
  })
  const unreadCount = useMemo(
    () =>
      deduplicateInboxItems(rawInboxItems).filter((item) => !item.read).length,
    [rawInboxItems],
  )

  const activeNavId = navItemForPathname(pathname)?.id ?? null

  const navItems = useMemo(
    () =>
      NAV_ITEMS.map((item) => ({
        ...item,
        badge: item.id === 'inbox' && unreadCount > 0 ? unreadCount : undefined,
      })),
    [unreadCount],
  )

  const handleSelectNav = useCallback(
    (id: string) => {
      const item = NAV_ITEMS.find((entry) => entry.id === id)
      if (item) void navigate({ to: item.to })
    },
    [navigate],
  )

  const handleSwitchWorkspace = useCallback(
    (nextWorkspace: NonNullable<typeof workspace>) => {
      if (nextWorkspace.id === workspace?.id) return
      void Result.tryPromise(() => switchWorkspace(nextWorkspace)).then(
        (result) =>
          result.tapBoth({
            ok: () => {
              queryClient.invalidateQueries()
              void navigate({ to: '/home' })
              toast.success(`Switched to ${nextWorkspace.name}`)
            },
            err: (error) => {
              toast.error(
                error instanceof Error
                  ? error.message
                  : 'Failed to switch workspace',
              )
            },
          }),
      )
    },
    [navigate, queryClient, switchWorkspace, workspace?.id],
  )

  const handleLogout = useCallback(async () => {
    const result = await Result.tryPromise(() => logout())
    if (Result.isError(result)) {
      toast.error(
        result.error instanceof Error
          ? result.error.message
          : 'Failed to sign out',
      )
      return
    }
    queryClient.clear()
    clearWorkspace()
    toast.success('Signed out')
    void navigate({ to: '/login' })
  }, [clearWorkspace, logout, queryClient, navigate])

  const hasSession = Boolean(user)
  const activeWorkspaceId = workspace?.id ?? null
  // Store hydration lands in a microtask after the first client frame; show a
  // neutral skeleton rather than the setup prompt while it resolves.
  const isRestoringWorkspace = !hasSession && !activeWorkspaceId

  return (
    <div className="flex h-svh bg-background-main-default">
      {activeWorkspaceId ? (
        <>
          <WorkspaceWarmCaches wsId={activeWorkspaceId} />
          <ChatRuntimeProvider>
            <AppSidebar
              header={
                <WorkspaceSwitcher
                  workspaceName={workspace?.name ?? 'Garden'}
                  workspaces={workspaceListQuery.data ?? []}
                  currentWorkspaceId={workspace?.id ?? null}
                  collapsed={collapsed}
                  onSwitchWorkspace={handleSwitchWorkspace}
                  onCreateWorkspace={() => setCreateWorkspaceOpen(true)}
                />
              }
              items={navItems}
              activeId={activeNavId}
              onSelect={handleSelectNav}
              collapsed={collapsed}
              onOpenSettings={openSettingsDialog}
              userCard={
                <UserCard
                  user={{
                    name: user?.name ?? 'Account',
                    email: user?.email ?? 'Signed out',
                    avatar: user?.avatar_url ?? null,
                  }}
                  collapsed={collapsed}
                  onAccount={openSettingsDialog}
                  onLogout={() => void handleLogout()}
                />
              }
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <AppTopBar
                onToggleSidebar={() => setCollapsed((value) => !value)}
                onBack={() => router.history.back()}
                onForward={() => router.history.forward()}
                canGoBack={router.history.canGoBack()}
                canGoForward
                end={<SearchTrigger />}
              />
              <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <Outlet />
              </main>
            </div>
            <SearchCommand />
            <SettingsDialog />
          </ChatRuntimeProvider>
        </>
      ) : (
        <main className="flex min-h-0 flex-1 flex-col">
          {isRestoringWorkspace ? (
            <WorkspaceLoadingSkeleton />
          ) : (
            <WorkspaceSetupState
              onCreate={() => setCreateWorkspaceOpen(true)}
            />
          )}
        </main>
      )}
      {createWorkspaceOpen ? (
        <CreateWorkspaceModal onClose={() => setCreateWorkspaceOpen(false)} />
      ) : null}
    </div>
  )
}
