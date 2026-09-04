import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Download,
  Eye,
  Lock,
  Plus,
  Trash,
  UploadSimple,
} from '@phosphor-icons/react'
import { Button } from '@garden/ui/components/ui/button'
import { Input } from '@garden/ui/components/ui/input'
import { Skeleton } from '@garden/ui/components/ui/skeleton'
import type { BrainFileSummary } from '../api'
import type { BrainFolderSummary } from '../contract'
import { brainFolderDetailOptions } from '../queries'
import {
  formatFileSize,
  formatUploadedDate,
  formatUploadedTime,
} from '../format'
import { BrainFileTypeIcon } from './file-type-icon'

/**
 * Folder detail view (Penpot folder frame): breadcrumb back to Files &
 * Folders, folder title with privacy/count meta, search + export + upload
 * toolbar, and the five-column table (File name / Date uploaded / Time
 * uploaded / Size / Action). "Share" and the grid/list toggle from the design
 * are omitted — they have no product semantics yet.
 */
export function BrainFolderDetail({
  folderId,
  uploading,
  onBack,
  onUploadFile,
  onPreviewFile,
  onRemoveFile,
  onDeleteFolder,
}: {
  folderId: string
  uploading: boolean
  onBack: () => void
  onUploadFile: () => void
  onPreviewFile: (file: BrainFileSummary) => void
  onRemoveFile: (file: BrainFileSummary) => void
  onDeleteFolder: (folder: BrainFolderSummary) => void
}) {
  const detailQuery = useQuery(brainFolderDetailOptions(folderId))
  const detail = detailQuery.data
  const [search, setSearch] = useState('')

  const visibleFiles = useMemo(() => {
    const files = detail?.files ?? []
    const query = search.trim().toLowerCase()
    if (query === '') return files
    return files.filter((file) => file.name.toLowerCase().includes(query))
  }, [detail?.files, search])

  const totalSize = useMemo(
    () =>
      (detail?.files ?? []).reduce(
        (sum, file) => sum + (file.sizeBytes ?? 0),
        0,
      ),
    [detail?.files],
  )

  const exportCsv = () => {
    if (!detail) return
    const header = 'File name,Date uploaded,Time uploaded,Size\n'
    const rows = detail.files
      .map((file) =>
        [
          `"${file.name.replaceAll('"', '""')}"`,
          formatUploadedDate(file.uploadedAt),
          formatUploadedTime(file.uploadedAt),
          file.sizeBytes ?? '',
        ].join(','),
      )
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${detail.item.name}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Breadcrumb band (design: white strip, "Files & Folders | {name}") */}
      <div className="border-b border-border-default bg-background-main-default px-6 py-3">
        <div className="mx-auto flex w-full max-w-[80rem] items-center gap-2 text-sm">
          <button
            type="button"
            onClick={onBack}
            className="flex cursor-pointer items-center gap-1.5 text-text-secondary transition-colors hover:text-text-neutral-default"
          >
            <ArrowLeft className="size-4" weight="regular" />
            Files &amp; Folders
          </button>
          <span aria-hidden="true" className="text-text-secondary">
            |
          </span>
          <span className="truncate text-text-neutral-default">
            {detail?.item.name ?? '…'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[80rem] flex-col gap-6 px-6 py-8">
          {detailQuery.isPending ? (
            <FolderDetailSkeleton />
          ) : detailQuery.isError || !detail ? (
            <div className="flex items-center gap-3 text-sm">
              <p role="alert" className="text-text-danger-secondary">
                Could not load this folder.
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={detailQuery.isFetching}
                onClick={() => void detailQuery.refetch()}
              >
                {detailQuery.isFetching ? 'Trying…' : 'Try again'}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <h2 className="truncate text-xl text-text-neutral-default">
                    {detail.item.name}
                  </h2>
                  <p className="flex items-center gap-2 text-sm text-text-secondary">
                    {detail.item.privacy === 'private' ? (
                      <Lock
                        className="size-3.5"
                        weight="regular"
                        aria-hidden="true"
                      />
                    ) : null}
                    <span className="capitalize">{detail.item.privacy}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {detail.item.fileCount}{' '}
                      {detail.item.fileCount === 1 ? 'file' : 'files'} (
                      {formatFileSize(totalSize)})
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon-lg"
                    aria-label={`Delete folder ${detail.item.name}`}
                    onClick={() => onDeleteFolder(detail.item)}
                  >
                    <Trash className="size-4" weight="regular" />
                  </Button>
                  <Button
                    className="h-10 gap-2"
                    disabled={uploading}
                    onClick={onUploadFile}
                  >
                    <UploadSimple className="size-4" weight="regular" />
                    Upload file
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.currentTarget.value)}
                  placeholder="Search for anything..."
                  aria-label="Search files in this folder"
                  className="h-8 w-full max-w-[21.25rem] rounded-lg border-transparent bg-background-main-secondary px-4 text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2"
                  disabled={detail.files.length === 0}
                  onClick={exportCsv}
                >
                  <Download className="size-4" weight="regular" />
                  Export Data
                </Button>
              </div>

              {detail.files.length === 0 ? (
                <div className="flex min-h-[18.5rem] flex-col items-center justify-center gap-4 rounded-xl bg-background-main-secondary px-6 text-center">
                  <p className="text-sm text-text-neutral-default">
                    No files yet
                  </p>
                  <p className="text-sm text-text-secondary">
                    Upload files into the folder, share and collaborate on with
                    your team in chat
                  </p>
                  <Button
                    variant="outline"
                    className="h-10 gap-2"
                    disabled={uploading}
                    onClick={onUploadFile}
                  >
                    <Plus className="size-4" weight="regular" />
                    Browse file
                  </Button>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-border-default">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-background-main-secondary text-left">
                        <th className="px-6 py-4 font-semibold text-text-neutral-default">
                          File name
                        </th>
                        <th className="px-6 py-4 font-semibold text-text-neutral-default">
                          Date uploaded
                        </th>
                        <th className="px-6 py-4 font-semibold text-text-neutral-default">
                          Time uploaded
                        </th>
                        <th className="px-6 py-4 font-semibold text-text-neutral-default">
                          Size
                        </th>
                        <th className="px-6 py-4 text-right font-semibold text-text-neutral-default">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleFiles.map((file) => (
                        <tr
                          key={file.id}
                          className="border-t border-border-default bg-background-main-default"
                        >
                          <td className="px-6 py-5">
                            <span className="flex items-center gap-2">
                              <BrainFileTypeIcon
                                fileName={file.name}
                                className="size-4.5"
                              />
                              <span className="truncate text-text-neutral-default">
                                {file.name}
                              </span>
                            </span>
                          </td>
                          <td className="px-6 py-5 text-text-neutral-default">
                            {formatUploadedDate(file.uploadedAt)}
                          </td>
                          <td className="px-6 py-5 text-text-neutral-default">
                            {formatUploadedTime(file.uploadedAt)}
                          </td>
                          <td className="px-6 py-5 text-text-neutral-default">
                            {formatFileSize(file.sizeBytes)}
                          </td>
                          <td className="px-6 py-5">
                            <span className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8"
                                disabled={file.status !== 'ready'}
                                onClick={() => onPreviewFile(file)}
                              >
                                <Eye className="size-3.5" weight="regular" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8"
                                onClick={() => onRemoveFile(file)}
                              >
                                <Trash className="size-3.5" weight="regular" />
                                Remove
                              </Button>
                            </span>
                          </td>
                        </tr>
                      ))}
                      {visibleFiles.length === 0 ? (
                        <tr className="border-t border-border-default bg-background-main-default">
                          <td
                            colSpan={5}
                            className="px-6 py-8 text-center text-text-secondary"
                          >
                            No files match “{search}”.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function FolderDetailSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      aria-busy="true"
      aria-label="Loading folder"
    >
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  )
}
