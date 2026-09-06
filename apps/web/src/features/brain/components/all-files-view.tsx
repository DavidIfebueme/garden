import { useMemo, useState } from 'react'
import { Files } from '@phosphor-icons/react'
import { Button } from '@garden/ui/components/ui/button'
import { Input } from '@garden/ui/components/ui/input'
import type { BrainFileSummary } from '../api'
import type { BrainFolderSummary } from '../contract'
import { formatFileSize } from '../format'
import {
  FileCardMenu,
  FileGridCard,
  FileListTable,
  type FileRetryState,
} from './file-list'
import { ViewModePill, type ViewMode } from './view-mode-pill'

/**
 * Full files list, reached via the "View all N files" affordance on the
 * recent-files row. The main page's design references carry no always-on file
 * list, so older files would be unreachable (no preview / delete / retry /
 * add-to-folder) without this drill-in. The view mirrors the folder-detail
 * frame — breadcrumb band, search, grid/list pill, and the shared five-column
 * table or card grid — but has no design board of its own, so the row action
 * is the existing FileCardMenu (View file / Download / Add to folder /
 * Delete) rather than folder detail's Delete|View pills, and Delete here is
 * the real file delete (parent renders the destructive confirm). Data comes
 * from the page's file-list query; no new endpoint.
 */
export function BrainAllFilesView({
  files,
  folders,
  isListError,
  isRefetchError,
  isFetchingList,
  onRetryList,
  retry,
  onBack,
  onPreview,
  onDelete,
  onAddToFolder,
}: {
  files: readonly BrainFileSummary[]
  folders: readonly BrainFolderSummary[]
  isListError: boolean
  isRefetchError: boolean
  isFetchingList: boolean
  onRetryList: () => void
  retry: FileRetryState
  onBack: () => void
  onPreview: (file: BrainFileSummary) => void
  onDelete: (file: BrainFileSummary) => void
  onAddToFolder: (file: BrainFileSummary, folderId: string) => void
}) {
  const [search, setSearch] = useState('')
  /** Same default as folder detail: the table; the pill flips to the grid. */
  const [filesView, setFilesView] = useState<ViewMode>('list')

  const visibleFiles = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (query === '') return files
    return files.filter((file) => file.name.toLowerCase().includes(query))
  }, [files, search])

  const totalSize = useMemo(
    () => files.reduce((sum, file) => sum + (file.sizeBytes ?? 0), 0),
    [files],
  )

  const renderMenu = (file: BrainFileSummary) => (
    <FileCardMenu
      uploadedFile={file}
      folders={folders}
      canPreview={file.status === 'ready'}
      onPreview={onPreview}
      onAddToFolder={onAddToFolder}
      onDelete={onDelete}
    />
  )

  return (
    <div className="flex h-full flex-col">
      {/* Breadcrumb band, same strip as the folder detail view */}
      <div className="border-b border-border-default bg-background-main-default px-6 py-3">
        <div className="mx-auto flex w-full max-w-[80rem] items-center gap-2 text-sm">
          <button
            type="button"
            onClick={onBack}
            className="cursor-pointer text-text-secondary transition-colors hover:text-text-neutral-default"
          >
            Files &amp; Folders
          </button>
          <span aria-hidden="true" className="shrink-0 text-text-secondary">
            /
          </span>
          <span className="min-w-0 truncate text-text-neutral-default">
            All files
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[80rem] flex-col gap-6 px-6 py-8">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="flex min-w-0 items-center gap-2.5 text-2xl font-semibold tracking-[-0.04em] text-text-neutral-default">
              <Files
                className="size-5 shrink-0 text-text-brand-secondary"
                weight="fill"
                aria-hidden="true"
              />
              <span className="truncate">All files</span>
            </h2>
            <p className="text-sm text-text-secondary">
              {files.length} {files.length === 1 ? 'file' : 'files'} (
              {formatFileSize(totalSize)})
            </p>
          </div>

          {isListError ? (
            <div className="flex items-center gap-3 text-sm">
              <p role="alert" className="text-text-danger-secondary">
                {isRefetchError
                  ? 'Could not refresh file statuses.'
                  : 'Could not load files.'}
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={isFetchingList}
                onClick={onRetryList}
              >
                {isFetchingList ? 'Trying…' : 'Try again'}
              </Button>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder="Search for anything..."
              aria-label="Search files"
              className="h-8 w-full max-w-[21.25rem] rounded-lg border-transparent bg-background-main-secondary px-4 text-sm"
            />

            <div className="ml-auto">
              <ViewModePill
                mode={filesView}
                onChange={setFilesView}
                label="All files"
              />
            </div>
          </div>

          {filesView === 'grid' ? (
            <ul className="flex flex-wrap gap-4" aria-live="polite">
              {visibleFiles.map((file) => (
                <FileGridCard
                  key={file.id}
                  file={file}
                  onPreview={onPreview}
                  menu={renderMenu(file)}
                  retry={retry}
                />
              ))}
              {visibleFiles.length === 0 ? (
                <li className="w-full rounded-xl bg-background-main-secondary px-6 py-8 text-center text-sm text-text-secondary">
                  No files match “{search}”.
                </li>
              ) : null}
            </ul>
          ) : (
            <FileListTable
              files={visibleFiles}
              search={search}
              retry={retry}
              renderActions={renderMenu}
            />
          )}
        </div>
      </div>
    </div>
  )
}
