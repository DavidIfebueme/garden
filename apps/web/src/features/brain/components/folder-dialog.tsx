import { useState } from 'react'
import { Button } from '@garden/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@garden/ui/components/ui/dialog'
import { Input } from '@garden/ui/components/ui/input'
import { Label } from '@garden/ui/components/ui/label'
import { Switch } from '@garden/ui/components/ui/switch'
import { BRAIN_FOLDER_NAME_MAX, type BrainFolderSummary } from '../contract'

type BrainFolderDialogProps = {
  /** When set, the dialog renames/reprivatizes this folder instead of creating. */
  folder?: BrainFolderSummary | null
  pending: boolean
  error: string | null
  onSubmit: (input: { name: string; privacy: 'private' | 'shared' }) => void
  onClose: () => void
}

/**
 * Create/rename folder dialog from the Penpot "Create a folder" frame: Folder
 * Name field with an n/50 counter, a Make Private switch, and a footer whose
 * primary action stays disabled until the name is non-empty (the design shows
 * the disabled state explicitly). Steps 2–3 of the design's wizard (add files,
 * expiration, AI instructions) belong to the knowledge-base flow and are
 * intentionally not part of this dialog.
 */
export function BrainFolderDialog({
  folder,
  pending,
  error,
  onSubmit,
  onClose,
}: BrainFolderDialogProps) {
  const editing = folder != null
  const [name, setName] = useState(folder?.name ?? '')
  const [isPrivate, setIsPrivate] = useState(
    folder ? folder.privacy === 'private' : false,
  )

  const trimmedName = name.trim()
  const canSubmit = trimmedName.length > 0 && !pending

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose()
      }}
    >
      <DialogContent className="gap-6 p-6 sm:max-w-[32rem]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-text-neutral-default">
            {editing ? 'Rename folder' : 'Create a folder'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {editing
              ? `Rename or change the privacy of ${folder.name}.`
              : 'Name the folder and choose who can see it.'}
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault()
            if (!canSubmit) return
            onSubmit({
              name: trimmedName,
              privacy: isPrivate ? 'private' : 'shared',
            })
          }}
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="brain-folder-name"
                className="text-sm font-normal text-text-neutral-default"
              >
                Folder Name{' '}
                <span
                  aria-hidden="true"
                  className="text-text-danger-on-danger-secondary"
                >
                  *
                </span>
              </Label>
              <span className="text-xs text-text-neutral-secondary">
                {name.length}/{BRAIN_FOLDER_NAME_MAX}
              </span>
            </div>
            <Input
              id="brain-folder-name"
              value={name}
              maxLength={BRAIN_FOLDER_NAME_MAX}
              placeholder="Enter a folder name"
              autoFocus
              disabled={pending}
              onChange={(event) => setName(event.currentTarget.value)}
              className="h-10 rounded-lg border-border-default bg-background-main-secondary px-4 text-base placeholder:text-text-neutral-tertiary"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <Label
                htmlFor="brain-folder-private"
                className="text-sm font-normal text-text-neutral-default"
              >
                Make Private
              </Label>
              <p className="text-sm text-text-neutral-tertiary">
                Set this folder to be private to you
              </p>
            </div>
            <Switch
              id="brain-folder-private"
              checked={isPrivate}
              disabled={pending}
              onCheckedChange={setIsPrivate}
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-text-danger-secondary">
              {error}
            </p>
          ) : null}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={onClose}
              className="h-10 flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit} className="h-10 flex-1">
              {pending
                ? editing
                  ? 'Saving…'
                  : 'Creating…'
                : editing
                  ? 'Save changes'
                  : 'Create folder'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
