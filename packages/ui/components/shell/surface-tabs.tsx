import { Plus, X } from '@phosphor-icons/react'
import type { ComponentType, ReactNode } from 'react'
import { cn } from '@garden/ui/lib/utils'

/**
 * Surface-scoped tab strip (Chats, Tasks) — sits at the top of the content
 * pane, below the AppTopBar. Replaces the retired global FlexLayout dock:
 * instead of app-wide tabs, only surfaces that opted in render this strip and
 * own their tab state and their "+" action.
 *
 * Styling per the design (Penpot "Garden" TabItem boards): inactive tabs are
 * background.main.secondary (gray.100) blocks flush to the 40px strip with
 * gray.500 labels; the active tab is white with a hairline top/side border and
 * punches through the strip's bottom rail into the content. No horizontal
 * scroll — the top-bar arrows step the selection when tabs overflow.
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
        'flex h-10 shrink-0 items-stretch border-b border-border-default bg-background-main-default',
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
              'group relative flex w-36 min-w-0 items-stretch text-sm',
              active
                ? 'z-10 -mb-px border-x border-t border-border-default bg-background-main-default font-medium text-text-neutral-default'
                : 'bg-background-main-secondary text-text-secondary hover:bg-background-main-secondary-hover hover:text-text-neutral-default',
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(tab.id)}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 px-2.5 outline-none"
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
                'flex w-6 shrink-0 cursor-pointer items-center justify-center text-icon-neutral-tertiary transition-opacity hover:text-icon-neutral-default',
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
        className="flex w-10 shrink-0 cursor-pointer items-center justify-center self-stretch bg-background-main-secondary text-text-tertiary transition-colors hover:bg-background-main-secondary-hover hover:text-icon-neutral-default"
      >
        <Plus className="size-3.5" />
      </button>
      {end ? (
        <div className="ml-auto flex items-center px-1.5">{end}</div>
      ) : null}
    </div>
  )
}
