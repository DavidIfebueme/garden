import { createFileRoute } from '@tanstack/react-router'
import { BrainFilesPage } from '@/features/brain'

export const Route = createFileRoute('/_authenticated/_app/files')({
  component: FilesRoute,
})

/**
 * Files & Folders surface (Penpot "Files & Folders [DEV READY]"): upload
 * dropzone, folder grid with private/shared scope tabs, and recent files.
 */
function FilesRoute() {
  return <BrainFilesPage />
}
