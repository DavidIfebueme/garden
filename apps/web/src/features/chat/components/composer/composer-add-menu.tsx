/**
 * ComposerAddMenu — the `+` dropdown for adding files and documents to the chat.
 *
 * Extracted from `chat-composer.tsx` (~lines 945-1020). Trigger glyph changed from
 * `Paperclip` to `Plus` per 2026-09-08 spec §8.1.
 *
 * Fully controlled: documents, their load state, and selected document IDs come
 * in as props; toggle and upload events go out through callbacks. No internal
 * state or fetching.
 *
 * Two sections:
 *   1. "Add context" — the "Upload from computer" menu item that fires
 *      `onUploadClick`.
 *   2. "Documents in this chat" — a list of available documents from the
 *      current thread, with checkboxes for inclusion. Each checkbox fires
 *      `onToggleDocument(documentId, checked)`.
 *
 * Load states (loading/error/empty) are rendered as disabled menu items, per
 * the original implementation.
 *
 * Sources: chat-composer.tsx ~945-1020; @garden/ui DropdownMenu components
 * (Base UI Menu under the hood); lucide-react Plus icon.
 */

import { FileText, Loader2, Paperclip, Plus } from 'lucide-react'
import { Button } from '@garden/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@garden/ui/components/ui/dropdown-menu'
import type { ComposerThreadDocument } from './composer-helpers'

export function ComposerAddMenu(props: {
  documents: ComposerThreadDocument[]
  documentLoadState: 'error' | 'loading' | 'ready'
  selectedDocumentIds: string[]
  onToggleDocument: (documentId: string, checked: boolean) => void
  onUploadClick: () => void
}): JSX.Element {
  const {
    documents,
    documentLoadState,
    selectedDocumentIds,
    onToggleDocument,
    onUploadClick,
  } = props

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 rounded-sm text-icon-default"
            aria-label="Add files"
          >
            <Plus className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Add context</DropdownMenuLabel>
          <DropdownMenuItem onClick={onUploadClick}>
            <Paperclip className="size-4" />
            Upload from computer
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Documents in this chat</DropdownMenuLabel>
          {documentLoadState === 'loading' ? (
            <DropdownMenuItem disabled>
              <Loader2 className="size-4 animate-spin" />
              Loading documents…
            </DropdownMenuItem>
          ) : documentLoadState === 'error' ? (
            <DropdownMenuItem disabled>
              Couldn't load documents
            </DropdownMenuItem>
          ) : documents.length === 0 ? (
            <DropdownMenuItem disabled>
              No documents in this chat yet
            </DropdownMenuItem>
          ) : (
            documents.map((document) => (
              <DropdownMenuCheckboxItem
                key={document.documentId}
                checked={selectedDocumentIds.includes(document.documentId)}
                onCheckedChange={(checked) =>
                  onToggleDocument(document.documentId, checked)
                }
              >
                <FileText className="size-4" />
                <span className="min-w-0 flex-1 truncate">
                  {document.filename}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {document.versionNumber
                    ? `V${document.versionNumber}`
                    : document.meta}
                </span>
              </DropdownMenuCheckboxItem>
            ))
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
