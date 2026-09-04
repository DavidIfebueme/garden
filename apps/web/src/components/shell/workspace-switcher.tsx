import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@garden/ui/components/ui/dropdown-menu'
import { BrandIcon } from '@garden/ui/components/common/brand-icon'
import { cn } from '@garden/ui/lib/utils'
import type { Workspace } from '@garden/core/types'
import { Building2Icon, CheckIcon, ChevronDownIcon } from 'lucide-react'

/**
 * Workspace switcher — the sidebar header in the redesigned shell: logo +
 * workspace name + chevron opens the workspace list (switch/create). Replaces
 * the old pattern where workspace switching lived inside the account menu; the
 * bottom user card is account-only now (design feedback 2026-09).
 */
export function WorkspaceSwitcher({
  workspaceName,
  workspaces,
  currentWorkspaceId,
  collapsed,
  onSwitchWorkspace,
  onCreateWorkspace,
}: {
  workspaceName: string
  workspaces: Workspace[]
  currentWorkspaceId?: string | null
  collapsed?: boolean
  onSwitchWorkspace: (workspace: Workspace) => void
  onCreateWorkspace: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Switch workspace"
        className={cn(
          'flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left transition-colors hover:bg-background-main-secondary',
          collapsed && 'justify-center px-0',
        )}
      >
        <span className="flex size-6 shrink-0 items-center justify-center">
          <BrandIcon className="size-5" noSpin />
        </span>
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text-neutral-default">
              {workspaceName}
            </span>
            <ChevronDownIcon className="size-3.5 shrink-0 text-icon-neutral-tertiary" />
          </>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-56 rounded-lg"
        side="bottom"
        align="start"
        sideOffset={8}
      >
        <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Workspaces
        </DropdownMenuLabel>
        {workspaces.length > 0 ? (
          <div className="max-h-48 overflow-y-auto py-1">
            {workspaces.map((workspace) => {
              const active = workspace.id === currentWorkspaceId
              return (
                <DropdownMenuItem
                  key={workspace.id}
                  disabled={active}
                  onClick={() => onSwitchWorkspace(workspace)}
                >
                  <Building2Icon />
                  <span className="min-w-0 flex-1 truncate">
                    {workspace.name}
                  </span>
                  {active ? <CheckIcon className="ml-auto" /> : null}
                </DropdownMenuItem>
              )
            })}
          </div>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCreateWorkspace}>
          <Building2Icon />
          New workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
