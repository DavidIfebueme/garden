import { Archive, CalendarDays } from 'lucide-react'
import { useActorName } from '@/lib/workspace/hooks'
import type { InboxItem } from '@garden/core/types'
import { cn } from '@garden/ui/lib/utils'

const TEST_AVATAR_URL =
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=96&h=96&q=80'

function formatInboxDate(dateStr: string): string {
  const date = new Date(dateStr)
  const sameDay = date.toDateString() === new Date().toDateString()
  const day = sameDay
    ? 'Today'
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  return `${day}, ${time}`
}

export function InboxListItemV2({
  item,
  isSelected,
  onClick,
  onArchive,
}: {
  item: InboxItem
  isSelected: boolean
  onClick: () => void
  onArchive: () => void
}) {
  const { getActorName } = useActorName()
  const actorName =
    item.details?.actor_name ??
    getActorName(
      item.actor_type ?? item.recipient_type,
      item.actor_id ?? item.recipient_id,
    ) ??
    'Bobby Ray'

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative cursor-pointer grid min-h-20.25 w-full grid-cols-[32px_minmax(0,1fr)] gap-x-3 border-b bg-background px-3 py-3 text-left transition-colors last:border-b-0',
        isSelected
          ? 'border-l-2 border-l-muted'
          : 'hover:bg-muted',
      )}
    >
      <img
        src={item.details?.avatar_url ?? TEST_AVATAR_URL}
        alt=""
        className="mt-0.5 size-8 rounded-full object-cover"
      />

      <div className="min-w-0">
        <span className="truncate text-[13px] font-semibold leading-5 text-foreground">
          {actorName}
        </span>

        <p className="truncate text-[13px] leading-5 text-muted-foreground">
          {item.title}
        </p>
        <div className="flex min-w-0 items-center gap-2">
          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium leading-4 text-foreground">
            <CalendarDays className="size-3.5 text-muted-foreground" />
            <span>{formatInboxDate(item.created_at)}</span>
          </div>
          {!item.read && (
            <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium leading-4 text-emerald-700">
              New
            </span>
          )}
        </div>
      </div>

      <span
        role="button"
        tabIndex={-1}
        title="Archive"
        onClick={(e) => {
          e.stopPropagation()
          onArchive()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation()
            onArchive()
          }
        }}
        className="absolute top-3 right-3 hidden rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground group-hover:hidden"
      >
        <Archive className="h-3.5 w-3.5" />
      </span>
    </button>
  )
}
