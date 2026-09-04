import { cn } from '@garden/ui/lib/utils'
import { IconSearch } from '@tabler/icons-react'
import { Kbd, KbdGroup } from '@garden/ui/components/ui/kbd'
import { useSearchStore } from './search-store'

/**
 * Global search trigger. Rebuilt for the redesigned shell as a plain button —
 * it previously rendered shadcn's SidebarMenuButton, which throws outside the
 * retired SidebarProvider. Mounted in the AppTopBar's end slot.
 */
export function SearchTrigger({ className }: { className?: string } = {}) {
  return (
    <button
      type="button"
      aria-label="Search"
      onClick={() => useSearchStore.getState().setOpen(true)}
      className={cn(
        'flex h-7 items-center gap-2 rounded-sm border border-border-default px-2.5 text-sm text-text-secondary transition-colors hover:bg-background-main-secondary hover:text-text-neutral-default',
        className,
      )}
    >
      <IconSearch className="size-4" />
      <span className="hidden sm:inline">Search…</span>
      <KbdGroup className="ml-1 hidden sm:flex">
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>
    </button>
  )
}
