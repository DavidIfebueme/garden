import { Plus, X } from '@phosphor-icons/react'
import type { ComponentType, ReactNode } from 'react'
import { cn } from '@garden/ui/lib/utils'

/**
 * Surface-scoped tab strip (Chats, Tasks) — sits at the top of the content
 * pane, below the AppTopBar. Replaces the retired global FlexLayout dock:
 * instead of app-wide tabs, only surfaces that opted in render this strip and
 * own their tab state and their "+" action (designer decision 2026-09).
 *
 * Active tab reads as the current surface: subtle secondary fill + default
 * text; idle tabs are quiet text with a hover wash. Presentational only.
 */

export type SurfaceTab = {
  id: string
  title: string
  icon?: ComponentType<{ className?: string }>
}

export type SurfaceTabsProps = {
  tabs: SurfaceTab[]
  activeId: string | null
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onNew: () => void
  /** Accessible label + tooltip for the "+" button, e.g. "New chat". */
  newLabel: string
  /** Optional trailing content (e.g. a session-browser trigger). */
  end?: ReactNode
  className?: string
}

export function SurfaceTabs({
  tabs,
  activeId,
  onSelect,
  onClose,
  onNew,
  newLabel,
  end,
  className,
}: SurfaceTabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex h-9 shrink-0 items-center gap-1 overflow-hidden border-b border-border-default bg-background-main-default px-2',
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId
        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={active}
            className={cn(
              'group flex h-7 max-w-48 items-center gap-1.5 rounded-sm pr-1 pl-2.5 text-sm transition-colors',
              active
                ? 'bg-background-main-secondary font-medium text-text-neutral-default'
                : 'text-text-secondary hover:bg-background-main-secondary-hover hover:text-text-neutral-default',
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(tab.id)}
              className="flex min-w-0 items-center gap-1.5 outline-none"
            >
              {tab.icon ? (
                <tab.icon className="size-3.5 shrink-0 text-icon-neutral-tertiary" />
              ) : null}
              <span className="truncate">{tab.title}</span>
            </button>
            <button
              type="button"
              onClick={() => onClose(tab.id)}
              aria-label={`Close ${tab.title}`}
              className={cn(
                'flex size-4 shrink-0 items-center justify-center rounded-xs text-icon-neutral-tertiary transition-opacity hover:bg-background-main-tertiary hover:text-icon-neutral-default',
                active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              )}
            >
              <X className="size-2.5" />
            </button>
          </div>
        )
      })}
      <button
        type="button"
        onClick={onNew}
        aria-label={newLabel}
        title={newLabel}
        className="ml-1 flex size-6 shrink-0 items-center justify-center rounded-sm text-icon-neutral-tertiary transition-colors hover:bg-background-main-secondary hover:text-icon-neutral-default"
      >
        <Plus className="size-3" />
      </button>
      {end}
    </div>
  )
}
