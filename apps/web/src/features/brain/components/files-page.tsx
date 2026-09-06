import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Download,
  Eye,
  FilePlus,
  FolderPlus,
  Folder as FolderIcon,
  Loader2,
  Plus,
  Trash,
  Upload,
} from 'lucide-react'
import {
  DotsThreeVertical,
  ListDashes,
  SquaresFour,
} from '@phosphor-icons/react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@garden/ui/components/ui/alert-dialog'
import { Button } from '@garden/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@garden/ui/components/ui/dropdown-menu'
import { BrainFileTypeIcon } from './file-type-icon'
import {
  addFileToBrainFolder,
  brainFileDownloadUrl,
  createBrainFolder,
  deleteBrainFile,
  deleteBrainFolder,
  removeFileFromBrainFolder,
  retryBrainFile,
  updateBrainFolder,
  uploadBrainFile,
  type BrainFileSummary,
} from '../api'
import {
  brainFileKeys,
  brainFileListOptions,
  brainFolderKeys,
  brainFolderListOptions,
} from '../queries'
import {
  BRAIN_ACCEPTED_FILE_TYPES,
  type BrainFolderSummary,
} from '../contract'
import { formatRelativeTime, truncateMiddle } from '../format'
import { BrainFilePreviewDialog } from './file-preview-dialog'
import { BrainFileUploadDialog } from './file-upload-dialog'
import { BrainFolderDialog } from './folder-dialog'
import { BrainFolderCard } from './folder-card'
import { BrainFolderDetail } from './folder-detail'
import { PdfThumbnail } from './pdf-file-preview'
import { ViewModePill, type ViewMode } from './view-mode-pill'

type FolderScope = 'all' | 'private' | 'shared'

const FOLDER_TABS: readonly { id: FolderScope; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'private', label: 'Private' },
  { id: 'shared', label: 'Shared' },
]

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

/**
 * The honest ⋯ file menu shared by the KB cards and the recent-file cards:
 * View file / Download / Add to folder / Delete file. The design also lists
 * Edit and Add to knowledge base; neither maps to existing behavior (no file
 * rename API, and these files already live in the workspace knowledge base),
 * so they stay out per scope decision.
 */
function FileCardMenu({
  uploadedFile,
  folders,
  canPreview,
  onPreview,
  onAddToFolder,
  onDelete,
}: {
  uploadedFile: BrainFileSummary
  folders: readonly BrainFolderSummary[]
  canPreview: boolean
  onPreview: (file: BrainFileSummary) => void
  onAddToFolder: (file: BrainFileSummary, folderId: string) => void
  onDelete: (file: BrainFileSummary) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`File actions for ${uploadedFile.name}`}
        className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-sm text-icon-neutral-default transition-colors hover:bg-background-main-secondary"
      >
        <DotsThreeVertical className="size-4" weight="regular" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          disabled={!canPreview}
          onClick={() => onPreview(uploadedFile)}
        >
          <Eye />
          View file
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            const anchor = document.createElement('a')
            anchor.href = brainFileDownloadUrl(uploadedFile)
            anchor.download = uploadedFile.name
            anchor.click()
          }}
        >
          <Download />
          Download
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={folders.length === 0}>
            <FolderPlus />
            Add to folder
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44">
            {folders.map((folder) => (
              <DropdownMenuItem
                key={folder.id}
                onClick={() => onAddToFolder(uploadedFile, folder.id)}
              >
                <FolderIcon />
                <span className="min-w-0 truncate">{folder.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => onDelete(uploadedFile)}
        >
          <Trash />
          Delete file
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * One file in the Knowledge Base section (Penpot recent-upload card): gray
 * header strip with name + ⋯ menu (View / Download / Add to folder / Delete),
 * body with the type icon and indexing status / owner / age. `layout="list"`
 * collapses the same content into one full-width row for the section's view
 * toggle.
 */
function BrainFileCard({
  folders,
  isPolling,
  isRetrying,
  layout = 'grid',
  onAddToFolder,
  onDelete,
  onPreview,
  onRetry,
  uploadedFile,
}: {
  folders: readonly BrainFolderSummary[]
  isPolling: boolean
  isRetrying: boolean
  layout?: ViewMode
  onAddToFolder: (file: BrainFileSummary, folderId: string) => void
  onDelete: (file: BrainFileSummary) => void
  onPreview: (file: BrainFileSummary) => void
  onRetry: (file: BrainFileSummary) => void
  uploadedFile: BrainFileSummary
}) {
  const canPreview = uploadedFile.status === 'ready'
  const canRetry =
    uploadedFile.status === 'failed' ||
    (uploadedFile.status === 'processing' && !isPolling)
  const statusLabel =
    uploadedFile.status === 'ready'
      ? 'Ready'
      : uploadedFile.status === 'failed'
        ? 'Failed'
        : 'Processing'

  const nameButton = (
    <button
      type="button"
      disabled={!canPreview}
      onClick={() => onPreview(uploadedFile)}
      aria-label={`Preview ${uploadedFile.name}`}
      className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left disabled:cursor-default"
    >
      <BrainFileTypeIcon fileName={uploadedFile.name} className="size-4" />
      <span
        className="min-w-0 truncate text-sm text-text-neutral-default"
        title={uploadedFile.name}
      >
        {truncateMiddle(uploadedFile.name, 36)}
      </span>
    </button>
  )

  const menu = (
    <FileCardMenu
      uploadedFile={uploadedFile}
      folders={folders}
      canPreview={canPreview}
      onPreview={onPreview}
      onAddToFolder={onAddToFolder}
      onDelete={onDelete}
    />
  )

  const statusLine = (
    <p className="flex items-center gap-1.5 text-xs text-text-secondary">
      {isPolling || isRetrying ? (
        <Loader2 className="size-3 animate-spin" aria-hidden="true" />
      ) : null}
      {isRetrying ? 'Retrying' : statusLabel}
      {canRetry ? (
        <button
          type="button"
          aria-label={`Retry ${uploadedFile.name}`}
          disabled={isRetrying}
          onClick={() => onRetry(uploadedFile)}
          className="cursor-pointer font-medium text-text-neutral-default underline-offset-4 hover:underline disabled:cursor-wait disabled:opacity-70"
        >
          Retry
        </button>
      ) : null}
    </p>
  )

  const metaLine = (
    <p className="max-w-[16rem] truncate text-xs text-text-secondary">
      {[
        uploadedFile.createdByName
          ? `Made by ${uploadedFile.createdByName}`
          : null,
        uploadedFile.uploadedAt
          ? formatRelativeTime(uploadedFile.uploadedAt)
          : null,
      ]
        .filter(Boolean)
        .join(' · ')}
    </p>
  )

  if (layout === 'list') {
    return (
      <li className="w-full overflow-hidden rounded-xl bg-background-main-secondary">
        <div className="flex h-[4.5rem] items-center gap-4 px-4">
          {nameButton}
          <div className="flex shrink-0 items-center gap-4">
            {statusLine}
            {metaLine}
          </div>
          {menu}
        </div>
      </li>
    )
  }

  return (
    <li className="w-full overflow-hidden rounded-xl bg-background-main-secondary sm:w-[15.5rem]">
      <div className="flex items-center gap-2 bg-border-default px-3 py-2">
        {nameButton}
        {menu}
      </div>

      <div className="flex min-h-[5.5rem] flex-col justify-between gap-1 px-3 py-2.5">
        {statusLine}
        {metaLine}
      </div>
    </li>
  )
}

/**
 * Card thumbnail body: page 1 of a ready PDF through the shared pdfjs cache;
 * any other type (or a file still processing) degrades to the type glyph.
 */
function FileCardThumbnail({ file }: { file: BrainFileSummary }) {
  const fallback = (
    <span className="flex h-full items-center justify-center">
      <BrainFileTypeIcon fileName={file.name} className="size-8" />
    </span>
  )

  if (file.status !== 'ready' || !file.name.toLowerCase().endsWith('.pdf')) {
    return fallback
  }

  return <PdfThumbnail fileId={file.id} fallback={fallback} />
}

/**
 * One of the two most recent files beside the dropzone (Penpot top row shows
 * document preview cards next to the upload card): name strip over a rendered
 * thumbnail. A quick-access mirror of the Knowledge Base list below; indexing
 * status and retry stay on the KB cards so this card can stay visual.
 */
function RecentFileCard({
  uploadedFile,
  folders,
  onAddToFolder,
  onDelete,
  onPreview,
}: {
  uploadedFile: BrainFileSummary
  folders: readonly BrainFolderSummary[]
  onAddToFolder: (file: BrainFileSummary, folderId: string) => void
  onDelete: (file: BrainFileSummary) => void
  onPreview: (file: BrainFileSummary) => void
}) {
  const canPreview = uploadedFile.status === 'ready'

  return (
    <li className="w-full overflow-hidden rounded-xl bg-background-main-secondary sm:w-[15.5rem]">
      <div className="flex items-center gap-2 bg-border-default px-3 py-2">
        <button
          type="button"
          disabled={!canPreview}
          onClick={() => onPreview(uploadedFile)}
          aria-label={`Preview ${uploadedFile.name}`}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left disabled:cursor-default"
        >
          <BrainFileTypeIcon fileName={uploadedFile.name} className="size-4" />
          <span
            className="min-w-0 truncate text-sm text-text-neutral-default"
            title={uploadedFile.name}
          >
            {truncateMiddle(uploadedFile.name, 36)}
          </span>
        </button>
        <FileCardMenu
          uploadedFile={uploadedFile}
          folders={folders}
          canPreview={canPreview}
          onPreview={onPreview}
          onAddToFolder={onAddToFolder}
          onDelete={onDelete}
        />
      </div>

      <button
        type="button"
        disabled={!canPreview}
        onClick={() => onPreview(uploadedFile)}
        aria-label={`Open preview of ${uploadedFile.name}`}
        className="block h-[7.25rem] w-full cursor-pointer overflow-hidden disabled:cursor-default"
      >
        <FileCardThumbnail file={uploadedFile} />
      </button>
    </li>
  )
}

/**
 * Files & Folders page (Penpot "Files & Folders [DEV READY]"): header band,
 * upload dropzone with the two most recent files beside it, Folders section
 * with All/Private/Shared scope tabs, the create-folder dialog, and the
 * Knowledge Base section with per-file actions. Both sections carry the
 * design's grid/list view toggles; the KB header also repeats the "Setup
 * knowledge base" upload entry point. Folder selection swaps the sections for
 * the folder detail view.
 */
export function BrainFilesPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewFile, setPreviewFile] = useState<BrainFileSummary | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [sessionUploadIds, setSessionUploadIds] = useState<readonly string[]>(
    [],
  )
  const [folderScope, setFolderScope] = useState<FolderScope>('all')
  const [foldersView, setFoldersView] = useState<ViewMode>('grid')
  const [filesView, setFilesView] = useState<ViewMode>('grid')
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [folderDialog, setFolderDialog] = useState<{
    folder?: BrainFolderSummary
  } | null>(null)
  const [pendingDeleteFolder, setPendingDeleteFolder] =
    useState<BrainFolderSummary | null>(null)
  const [pendingDeleteFile, setPendingDeleteFile] =
    useState<BrainFileSummary | null>(null)
  /** Set when the upload was started from inside a folder detail view. */
  const uploadFolderIdRef = useRef<string | null>(null)
  /**
   * File attached in the create-folder dialog. Held in a ref because the
   * folder must exist before the upload-review flow can target it: the create
   * mutation's success handler picks this up and calls reviewFile with the new
   * folder id, reusing the standard upload → attach pipeline.
   */
  const folderDialogFileRef = useRef<File | null>(null)

  const queryClient = useQueryClient()
  const filesQuery = useQuery(brainFileListOptions(sessionUploadIds))
  const files = filesQuery.data ?? []
  const sessionUploadIdSet = new Set(sessionUploadIds)
  /** The Penpot top row shows the two newest uploads beside the dropzone. */
  const recentFiles = files.slice(0, 2)

  const foldersQuery = useQuery(brainFolderListOptions())
  const folders = foldersQuery.data ?? []
  const visibleFolders =
    folderScope === 'all'
      ? folders
      : folders.filter((folder) => folder.privacy === folderScope)

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadBrainFile(file, setUploadProgress),
    onMutate: () => setUploadProgress(0),
    onSuccess: async (uploadedFile) => {
      await queryClient.cancelQueries({
        queryKey: brainFileKeys.list(),
        exact: true,
      })

      queryClient.setQueryData<BrainFileSummary[]>(
        brainFileKeys.list(),
        (currentFiles = []) => [
          uploadedFile,
          ...currentFiles.filter((file) => file.id !== uploadedFile.id),
        ],
      )

      if (uploadedFile.status === 'processing') {
        setSessionUploadIds((currentIds) =>
          currentIds.includes(uploadedFile.id)
            ? currentIds
            : [...currentIds, uploadedFile.id],
        )

        void queryClient.invalidateQueries({
          queryKey: brainFileKeys.list(),
          exact: true,
        })
      }

      const folderId = uploadFolderIdRef.current
      uploadFolderIdRef.current = null
      if (folderId !== null) {
        const detail = await addFileToBrainFolder(folderId, uploadedFile.id)
        queryClient.setQueryData(brainFolderKeys.detail(folderId), detail)
        void queryClient.invalidateQueries({
          queryKey: brainFolderKeys.list(),
          exact: true,
        })
      }

      toast.success('A new file has been added', {
        description: truncateMiddle(uploadedFile.name, 56),
      })
    },
    onSettled: () => {
      setUploadProgress(0)
      setSelectedFile(null)
    },
  })

  const retryMutation = useMutation({
    mutationFn: (id: string) => retryBrainFile(id),
    onSuccess: async (retriedFile) => {
      await queryClient.cancelQueries({
        queryKey: brainFileKeys.list(),
        exact: true,
      })

      queryClient.setQueryData<BrainFileSummary[]>(
        brainFileKeys.list(),
        (currentFiles = []) =>
          currentFiles.map((file) =>
            file.id === retriedFile.id ? retriedFile : file,
          ),
      )

      if (retriedFile.status === 'processing') {
        setSessionUploadIds((currentIds) =>
          currentIds.includes(retriedFile.id)
            ? currentIds
            : [...currentIds, retriedFile.id],
        )

        void queryClient.invalidateQueries({
          queryKey: brainFileKeys.list(),
          exact: true,
        })
      }
    },
  })

  const deleteFileMutation = useMutation({
    mutationFn: (id: string) => deleteBrainFile(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<BrainFileSummary[]>(
        brainFileKeys.list(),
        (currentFiles = []) => currentFiles.filter((file) => file.id !== id),
      )
      setPendingDeleteFile(null)
      toast.success('File deleted')
      void queryClient.invalidateQueries({ queryKey: brainFolderKeys.all })
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Could not delete the file.'))
    },
  })

  const createFolderMutation = useMutation({
    mutationFn: (input: { name: string; privacy: 'private' | 'shared' }) =>
      createBrainFolder(input),
    onSuccess: (folder) => {
      queryClient.setQueryData<BrainFolderSummary[]>(
        brainFolderKeys.list(),
        (current = []) => [folder, ...current],
      )
      setFolderDialog(null)
      toast.success('A new folder has been created', {
        description: truncateMiddle(folder.name, 56),
      })

      const attachedFile = folderDialogFileRef.current
      folderDialogFileRef.current = null
      if (attachedFile !== null) reviewFile(attachedFile, folder.id)
    },
  })

  const updateFolderMutation = useMutation({
    mutationFn: (input: {
      id: string
      name?: string
      privacy?: 'private' | 'shared'
    }) => updateBrainFolder(input.id, input),
    onSuccess: (folder) => {
      queryClient.setQueryData<BrainFolderSummary[]>(
        brainFolderKeys.list(),
        (current = []) =>
          current.map((entry) => (entry.id === folder.id ? folder : entry)),
      )
      queryClient.setQueryData(
        brainFolderKeys.detail(folder.id),
        (
          current:
            | { item: BrainFolderSummary; files: BrainFileSummary[] }
            | undefined,
        ) => (current ? { ...current, item: folder } : current),
      )
      setFolderDialog(null)
      toast.success('Folder updated', {
        description: truncateMiddle(folder.name, 56),
      })
    },
  })

  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => deleteBrainFolder(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<BrainFolderSummary[]>(
        brainFolderKeys.list(),
        (current = []) => current.filter((entry) => entry.id !== id),
      )
      queryClient.removeQueries({ queryKey: brainFolderKeys.detail(id) })
      setPendingDeleteFolder(null)
      setActiveFolderId((current) => (current === id ? null : current))
      toast.success('Folder deleted')
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Could not delete the folder.'))
    },
  })

  const addToFolderMutation = useMutation({
    mutationFn: (input: { folderId: string; fileId: string }) =>
      addFileToBrainFolder(input.folderId, input.fileId),
    onSuccess: (detail) => {
      queryClient.setQueryData(brainFolderKeys.detail(detail.item.id), detail)
      void queryClient.invalidateQueries({
        queryKey: brainFolderKeys.list(),
        exact: true,
      })
      toast.success('File added to folder', {
        description: truncateMiddle(detail.item.name, 56),
      })
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Could not add the file to the folder.'))
    },
  })

  const removeFromFolderMutation = useMutation({
    mutationFn: (input: { folderId: string; fileId: string }) =>
      removeFileFromBrainFolder(input.folderId, input.fileId),
    onSuccess: (detail) => {
      queryClient.setQueryData(brainFolderKeys.detail(detail.item.id), detail)
      void queryClient.invalidateQueries({
        queryKey: brainFolderKeys.list(),
        exact: true,
      })
      toast.success('File removed from folder', {
        description: truncateMiddle(detail.item.name, 56),
      })
    },
    onError: (error) => {
      toast.error(
        errorMessage(error, 'Could not remove the file from the folder.'),
      )
    },
  })

  /**
   * Opens the review modal without starting the network upload.
   */
  const reviewFile = (
    file: File | undefined,
    folderId: string | null = null,
  ) => {
    if (file === undefined || uploadMutation.isPending) return
    uploadFolderIdRef.current = folderId
    setSelectedFile(file)
  }

  /**
   * Starts the upload after the user confirms the selected file.
   */
  const confirmUpload = () => {
    if (selectedFile === null || uploadMutation.isPending) return
    uploadMutation.mutate(selectedFile)
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    reviewFile(file, uploadFolderIdRef.current)
  }

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    reviewFile(event.dataTransfer.files[0])
  }

  const openFilePicker = (folderId: string | null = null) => {
    uploadFolderIdRef.current = folderId
    fileInputRef.current?.click()
  }

  const uploadError =
    uploadMutation.error instanceof Error
      ? uploadMutation.error.message
      : uploadMutation.error
        ? 'The file could not be uploaded.'
        : null
  const retryError =
    retryMutation.error instanceof Error
      ? retryMutation.error.message
      : retryMutation.error
        ? 'The file could not be retried.'
        : null

  if (activeFolderId !== null) {
    return (
      <main className="h-full bg-background">
        <BrainFolderDetail
          folderId={activeFolderId}
          uploading={uploadMutation.isPending}
          onBack={() => setActiveFolderId(null)}
          onUploadFile={() => openFilePicker(activeFolderId)}
          onPreviewFile={setPreviewFile}
          onRemoveFile={(file) => {
            removeFromFolderMutation.mutate({
              folderId: activeFolderId,
              fileId: file.id,
            })
          }}
          onDeleteFolder={setPendingDeleteFolder}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept={BRAIN_ACCEPTED_FILE_TYPES}
          className="hidden"
          onChange={handleFileChange}
          aria-label="Choose a document to upload"
        />

        {previewFile ? (
          <BrainFilePreviewDialog
            file={previewFile}
            onClose={() => setPreviewFile(null)}
          />
        ) : null}

        <BrainFileUploadDialog
          file={selectedFile}
          uploading={uploadMutation.isPending}
          progress={uploadProgress}
          onConfirm={confirmUpload}
          onClose={() => setSelectedFile(null)}
        />

        {pendingDeleteFolder ? (
          <DeleteFolderDialog
            folder={pendingDeleteFolder}
            pending={deleteFolderMutation.isPending}
            onConfirm={() =>
              deleteFolderMutation.mutate(pendingDeleteFolder.id)
            }
            onClose={() => setPendingDeleteFolder(null)}
          />
        ) : null}
      </main>
    )
  }

  return (
    <main className="h-full overflow-y-auto bg-background">
      {/* Header band (design: white strip, 24px title + 16px subtitle) */}
      <header className="bg-background-main-default px-6 pt-12 pb-3">
        <div className="mx-auto w-full max-w-[80rem]">
          <h1 className="text-2xl font-semibold tracking-[-0.04em] text-text-neutral-default">
            Files &amp; Folders
          </h1>
          <p className="mt-0.5 text-base text-text-secondary">
            Keep all your documents organized, secure, and accessible in one
            place.
          </p>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[80rem] flex-col gap-10 px-6 py-8">
        {/* Top row (design: 520×152 dashed dropzone + recent document cards) */}
        <section aria-label="Upload">
          <div className="flex flex-wrap items-start gap-4">
            <button
              type="button"
              disabled={uploadMutation.isPending}
              onClick={() => openFilePicker()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              className="flex h-[9.5rem] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border-default bg-background-main-secondary text-center transition-colors hover:bg-background-main-secondary-hover disabled:cursor-wait disabled:opacity-70 sm:w-[32.5rem]"
            >
              <FilePlus className="size-6 text-text-neutral-default" />

              <span className="flex flex-col gap-1">
                <span className="text-sm text-text-neutral-default">
                  Add your documents or drag &amp; drop it here
                </span>
                <span className="text-sm text-text-secondary">
                  Sample docs include: docx, xlx, pdf, etc.
                </span>
              </span>
            </button>

            {recentFiles.length > 0 ? (
              <ul aria-label="Recent files" className="flex flex-wrap gap-4">
                {recentFiles.map((file) => (
                  <RecentFileCard
                    key={file.id}
                    uploadedFile={file}
                    folders={folders}
                    onPreview={setPreviewFile}
                    onAddToFolder={(fileToAdd, folderId) =>
                      addToFolderMutation.mutate({
                        folderId,
                        fileId: fileToAdd.id,
                      })
                    }
                    onDelete={setPendingDeleteFile}
                  />
                ))}
              </ul>
            ) : null}
          </div>

          {uploadError ? (
            <p role="alert" className="mt-3 text-sm text-text-danger-secondary">
              {uploadError}
            </p>
          ) : null}
          {retryError ? (
            <p role="alert" className="mt-3 text-sm text-text-danger-secondary">
              {retryError}
            </p>
          ) : null}
        </section>

        {/* Folders section */}
        <section aria-label="Folders" className="flex flex-col gap-3">
          <div className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-text-neutral-default">
              Folders
            </h2>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div
                role="tablist"
                aria-label="Folder scope"
                className="flex items-center gap-2"
              >
                {FOLDER_TABS.map((tab) => {
                  const active = folderScope === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setFolderScope(tab.id)}
                      className={
                        active
                          ? 'h-8 cursor-pointer rounded-full border border-border-brand-secondary bg-background-brand-tertiary px-4 text-sm text-text-brand-secondary'
                          : 'h-8 cursor-pointer rounded-full border border-border-default bg-background-main-secondary px-4 text-sm text-text-neutral-default transition-colors hover:bg-background-main-secondary-hover'
                      }
                    >
                      {tab.label}
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center gap-4">
                <Button
                  className="h-10 gap-2"
                  onClick={() => setFolderDialog({})}
                >
                  <Plus className="size-4" />
                  Create a folder
                </Button>

                <ViewModePill
                  mode={foldersView}
                  onChange={setFoldersView}
                  label="Folders"
                />
              </div>
            </div>
          </div>

          {foldersQuery.isError ? (
            <div className="flex items-center gap-3 text-sm">
              <p role="alert" className="text-text-danger-secondary">
                Could not load folders.
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={foldersQuery.isFetching}
                onClick={() => void foldersQuery.refetch()}
              >
                {foldersQuery.isFetching ? 'Trying…' : 'Try again'}
              </Button>
            </div>
          ) : visibleFolders.length === 0 ? (
            <div className="flex min-h-[18.5rem] flex-col items-center justify-center gap-4 rounded-xl bg-background-main-secondary px-6 text-center">
              <span className="flex size-12 items-center justify-center">
                <FolderIcon className="size-8 text-icon-neutral-tertiary" />
              </span>
              <div className="flex flex-col gap-1">
                <p className="text-sm text-text-neutral-default">
                  No folders yet
                </p>
                <p className="text-sm text-text-secondary">
                  Create folders to store, share and collaborate on with your
                  team in chat
                </p>
              </div>
              <Button
                variant="outline"
                className="h-10 gap-2"
                onClick={() => setFolderDialog({})}
              >
                <Plus className="size-4" />
                Create a folder
              </Button>
            </div>
          ) : (
            <ul
              className={
                foldersView === 'list'
                  ? 'flex flex-col gap-3'
                  : 'flex flex-wrap gap-4'
              }
            >
              {visibleFolders.map((folder) => (
                <BrainFolderCard
                  key={folder.id}
                  folder={folder}
                  layout={foldersView}
                  onOpen={(entry) => setActiveFolderId(entry.id)}
                  onRename={(entry) => setFolderDialog({ folder: entry })}
                  onDelete={setPendingDeleteFolder}
                />
              ))}
            </ul>
          )}
        </section>

        {/* Knowledge Base section (design title; the old "Your Recent Files"
            label is hidden in the Penpot component) */}
        <section aria-label="Knowledge Base" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-text-neutral-default">
              Knowledge Base
            </h2>

            <div className="flex items-center gap-4">
              <Button
                className="h-10 gap-2"
                disabled={uploadMutation.isPending}
                onClick={() => openFilePicker()}
              >
                <Upload className="size-4" />
                Setup knowledge base
              </Button>

              {/* Design pairs a lone list-dashes icon with the (out-of-scope)
                  filter button; it flips the section between grid and list. */}
              <button
                type="button"
                onClick={() =>
                  setFilesView(filesView === 'grid' ? 'list' : 'grid')
                }
                aria-label={
                  filesView === 'grid'
                    ? 'Switch to list view'
                    : 'Switch to grid view'
                }
                title={
                  filesView === 'grid'
                    ? 'Switch to list view'
                    : 'Switch to grid view'
                }
                className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-icon-neutral-default transition-colors hover:bg-background-main-secondary"
              >
                {filesView === 'grid' ? (
                  <ListDashes className="size-4" weight="regular" />
                ) : (
                  <SquaresFour className="size-4" weight="regular" />
                )}
              </button>
            </div>
          </div>

          {filesQuery.isError ? (
            <div className="flex items-center gap-3 text-sm">
              <p role="alert" className="text-text-danger-secondary">
                {filesQuery.isRefetchError
                  ? 'Could not refresh file statuses.'
                  : 'Could not load files.'}
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={filesQuery.isFetching}
                onClick={() => void filesQuery.refetch()}
              >
                {filesQuery.isFetching ? 'Trying…' : 'Try again'}
              </Button>
            </div>
          ) : files.length === 0 ? (
            <div className="flex min-h-[18.5rem] flex-col items-center justify-center gap-4 rounded-xl bg-background-main-secondary px-6 text-center">
              <span className="flex items-center -space-x-2">
                <img src="/file-types/pdf.svg" alt="" className="size-8" />
                <img src="/file-types/xlsx.svg" alt="" className="size-8" />
                <img src="/file-types/docx.svg" alt="" className="size-8" />
              </span>
              <div className="flex flex-col gap-1">
                <p className="text-sm text-text-neutral-default">
                  Nothing is here yet
                </p>
                <p className="text-sm text-text-secondary">
                  All files or folders used as knowledge base will be shown here
                </p>
              </div>
              <Button
                variant="outline"
                className="h-10 gap-2"
                disabled={uploadMutation.isPending}
                onClick={() => openFilePicker()}
              >
                <Upload className="size-4" />
                Setup knowledge base
              </Button>
            </div>
          ) : (
            <ul
              className={
                filesView === 'list'
                  ? 'flex flex-col gap-3'
                  : 'flex flex-wrap gap-4'
              }
              aria-live="polite"
            >
              {files.map((file) => (
                <BrainFileCard
                  key={file.id}
                  uploadedFile={file}
                  folders={folders}
                  layout={filesView}
                  onPreview={setPreviewFile}
                  onAddToFolder={(fileToAdd, folderId) =>
                    addToFolderMutation.mutate({
                      folderId,
                      fileId: fileToAdd.id,
                    })
                  }
                  onDelete={setPendingDeleteFile}
                  isPolling={
                    file.status === 'processing' &&
                    sessionUploadIdSet.has(file.id) &&
                    !filesQuery.isError
                  }
                  isRetrying={
                    retryMutation.isPending &&
                    retryMutation.variables === file.id
                  }
                  onRetry={(fileToRetry) =>
                    retryMutation.mutate(fileToRetry.id)
                  }
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={BRAIN_ACCEPTED_FILE_TYPES}
        className="hidden"
        onChange={handleFileChange}
        aria-label="Choose a document to upload"
      />

      {previewFile ? (
        <BrainFilePreviewDialog
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      ) : null}

      <BrainFileUploadDialog
        file={selectedFile}
        uploading={uploadMutation.isPending}
        progress={uploadProgress}
        onConfirm={confirmUpload}
        onClose={() => setSelectedFile(null)}
      />

      {folderDialog ? (
        <BrainFolderDialog
          folder={folderDialog.folder ?? null}
          pending={
            createFolderMutation.isPending || updateFolderMutation.isPending
          }
          error={
            folderDialog.folder
              ? updateFolderMutation.error instanceof Error
                ? updateFolderMutation.error.message
                : null
              : createFolderMutation.error instanceof Error
                ? createFolderMutation.error.message
                : null
          }
          onSubmit={(input) => {
            if (folderDialog.folder) {
              updateFolderMutation.mutate({
                id: folderDialog.folder.id,
                name: input.name,
                privacy: input.privacy,
              })
            } else {
              folderDialogFileRef.current = input.file ?? null
              createFolderMutation.mutate({
                name: input.name,
                privacy: input.privacy,
              })
            }
          }}
          onClose={() => {
            setFolderDialog(null)
            folderDialogFileRef.current = null
            createFolderMutation.reset()
            updateFolderMutation.reset()
          }}
        />
      ) : null}

      {pendingDeleteFolder ? (
        <DeleteFolderDialog
          folder={pendingDeleteFolder}
          pending={deleteFolderMutation.isPending}
          onConfirm={() => deleteFolderMutation.mutate(pendingDeleteFolder.id)}
          onClose={() => setPendingDeleteFolder(null)}
        />
      ) : null}

      {pendingDeleteFile ? (
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (!open && !deleteFileMutation.isPending)
              setPendingDeleteFile(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete file</AlertDialogTitle>
              <AlertDialogDescription className="break-words">
                Delete{' '}
                <span className="break-all" title={pendingDeleteFile.name}>
                  {truncateMiddle(pendingDeleteFile.name, 64)}
                </span>
                ? This removes it from the knowledge base and any folders.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteFileMutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={deleteFileMutation.isPending}
                onClick={() => deleteFileMutation.mutate(pendingDeleteFile.id)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </main>
  )
}

/** Shared confirm dialog for folder deletion from the card menu or detail. */
function DeleteFolderDialog({
  folder,
  pending,
  onConfirm,
  onClose,
}: {
  folder: BrainFolderSummary
  pending: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete folder</AlertDialogTitle>
          <AlertDialogDescription className="break-words">
            Delete{' '}
            <span className="break-all" title={folder.name}>
              {truncateMiddle(folder.name, 64)}
            </span>
            ? The files inside stay in the knowledge base.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={onConfirm}
          >
            Delete folder
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
