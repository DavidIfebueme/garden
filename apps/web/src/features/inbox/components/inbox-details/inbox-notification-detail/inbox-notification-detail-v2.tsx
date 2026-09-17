import { useActorName } from '#/lib/workspace/hooks'
import type { InboxItem } from '@garden/core/types'
import { Button } from '@garden/ui/components/ui/button'
import {
  CornerUpLeft,
  CornerUpRight,
  Ellipsis,
  Maximize2,
  Star,
  Trash2,
} from 'lucide-react'
import { Markdown } from '@/features/common/markdown'
import { typeLabels } from '../../inbox-detail-label'
import { InboxControlPlane } from '../../inbox-control-plane'
import { InboxItemPreviewCard, ctaForInboxItem } from '../../inbox-item-preview'
import { InboxReplyInput } from './inbox-reply-input'

function formatThreadTime(dateStr: string): string {
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

function ThreadActions() {
  return (
    <div className="flex shrink-0 items-center gap-3 text-foreground sm:gap-5">
      <button
        type="button"
        aria-label="Star thread"
        className="text-background-warning-default"
      >
        <Star className="size-4 fill-current" />
      </button>
      <button type="button" aria-label="Reply" className="text-foreground">
        <CornerUpLeft className="size-4" />
      </button>
      <button type="button" aria-label="Forward" className="text-foreground">
        <CornerUpRight className="size-4" />
      </button>
      <button
        type="button"
        aria-label="More actions"
        className="text-foreground"
      >
        <Ellipsis className="size-4" />
      </button>
    </div>
  )
}

function MailHeader({
  actorName,
  email,
  avatarUrl,
  time,
}: {
  actorName: string
  email?: string
  avatarUrl?: string
  time: string
}) {
  return (
    <div className="flex items-start gap-3 sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="size-9 shrink-0 rounded-full object-cover sm:size-10"
          />
        ) : (
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-muted-foreground/15 text-xs font-semibold text-muted-foreground sm:size-10">
            {actorName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-xs leading-5">
            <span className="font-semibold text-foreground">{actorName}</span>
            {email && (
              <span className="truncate text-muted-foreground">
                &lt;{email}&gt;
              </span>
            )}
          </div>
          <div className="text-xs leading-5 text-muted-foreground">{time}</div>
        </div>
      </div>
      <ThreadActions />
    </div>
  )
}

export function InboxNotificationDetailV2({
  item,
  onArchive,
  onOpenIssue,
  onReply,
  submittingReply,
}: {
  item: InboxItem
  onArchive: () => void
  onOpenIssue: () => void
  onReply: (content: string) => Promise<boolean>
  submittingReply: boolean
}) {
  const { getActorName } = useActorName()
  const actorName =
    item.details?.actor_name ??
    getActorName(
      item.actor_type ?? item.recipient_type,
      item.actor_id ?? item.recipient_id,
    ) ??
    typeLabels[item.type]
  const email = item.details?.actor_email
  const avatarUrl = item.details?.avatar_url

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-background p-3 sm:p-5 lg:p-7">
      <div className="min-h-full rounded-lg bg-muted px-4 py-5 text-foreground sm:px-5 sm:py-6 lg:px-7">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
          <h2 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-normal text-foreground sm:text-xl">
            {item.title}
          </h2>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={onArchive}
              className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-background px-2.5 text-xs text-background-danger-default-hover transition-colors hover:bg-accent sm:px-3"
            >
              <Trash2 className="size-3.5 shrink-0" />
              Delete
            </button>
            <button
              type="button"
              aria-label="Expand"
              className="inline-flex size-7 items-center justify-center text-foreground transition-colors hover:text-muted-foreground"
            >
              <Maximize2 className="size-4" />
            </button>
          </div>
        </div>

        <div className="space-y-6 py-4">
          <InboxItemPreviewCard item={item} />

          <article>
            <MailHeader
              actorName={actorName}
              email={email}
              avatarUrl={avatarUrl}
              time={formatThreadTime(item.created_at)}
            />
            <div className="mt-6 max-w-190 space-y-5 text-sm leading-6 text-foreground">
              {item.body ? (
                <Markdown>{item.body}</Markdown>
              ) : (
                <p className="text-muted-foreground">
                  No additional details were provided.
                </p>
              )}
            </div>
          </article>

          <InboxControlPlane item={item} />

          {item.issue_id && (
            <Button type="button" size="sm" onClick={onOpenIssue}>
              Open issue: {ctaForInboxItem(item)}
            </Button>
          )}

          {item.issue_id && (
            <InboxReplyInput onSubmit={onReply} submitting={submittingReply} />
          )}
        </div>
      </div>
    </div>
  )
}
