import {
  CaretLeft,
  CaretRight,
  SidebarSimple,
  SquaresFour,
} from '@phosphor-icons/react'
import type { ComponentType, ReactNode } from 'react'
import { cn } from '@garden/ui/lib/utils'

/**
 * App shell top bar — the 40px chrome strip above the content pane from the
 * redesign: sidebar toggle + (tabbable surfaces only) previous/next tab arrows.
 * The arrows move the ACTIVE TAB selection through the strip when tabs overflow
 * (designer decision 2026-09: no horizontal scrolling tab strip; arrows step
 * through tabs instead). They are not browser-history controls. The global "+"
 * from early passes stays dropped — each tabbable surface owns its "+" via
 * SurfaceTabs. Presentational only; the app wires behavior.
 */

export type AppTopBarProps = {
  onToggleSidebar: () => void
  onPrevious: () => void
  onNext: () => void
  canGoPrevious: boolean
  canGoNext: boolean
  /**
   * Tab arrows render only on tabbable surfaces (Chats, Tasks) — other
   * surfaces are single-page and get just the sidebar toggle.
   */
  showTabArrows?: boolean
  /** Right-side slot (e.g. the search trigger). */
  end?: ReactNode
  className?: string
}

export function AppTopBar({
  onToggleSidebar,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
  showTabArrows = false,
  end,
  className,
}: AppTopBarProps) {
  return (
    <div
      className={cn(
        'flex h-10 shrink-0 items-center gap-1 border-b border-border-default bg-background-main-default px-3',
        className,
      )}
    >
      <TopBarButton
        icon={SidebarSimple}
        label="Toggle sidebar"
        onClick={onToggleSidebar}
      />
      {showTabArrows ? (
        <>
          <TopBarButton
            icon={CaretLeft}
            label="Previous tab"
            onClick={onPrevious}
            disabled={!canGoPrevious}
          />
          <TopBarButton
            icon={CaretRight}
            label="Next tab"
            onClick={onNext}
            disabled={!canGoNext}
          />
        </>
      ) : null}
      <span
        aria-hidden="true"
        title="Mini apps — coming soon"
        className="ml-auto flex size-7 items-center justify-center text-icon-neutral-tertiary"
      >
        <SquaresFour className="size-4" />
      </span>
      {end ? <div className="ml-1 flex items-center">{end}</div> : null}
    </div>
  )
}

function TopBarButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex size-7 items-center justify-center rounded-sm text-icon-neutral-tertiary transition-colors hover:bg-background-main-secondary hover:text-icon-neutral-default disabled:pointer-events-none disabled:opacity-40"
    >
      <Icon className="size-4" />
    </button>
  )
}
