import { useState, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useWorkspaceId } from '@garden/app-state/hooks'
import { inboxListOptions, deduplicateInboxItems } from '@/lib/inbox/queries'
import {
  useMarkInboxRead,
  useArchiveInbox,
  useMarkAllInboxRead,
  useArchiveAllInbox,
  useArchiveAllReadInbox,
  useArchiveCompletedInbox,
} from '@/lib/inbox/mutations'
import { useActorName } from '@/lib/workspace/hooks'
import { useNavigation } from '../../navigation'
import { useWorkspaceDock } from '@/components/shell/workspace-dock'
import { toast } from 'sonner'
import {
  Archive,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react'
import type { InboxItem } from '@garden/core/types'
import { Button } from '@garden/ui/components/ui/button'

import { useIsMobile } from '@garden/ui/hooks/use-mobile'
import { InboxListItem, timeAgo } from './inbox-list-item'
import { typeLabels } from './inbox-detail-label'
import { InboxItemPreviewCard, ctaForInboxItem } from './inbox-item-preview'
import { InboxControlPlane } from './inbox-control-plane'
import { InboxListHeaderV2 } from './inbox-headers/inbox-header-v2'
import { InboxFooter } from './inbox-footer'
import { Icon as IconifyIcon } from '@iconify/react';

// ---------------------------------------------------------------------------
// List pane header + search — sidebar-09 style
// ---------------------------------------------------------------------------



// ---------------------------------------------------------------------------
// Empty state — centered full-pane
// ---------------------------------------------------------------------------
const InboxEmptyIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
    >
      <g>
        <g style={{ display: "none" }}>
          <g className="fills">
            <rect
              width="32"
              height="32"
              x="0"
              transform="matrix(1.000000, 0.000000, 0.000000, 1.000000, 0.000000, 0.000000)"
              style={{ fill: "none" }}
              ry="0"
              fill="none"
              rx="0"
              y="0"
            />
          </g>
        </g>

        <g style={{ fill: "rgb(0, 0, 0)" }}>
          <g>
            <g className="fills">
              <path
                d="M1.171142578125,5.477294921875L30.828857421875,5.477294921875C31.4736328125,5.477294921875,31.999755859375,6.003662109375,31.999755859375,6.6484375L31.999755859375,25.3515625C31.999755859375,25.994873046875,31.4736328125,26.522705078125,30.828857421875,26.522705078125L1.171142578125,26.522705078125C0.5263671875,26.522705078125,0.000244140625,25.994873046875,0.000244140625,25.3515625L0.000244140625,6.6484375C0.000244140625,6.003662109375,0.5263671875,5.477294921875,1.171142578125,5.477294921875Z"
                fillRule="evenodd"
                clipRule="evenodd"
                style={{ fill: "rgb(255, 178, 41)" }}
              />
            </g>
          </g>

          <g>
            <g className="fills">
              <path
                d="M1.171142578125,5.477294921875L30.828857421875,5.477294921875C31.4736328125,5.477294921875,31.999755859375,6.003662109375,31.999755859375,6.6484375L31.999755859375,9.413818359375L18.804443359375,18.775390625C17.103759765625,19.981689453125,14.896240234375,19.981689453125,13.195556640625,18.775390625L0.000244140625,9.413818359375L0.000244140625,6.6484375C0.000244140625,6.003662109375,0.5263671875,5.477294921875,1.171142578125,5.477294921875Z"
                fillRule="evenodd"
                clipRule="evenodd"
                style={{ fill: "rgb(230, 160, 37)" }}
              />
            </g>
          </g>

          <g>
            <g className="fills">
              <path
                d="M0.000244140625,24.510009765625L11.99609375,15.9990234375L0.000244140625,7.48828125Z"
                fillRule="evenodd"
                clipRule="evenodd"
                style={{ fill: "rgb(255, 152, 0)" }}
              />
            </g>
          </g>

          <g>
            <g className="fills">
              <path
                d="M31.999755859375,24.510009765625L20.00390625,15.9990234375L31.999755859375,7.48828125Z"
                fillRule="evenodd"
                clipRule="evenodd"
                style={{ fill: "rgb(255, 152, 0)" }}
              />
            </g>
          </g>

          <g>
            <g className="fills">
              <path
                d="M21.361083984375,16.961181640625L20.00390625,15.9990234375L31.999755859375,7.48828125L31.999755859375,9.413818359375Z"
                fillRule="evenodd"
                clipRule="evenodd"
                style={{ fill: "rgb(230, 137, 0)" }}
              />
            </g>
          </g>

          <g>
            <g className="fills">
              <path
                d="M1.171142578125,5.477294921875L30.828857421875,5.477294921875C31.4736328125,5.477294921875,31.999755859375,6.003662109375,31.999755859375,6.6484375L31.999755859375,7.48828125L17.895751953125,17.494384765625C16.740478515625,18.314697265625,15.259521484375,18.314697265625,14.1044921875,17.494384765625L0.000244140625,7.48828125L0.000244140625,6.6484375C0.000244140625,6.003662109375,0.5263671875,5.477294921875,1.171142578125,5.477294921875Z"
                fillRule="evenodd"
                clipRule="evenodd"
                style={{ fill: "rgb(255, 213, 79)" }}
              />
            </g>
          </g>

          <g>
            <g className="fills">
              <path
                d="M10.640869140625,16.961181640625L11.99609375,15.9990234375L0.000244140625,7.48828125L0.000244140625,9.413818359375Z"
                fillRule="evenodd"
                clipRule="evenodd"
                style={{ fill: "rgb(230, 137, 0)" }}
              />
            </g>
          </g>

          <g>
            <g className="fills">
              <path
                d="M1.171142578125,5.477294921875L30.828857421875,5.477294921875C31.473876953125,5.477294921875,32,6.003662109375,32,6.648193359375L32,25.351806640625C32,25.9951171875,31.473876953125,26.522705078125,30.828857421875,26.522705078125L1.171142578125,26.522705078125C0.526123046875,26.522705078125,0,25.9951171875,0,25.351806640625L0,6.648193359375C0,6.003662109375,0.526123046875,5.477294921875,1.171142578125,5.477294921875Z"
                fillRule="evenodd"
                clipRule="evenodd"
                style={{ fill: "rgb(255, 178, 41)" }}
              />
            </g>
          </g>

          <g>
            <g className="fills">
              <path
                d="M1.171142578125,5.477294921875L30.828857421875,5.477294921875C31.473876953125,5.477294921875,32,6.003662109375,32,6.648193359375L32,9.413818359375L18.804443359375,18.775390625C17.103759765625,19.981689453125,14.896240234375,19.981689453125,13.195556640625,18.775390625L0,9.413818359375L0,6.648193359375C0,6.003662109375,0.526123046875,5.477294921875,1.171142578125,5.477294921875Z"
                fillRule="evenodd"
                clipRule="evenodd"
                style={{ fill: "rgb(230, 160, 37)" }}
              />
            </g>
          </g>

          <g>
            <g className="fills">
              <path
                d="M0,24.510498046875L11.99609375,15.9990234375L0,7.48828125Z"
                fillRule="evenodd"
                clipRule="evenodd"
                style={{ fill: "rgb(255, 152, 0)" }}
              />
            </g>
          </g>

          <g>
            <g className="fills">
              <path
                d="M32,24.510498046875L20.00390625,15.9990234375L32,7.48828125Z"
                fillRule="evenodd"
                clipRule="evenodd"
                style={{ fill: "rgb(255, 152, 0)" }}
              />
            </g>
          </g>

          <g>
            <g className="fills">
              <path
                d="M21.361083984375,16.961181640625L20.00390625,15.9990234375L32,7.48828125L32,9.413818359375Z"
                fillRule="evenodd"
                clipRule="evenodd"
                style={{ fill: "rgb(230, 137, 0)" }}
              />
            </g>
          </g>

          <g>
            <g className="fills">
              <path
                d="M1.171142578125,5.477294921875L30.828857421875,5.477294921875C31.473876953125,5.477294921875,32,6.003662109375,32,6.648193359375L32,7.488037109375L17.895751953125,17.494384765625C16.740478515625,18.314697265625,15.259521484375,18.314697265625,14.104248046875,17.494384765625L0,7.48828125L0,6.648193359375C0,6.003662109375,0.526123046875,5.477294921875,1.171142578125,5.477294921875Z"
                fillRule="evenodd"
                clipRule="evenodd"
                style={{ fill: "rgb(255, 213, 79)" }}
              />
            </g>
          </g>

          <g>
            <g className="fills">
              <path
                d="M10.640625,16.961181640625L11.99609375,15.9990234375L0,7.48828125L0,9.413818359375Z"
                fillRule="evenodd"
                clipRule="evenodd"
                style={{ fill: "rgb(230, 137, 0)" }}
              />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
};

function InboxEmptyState({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex h-full w-full items-center justify-center px-6">
      <div className="flex max-w-sm flex-col items-center text-center">
        {
          icon ? (
            <div className="flex h-14 w-14 items-center justify-center">
              {icon}
            </div>
          ) : <InboxEmptyIcon />
        }

        <h2 className="mt-4 text-base font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
      </div>
    </div>
  );
}

function focusForInboxItem(item: InboxItem): string | null {
  const details = item.details ?? {}

  if (
    (item.type === 'new_comment' ||
      item.type === 'mentioned' ||
      item.type === 'reaction_added') &&
    details.comment_id
  ) {
    return `comment:${details.comment_id}`
  }

  if (item.type === 'waiting_for_input') {
    return `question:${details.run_id ?? item.issue_id ?? item.id}`
  }

  if (item.type === 'wp_review') {
    return `wp_review:${details.work_product_id ?? item.id}`
  }

  if (item.type === 'review_requested') {
    return `approval:${details.approval_id ?? details.request_id ?? details.run_id ?? item.issue_id ?? item.id}`
  }

  if (item.type === 'task_failed') {
    return `failed_run:${details.run_id ?? item.issue_id ?? item.id}`
  }

  if (item.type === 'agent_blocked') {
    return `blocked:${details.run_id ?? item.issue_id ?? item.id}`
  }

  if (item.type === 'task_completed' && details.run_id) {
    return `run:${details.run_id}`
  }

  return null
}

function InboxNotificationDetail({
  item,
  onArchive,
  onOpenIssue,
}: {
  item: InboxItem
  onArchive: () => void
  onOpenIssue: () => void
}) {
  const { getActorName } = useActorName()
  const actorName =
    getActorName(
      item.actor_type ?? item.recipient_type,
      item.actor_id ?? item.recipient_id,
    ) || typeLabels[item.type]
  const issueNumber = item.details?.issue_number
  const cta = ctaForInboxItem(item)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="shrink-0 border-b px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {!item.read && (
                <span className="size-1.5 rounded-full bg-brand" />
              )}
              <span>{typeLabels[item.type]}</span>
              <span>·</span>
              <span>{timeAgo(item.created_at)}</span>
              {issueNumber && (
                <>
                  <span>·</span>
                  <span className="font-mono">#{issueNumber}</span>
                </>
              )}
            </div>
            <h2 className="truncate text-lg font-semibold tracking-tight text-foreground">
              {item.title}
            </h2>
            <p className="text-sm text-muted-foreground">{actorName}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onArchive}>
            <Archive className="mr-1.5 h-3.5 w-3.5" />
            Archive
          </Button>
        </div>
      </div>

      <div className="w-full max-w-3xl space-y-5 p-6">
        <InboxItemPreviewCard item={item} />
        <InboxControlPlane item={item} />
        {item.issue_id && (
          <Button size="sm" onClick={onOpenIssue}>
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            {cta}
          </Button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function InboxPage() {
  const { searchParams, replace } = useNavigation()
  const dock = useWorkspaceDock()
  const selectedKey = searchParams.get('item') ?? ''

  const [search, setSearch] = useState('')
  const [unreadsOnly, setUnreadsOnly] = useState(false)

  const setSelectedKey = useCallback(
    (key: string, item?: InboxItem | null) => {
      // Persist selection in the search params on whatever route we're on so
      // we don't trigger a TanStack Router 404 (no `/inbox` route exists —
      // the inbox is a dock panel, not a path).
      if (typeof window === 'undefined') return
      const url = new URL(window.location.href)
      if (key) url.searchParams.set('item', key)
      else url.searchParams.delete('item')

      if (item?.issue_id) url.searchParams.set('issue', item.issue_id)
      else url.searchParams.delete('issue')

      const focus = item ? focusForInboxItem(item) : null
      if (focus) url.searchParams.set('focus', focus)
      else url.searchParams.delete('focus')
      replace(`${url.pathname}${url.search}`)
    },
    [replace],
  )

  const wsId = useWorkspaceId()
  const { data: rawItems = [] } = useQuery(inboxListOptions(wsId))
  const allItems = useMemo(() => deduplicateInboxItems(rawItems), [rawItems])

  const { getActorName } = useActorName()

  const items = useMemo(() => {
    const query = search.trim().toLowerCase()
    return allItems.filter((item) => {
      if (unreadsOnly && item.read) return false
      if (!query) return true
      const actor =
        getActorName(
          item.actor_type ?? item.recipient_type,
          item.actor_id ?? item.recipient_id,
        ) ?? ''
      const haystack = [
        item.title,
        item.body ?? '',
        typeLabels[item.type] ?? '',
        actor,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [allItems, search, unreadsOnly, getActorName])

  const isMobile = useIsMobile()
  const selected =
    items.find((i) => i.id === selectedKey) ??
    allItems.find((i) => i.id === selectedKey) ??
    null
  const unreadCount = allItems.filter((i) => !i.read).length

  const markReadMutation = useMarkInboxRead()
  const archiveMutation = useArchiveInbox()
  const markAllReadMutation = useMarkAllInboxRead()
  const archiveAllMutation = useArchiveAllInbox()
  const archiveAllReadMutation = useArchiveAllReadInbox()
  const archiveCompletedMutation = useArchiveCompletedInbox()

  // Click-to-read: select + auto-mark-read
  const handleSelect = (item: InboxItem) => {
    setSelectedKey(item.id, item)
    if (!item.read) {
      markReadMutation.mutate(item.id, {
        onError: () => toast.error('Failed to mark as read'),
      })
    }
  }

  const handleArchive = (id: string) => {
    const archived = allItems.find((i) => i.id === id)
    if (archived && archived.id === selectedKey) setSelectedKey('')
    archiveMutation.mutate(id, {
      onError: () => toast.error('Failed to archive'),
    })
  }

  // Batch operations
  const handleMarkAllRead = () => {
    markAllReadMutation.mutate(undefined, {
      onError: () => toast.error('Failed to mark all as read'),
    })
  }

  const handleArchiveAll = () => {
    setSelectedKey('')
    archiveAllMutation.mutate(undefined, {
      onError: () => toast.error('Failed to archive all'),
    })
  }

  const handleArchiveAllRead = () => {
    const readKeys = allItems.filter((i) => i.read).map((i) => i.id)
    if (readKeys.includes(selectedKey)) setSelectedKey('')
    archiveAllReadMutation.mutate(undefined, {
      onError: () => toast.error('Failed to archive read items'),
    })
  }

  const handleArchiveCompleted = () => {
    setSelectedKey('')
    archiveCompletedMutation.mutate(undefined, {
      onError: () => toast.error('Failed to archive completed'),
    })
  }

  const handleOpenIssue = useCallback(
    (item: InboxItem) => {
      if (!item.issue_id) return
      setSelectedKey(item.id, item)
      dock?.openPanel({
        kind: 'issue-detail',
        title: item.title,
        entityId: item.issue_id,
      })
    },
    [dock, setSelectedKey],
  )

  // -- Shared sub-components --------------------------------------------------

  const listHeader = (
    // <InboxListHeaderV1
    //   unreadCount={unreadCount}
    //   search={search}
    //   onSearchChange={setSearch}
    //   unreadsOnly={unreadsOnly}
    //   onUnreadsOnlyChange={setUnreadsOnly}
    //   onMarkAllRead={handleMarkAllRead}
    //   onArchiveAll={handleArchiveAll}
    //   onArchiveAllRead={handleArchiveAllRead}
    //   onArchiveCompleted={handleArchiveCompleted}
    // />
    <InboxListHeaderV2 />
  )

  const listBody =
    items.length === 0 ? (
      allItems.length === 0 ? (
        <InboxEmptyState
          title="No messages"
          body="You don't have any messages in your inbox"
        />
      ) : (
        <InboxEmptyState
          title="Nothing matches"
          body={
            unreadsOnly
              ? 'No unread notifications. Toggle Unreads off to see everything.'
              : 'No notifications match that search. Try a different query.'
          }
        />
      )
    ) : (
      <div>
        {items.map((item) => (
          <InboxListItem
            key={item.id}
            item={item}
            isSelected={item.id === selectedKey}
            onClick={() => handleSelect(item)}
            onArchive={() => handleArchive(item.id)}
          />
        ))}
      </div>
    )

  const detailContent = selected ? (
    <>
      <InboxNotificationDetail
        item={selected}
        onArchive={() => handleArchive(selected.id)}
        onOpenIssue={() => handleOpenIssue(selected)}
      />
    </>
  ) : (
    <div className="flex min-h-[calc(100dvh-120px)] w-full items-center justify-center">
      <InboxEmptyState
        title="No messages"
        body="Once any new message is sent it'll be documented"
        icon={
          <div className="bg-muted h-20 w-20 flex items-center justify-center rounded-full text-muted-foreground shrink-0">
            <IconifyIcon color='text-muted-foreground' icon="ph:envelope-open-thin" width={35} height={35} />
          </div>
        }
      />
    </div>
  )

  // -- Mobile layout: list / detail toggle -----------------------------------

  if (isMobile) {
    return selected ? (
      <div className="flex flex-1 flex-col min-h-0">
        <div className="flex h-12 shrink-0 items-center border-b px-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedKey('')}
            className="gap-1.5 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Inbox
          </Button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">{detailContent}</div>
      </div>
    ) : (
      <div className="flex flex-1 flex-col min-h-0">
        {listHeader}
        <div className="flex-1 min-h-0 overflow-y-auto">{listBody}</div>
      </div>
    )
  }

  // -- Desktop layout: list (collapsible, animated) + detail -----------------

  return (
    <div className="flex flex-1 min-h-0">
      {/* Same mechanism the explore menu uses: animate width with a CSS
          transition. `minWidth: 0` overrides the flex default that would stop
          the panel at its content's intrinsic width; `overflow-hidden` clips
          the fixed-width inner content as the outer width animates to 0. */}
      <div className="w-[320px] shrink-0 overflow-hidden border-r">
        <div className="flex h-full w-[320px] flex-col">
          {listHeader}
          <div className="flex-1 min-h-0 overflow-y-auto">{listBody}</div>
          <div className="bg-background/30 px-3 py-2">
            <InboxFooter />
          </div>
        </div>
      </div>
      <div className="flex flex-1 min-w-0 min-h-0 flex-col">
        {detailContent}
      </div>
    </div>
  )
}
