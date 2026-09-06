import {
  Folder as FolderIcon,
  Lock,
  DotsThreeVertical,
} from '@phosphor-icons/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@garden/ui/components/ui/dropdown-menu'
import type { BrainFolderSummary } from '../contract'

/**
 * One folder tile in the Folders grid (Penpot populated frame): 72px gray
 * card, folder glyph + name + "Private · N files" meta, and a ⋯ menu carrying
 * the design's folder actions that exist this pass (View / Rename / Delete).
 * `layout="list"` stretches the same card to full width for the design's
 * list-view toggle.
 */
export function BrainFolderCard({
  folder,
  layout = 'grid',
  onOpen,
  onRename,
  onDelete,
}: {
  folder: BrainFolderSummary
  layout?: 'grid' | 'list'
  onOpen: (folder: BrainFolderSummary) => void
  onRename: (folder: BrainFolderSummary) => void
  onDelete: (folder: BrainFolderSummary) => void
}) {
  return (
    <li className={layout === 'list' ? 'w-full' : 'w-full sm:w-[26rem]'}>
      <div className="flex h-[4.5rem] items-center gap-3 rounded-xl bg-background-main-secondary px-4 py-3">
        <button
          type="button"
          onClick={() => onOpen(folder)}
          aria-label={`Open folder ${folder.name}`}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-background-main-default">
            <FolderIcon
              className="size-6 text-icon-neutral-default"
              weight="regular"
            />
          </span>

          <span className="flex min-w-0 flex-col">
            <span className="truncate text-base font-semibold text-text-neutral-default">
              {folder.name}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-text-secondary">
              {folder.privacy === 'private' ? (
                <Lock
                  className="size-3.5"
                  weight="regular"
                  aria-hidden="true"
                />
              ) : null}
              <span className="capitalize">{folder.privacy}</span>
              <span aria-hidden="true">·</span>
              <span>
                {folder.fileCount} {folder.fileCount === 1 ? 'file' : 'files'}
              </span>
            </span>
          </span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Folder actions for ${folder.name}`}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-icon-neutral-default transition-colors hover:bg-background-main-secondary-hover"
          >
            <DotsThreeVertical className="size-5" weight="regular" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onOpen(folder)}>
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRename(folder)}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(folder)}
            >
              Delete folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  )
}
