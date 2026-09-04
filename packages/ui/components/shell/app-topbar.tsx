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
 * Controls are gray.100-filled blocks per the design (Penpot "Garden": top-bar
 * buttons are background.main.secondary fills with gray.400 icons), not
 * transparent ghosts. The arrows move the ACTIVE TAB selection through the
 * strip when tabs overflow (no horizontal scrolling strip). The global "+"
 * stays dropped — each tabbable surface owns its "+" via SurfaceTabs. The
 * squares-four grid icon is intentionally inert until Mini Apps lands.
 * Presentational only; the app wires behavior.
 */

export type AppTopBarProps = {
  onToggleSidebar: () => void
  onPrevious: () => void
  onNext: () => void
  canGoPrevious: boolean
  canGoNext: boolean
  /** Tab arrows render only on tabbable surfaces (Chats, Tasks). */
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
        'flex h-10 shrink-0 items-stretch border-b border-border-default bg-background-main-default',
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
        className="ml-auto flex w-10 items-center justify-center self-stretch bg-background-main-secondary text-text-tertiary"
      >
        <SquaresFour className="size-4" />
      </span>
      {end ? <div className="flex items-center px-1.5">{end}</div> : null}
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
      className="flex w-10 cursor-pointer items-center justify-center self-stretch bg-background-main-secondary text-text-tertiary transition-colors hover:bg-background-main-secondary-hover hover:text-icon-neutral-default disabled:pointer-events-none disabled:opacity-40"
    >
      <Icon className="size-4" />
    </button>
  )
}
