/**
 * `ChatMessageQueue` — the stack of messages the person wrote while the agent
 * was still answering, parked directly above the composer.
 *
 * Why this exists: until now the composer swapped its send button for a stop
 * button the moment a turn started, so anything typed mid-reply had nowhere to
 * go — the person either interrupted the agent or waited. The 2026-09-16 queue
 * design keeps those messages visible as rows ("Queue 1 · Reply after current
 * reply") that the controller drains in order once the current turn finishes.
 *
 * Behaviour before: no queue surface existed anywhere in the app.
 * Behaviour after: each parked message shows its position, its text, and three
 * actions — copy it, pull it back into the composer to edit, or drop it.
 *
 * Presentation only. The queue itself lives in `chat-panel-controller.tsx`,
 * which owns enqueue/drain ordering; this file just renders what it is given.
 *
 * Reference: Penpot "App-Connections" queue frame (CSS export supplied
 * 2026-09-16) — row `background-main-tertiary`, 12px radius, 16px/8px padding,
 * 14px text, `text-brand-secondary` position label, `text-secondary` hint, and
 * a 24px action pitch flush to the row's right padding edge.
 */

import { Copy, CornerDownRight, PencilLine, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { cn } from '@garden/ui/lib/utils'
import type { SelectedThreadDocument } from './document-selection'

/** One parked send, holding the exact payload `handleSend` would have run. */
export interface QueuedChatMessage {
  id: string
  text: string
  files: File[]
  selectedDocuments: SelectedThreadDocument[]
}

/**
 * Icon action inside a queue row. 24px box with a 16px glyph, so a row of them
 * lands on the design's 24px pitch with no gap between the buttons — the hover
 * surfaces stay adjacent instead of leaving dead slivers between hit targets.
 */
function QueueRowAction({
  children,
  label,
  onClick,
}: {
  children: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded',
        'text-icon-secondary transition-colors hover:bg-background-main-tertiary-hover hover:text-icon-default',
      )}
    >
      {children}
    </button>
  )
}

function QueueRowCopyAction({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <QueueRowAction
      label={copied ? 'Copied' : 'Copy queued message'}
      onClick={() => {
        void navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
    >
      <Copy className={cn('size-4', copied && 'text-icon-success-default')} />
    </QueueRowAction>
  )
}

export function ChatMessageQueue({
  className,
  messages,
  onEdit,
  onRemove,
}: {
  className?: string
  messages: QueuedChatMessage[]
  /** Pulls the message out of the queue and back into the composer draft. */
  onEdit: (message: QueuedChatMessage) => void
  onRemove: (id: string) => void
}) {
  if (messages.length === 0) return null

  return (
    <ul
      aria-label="Queued messages"
      className={cn('flex flex-col gap-2', className)}
    >
      {messages.map((message, index) => (
        <li
          key={message.id}
          className="flex items-center justify-between gap-2 rounded-xl bg-background-main-tertiary px-4 py-2"
        >
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-0.5 text-sm">
              <span className="flex items-center gap-2 text-text-brand-secondary">
                <CornerDownRight className="size-4 shrink-0" aria-hidden />
                Queue {index + 1}
              </span>
              <span
                aria-hidden
                className="flex size-4 shrink-0 items-center justify-center text-text-secondary"
              >
                <span className="size-0.5 rounded-full bg-current" />
              </span>
              <span className="text-text-secondary">
                Reply after current reply
              </span>
            </div>
            <p className="truncate text-sm text-text-default">
              {message.text || describeAttachmentsOnly(message)}
            </p>
          </div>
          {/*
            `-mr-1` pulls the 24px buttons back by the 4px each one pads around
            its 16px glyph, so the last icon sits exactly on the row's 16px
            padding edge rather than 20px inside it.
          */}
          <div className="-mr-1 flex shrink-0 items-center">
            <QueueRowCopyAction text={message.text} />
            <QueueRowAction
              label="Edit queued message"
              onClick={() => onEdit(message)}
            >
              <PencilLine className="size-4" />
            </QueueRowAction>
            <QueueRowAction
              label="Remove queued message"
              onClick={() => onRemove(message.id)}
            >
              <X className="size-4" />
            </QueueRowAction>
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * A queued send can be attachments with no prose. The row still needs a line of
 * body text, so name what is waiting rather than rendering an empty paragraph.
 */
function describeAttachmentsOnly(message: QueuedChatMessage) {
  const count = message.files.length + message.selectedDocuments.length
  if (count === 0) return 'Empty message'
  return `${count} attachment${count === 1 ? '' : 's'}`
}
