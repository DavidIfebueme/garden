import type { ComponentType, ReactNode } from 'react'
import { cn } from '@garden/ui/lib/utils'

/**
 * App shell top bar — the 40px chrome strip above the content pane from the
 * redesign: sidebar toggle, history back/forward. The global "+" from early
 * design passes was intentionally dropped (designer decision 2026-09): tabs are
 * surface-scoped (Chats, Tasks) and each owns its "+" via SurfaceTabs.
 * Presentational only; navigation behavior is wired by the app.
 */

export type AppTopBarProps = {
  onToggleSidebar: () => void
  onBack: () => void
  onForward: () => void
  canGoBack: boolean
  canGoForward: boolean
  /** Right-side slot (e.g. the search trigger). */
  end?: ReactNode
  className?: string
}

export function AppTopBar({
  onToggleSidebar,
  onBack,
  onForward,
  canGoBack,
  canGoForward,
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
        icon={PanelLeftIcon}
        label="Toggle sidebar"
        onClick={onToggleSidebar}
      />
      <TopBarButton
        icon={ArrowLeftIcon}
        label="Back"
        onClick={onBack}
        disabled={!canGoBack}
      />
      <TopBarButton
        icon={ArrowRightIcon}
        label="Forward"
        onClick={onForward}
        disabled={!canGoForward}
      />
      {end ? <div className="ml-auto flex items-center">{end}</div> : null}
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

function PanelLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect
        x="1.5"
        y="2.5"
        width="13"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M6 2.5v11" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M10 3 5 8l5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="m6 3 5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
