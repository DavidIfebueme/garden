import { createFileRoute } from '@tanstack/react-router'
import { Folder } from '@phosphor-icons/react'

export const Route = createFileRoute('/_authenticated/_app/files')({
  component: FilesRoute,
})

/**
 * Files & Folders surface — new in the redesign (Penpot "Files & Folders [DEV
 * READY]"). This placeholder only stakes out the route + nav position; the full
 * surface (folders, private/shared scope, connector-sourced files, dropzone) is
 * its own redesign pass with a data-model mini-plan.
 */
function FilesRoute() {
  return (
    <section className="flex h-full flex-1 items-center justify-center px-6">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <span className="flex size-10 items-center justify-center rounded-md bg-background-main-secondary">
          <Folder
            weight="regular"
            className="size-5 text-icon-neutral-tertiary"
          />
        </span>
        <h1 className="text-sm font-medium text-text-neutral-default">
          Files &amp; Folders
        </h1>
        <p className="text-sm text-text-secondary">
          Documents, folders, and connector-sourced files land here in the
          redesign pass.
        </p>
      </div>
    </section>
  )
}
