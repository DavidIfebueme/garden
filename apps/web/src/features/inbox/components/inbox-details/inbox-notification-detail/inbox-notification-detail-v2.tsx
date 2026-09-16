import { useActorName } from '#/lib/workspace/hooks'
import type { InboxItem } from '@garden/core/types'
import {
  CornerUpLeft,
  CornerUpRight,
  Ellipsis,
  FileText,
  Lock,
  Maximize2,
  Star,
  Trash2,
} from 'lucide-react'
import { InboxReplyInput } from './inbox-reply-input'

const TEST_AVATAR_URL =
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=96&h=96&q=80'

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
  time,
}: {
  actorName: string
  email: string
  time: string
}) {
  return (
    <div className="flex items-start gap-3 sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <img
          src={TEST_AVATAR_URL}
          alt=""
          className="size-9 shrink-0 rounded-full object-cover sm:size-10"
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-xs leading-5">
            <span className="font-semibold text-foreground">{actorName}</span>
            <span className="truncate text-muted-foreground">
              &lt;{email}&gt;
            </span>
            <span className="hidden text-foreground sm:inline">
              CC: 2 others
            </span>
            <span className="hidden text-muted-foreground sm:inline">⌄</span>
          </div>
          <div className="text-xs leading-5 text-muted-foreground">{time}</div>
        </div>
      </div>
      <ThreadActions />
    </div>
  )
}

function AttachmentPill() {
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Lock className="size-3.5 shrink-0 text-background-success-default" />
        <span>Attachment secure</span>
      </div>
      <button
        type="button"
        className="flex w-full max-w-47.5 items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-accent"
      >
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-background-danger-tertiary text-background-danger-default">
          <FileText className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">
            Onboarding_copy.pdf
          </span>
          <span className="block text-xs text-muted-foreground">2.9 MB</span>
        </span>
      </button>
    </div>
  )
}

export function InboxNotificationDetailV2({
  item,
  onArchive,
}: {
  item: InboxItem
  onArchive: () => void
  onOpenIssue: () => void
}) {
  const { getActorName } = useActorName()
  const actorName =
    item.details?.actor_name ??
    getActorName(
      item.actor_type ?? item.recipient_type,
      item.actor_id ?? item.recipient_id,
    ) ??
    'Bobby Ray'
  const body =
    item.body ??
    'After reviewing the onboarding analytics from last week, I noticed that most users drop off during the workspace setup step. Here are a few things we should prioritise this week:'

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
          <article>
            <MailHeader
              actorName={actorName}
              email="bobbyray@flowresearch.com"
              time={formatThreadTime(item.created_at)}
            />
            <div className="mt-6 max-w-190 space-y-5 text-sm leading-6 text-foreground">
              <p>Hey Jamie,</p>
              <p>{body}</p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>Getting the prior list of steps</li>
                <li>
                  Managing the entire lifecycle for potential on/off
                  relationships
                </li>
                <li>
                  Correcting anomalies against the required payment schemes
                </li>
                <li>Lifting the set pace for Nike and Puma ads</li>
              </ol>
              <p>
                Also, Stephanie, can you prepare an updated dashboard analytics
                for next Monday&apos;s stakeholder meeting?
              </p>
              <p>
                Thanks,
                <br />
                Bobby
              </p>
            </div>
            <AttachmentPill />
          </article>

          <article className="border-t border-border pt-5">
            <MailHeader
              actorName="Jamie Batiste"
              email="jamie@flowresearch.com"
              time={formatThreadTime(item.created_at)}
            />
            <p className="mt-6 text-sm font-medium leading-6 text-foreground">
              Noted! I&apos;ll prepare the analytics immediately.
            </p>
          </article>

          <InboxReplyInput />
        </div>
      </div>
    </div>
  )
}