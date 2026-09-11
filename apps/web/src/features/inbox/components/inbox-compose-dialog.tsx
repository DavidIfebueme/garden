import { useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Image as ImageIcon, Link, Paperclip, Trash2 } from 'lucide-react'
import { Button } from '@garden/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@garden/ui/components/ui/dialog'
import { Input } from '@garden/ui/components/ui/input'
import { Textarea } from '@garden/ui/components/ui/textarea'
import { QuickEmojiPicker } from '@garden/ui/components/common/quick-emoji-picker'
import { cn } from '@garden/ui/lib/utils'

const fieldInputClassName =
  'h-8 border-0 bg-transparent px-3 shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent'

type InboxComposeDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}


export function InboxComposeDialog({
  open,
  onOpenChange,
}: InboxComposeDialogProps) {
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])

  const resetCompose = () => {
    setTo('')
    setCc('')
    setBcc('')
    setSubject('')
    setBody('')
    setShowCc(false)
    setShowBcc(false)
    setAttachments([])
  }

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) resetCompose()
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!to.trim() || !body.trim()) return
    handleOpenChange(false)
  }

  const addAttachment = (file: File) => {
    setAttachments((current) => [...current, file])
  }

  const canSend = to.trim().length > 0 && body.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <DialogTitle className="sr-only">Start email</DialogTitle>
        <DialogDescription className="sr-only">
          Compose a new email with recipients, subject, and message.
        </DialogDescription>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
          <div className="space-y-1 px-4 py-3">
            <ComposeAddressRow
              id="inbox-compose-to"
              label="To:"
              placeholder="Enter an email"
              type="email"
              value={to}
              onChange={setTo}
              trailing={
                <div className="flex shrink-0 items-center gap-3">
                  {!showCc ? (
                    <button
                      type="button"
                      className="text-sm font-medium text-muted-foreground hover:text-foreground"
                      onClick={() => setShowCc(true)}
                    >
                      Cc
                    </button>
                  ) : null}
                  {!showBcc ? (
                    <button
                      type="button"
                      className="text-sm font-medium text-muted-foreground hover:text-foreground"
                      onClick={() => setShowBcc(true)}
                    >
                      Bcc
                    </button>
                  ) : null}
                </div>
              }
            />
            {showCc ? (
              <ComposeAddressRow
                id="inbox-compose-cc"
                label="Cc:"
                placeholder="Enter an email"
                type="email"
                value={cc}
                onChange={setCc}
              />
            ) : null}
            {showBcc ? (
              <ComposeAddressRow
                id="inbox-compose-bcc"
                label="Bcc:"
                placeholder="Enter an email"
                type="email"
                value={bcc}
                onChange={setBcc}
              />
            ) : null}
            <ComposeAddressRow
              id="inbox-compose-subject"
              label="Subject:"
              placeholder="Add a subject"
              value={subject}
              onChange={setSubject}
            />
          </div>

          <Textarea
            id="inbox-compose-body"
            placeholder="Write your message here..."
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className="min-h-52 resize-y rounded-none border-0 bg-muted px-4 py-4 shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-muted"
          />

          {attachments.length > 0 ? (
            <ul className="border-t px-4 py-2 text-xs text-muted-foreground">
              {attachments.map((file) => (
                <li key={`${file.name}-${file.lastModified}`} className="truncate">
                  {file.name}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                disabled={!canSend}
                className="disabled:bg-muted py-5 cursor-pointer disabled:text-muted-foreground disabled:opacity-100"
              >
                Send message
              </Button>
              <Button
                type="button"
                variant="outline"
                className="py-5 px-5 cursor-pointer"
                onClick={() => handleOpenChange(false)}
              >
                Save to draft
              </Button>
            </div>
            <div className="flex items-center gap-0.5">
              <QuickEmojiPicker
                align="end"
                className="rounded-lg"
                onSelect={(emoji) => setBody((current) => `${current}${emoji}`)}
              />
              <ComposeFileButton
                icon={Link}
                label="Attach file"
                onSelect={addAttachment}
              />
              <ComposeFileButton
                icon={Paperclip}
                label="Attach document"
                onSelect={addAttachment}
              />
              <ComposeFileButton
                accept="image/*"
                icon={ImageIcon}
                label="Attach image"
                onSelect={addAttachment}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground"
                aria-label="Discard email"
                onClick={() => handleOpenChange(false)}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ComposeAddressRow({
  id,
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
  trailing,
}: {
  id: string
  label: string
  placeholder: string
  type?: 'text' | 'email'
  value: string
  onChange: (value: string) => void
  trailing?: ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <label
        htmlFor={id}
        className="shrink-0 text-sm font-semibold text-foreground"
      >
        {label}
      </label>
      <Input
        id={id}
        type={type}
        autoComplete={type === 'email' ? 'email' : undefined}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldInputClassName}
        wrapperClassName="min-w-0 flex-1"
      />
      {trailing}
    </div>
  )
}

function ComposeFileButton({
  accept,
  icon: Icon,
  label,
  onSelect,
}: {
  accept?: string
  icon: LucideIcon
  label: string
  onSelect: (file: File) => void
}) {
  return (
    <label
      className={cn(
        'relative inline-flex size-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <input
        type="file"
        accept={accept}
        aria-label={label}
        className="absolute inset-0 cursor-pointer opacity-0"
        onClick={(event) => {
          event.currentTarget.value = ''
        }}
        onChange={(event) => {
          const selected = event.currentTarget.files?.item(0)
          if (selected) onSelect(selected)
        }}
      />
    </label>
  )
}

export type { InboxComposeDialogProps }
