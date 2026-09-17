/**
 * `Composer` — orchestrator for the chat input box.
 *
 * Task 12 of the 2026-09-08 chat composer overhaul: this replaces the
 * `<Textarea>`-based `Composer` in `../chat-composer.tsx` (1096 lines) with
 * one built on the shared Tiptap editor (`./composer-editor.tsx`, Task 5) and
 * the small view components built in Tasks 6-11 (`./composer-toolbar`,
 * `./composer-add-menu`, `./composer-tools-menu`, `./composer-agent-select`).
 *
 * Ported as-is (proven, not part of the redesign): attachment state and its
 * add/remove/paste/drag-drop handlers, the drag-depth counter, the
 * selected-document-chip state and `hasStaleDocumentSelection` guard, the
 * attachment/selected-document preview chip rows, the `StructuredInputPanel`
 * mount, the hidden file `<input>`, and the send/stop button's exact class
 * logic (see `ComposerFooter` below).
 *
 * Removed entirely (member-mention + inline skill-trigger machinery): the
 * hand-rolled `@`/`/` detection, `selectedMemberMentions`,
 * `serializeMemberMentions`, `rebaseMemberMentions`,
 * `resolveMemberMentionTextEdit`, `detectMemberMentionTrigger`,
 * `detectSkillTrigger`, `applyMemberSelection`, `applySkillSelection`, the
 * highlighted-index/menu-dismissed state, and the two `<Command>` popovers.
 * The shared Tiptap editor's mention extension (members-only, per
 * `composer-editor.tsx`) and its `/` skill-suggestion popup replace all of
 * this; `/slug` tokens remain literal text in the committed markdown
 * (2026-09-08 spec §12), unchanged from before.
 *
 * See task-12-rulings.md for the controller rulings this implementation
 * follows (editor-instance-in-state, the `ComposerHandle.setDraft` escape
 * hatch, no `permissionMode` props, `editorHasContent` seeded from `input`).
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import { useQuery } from '@tanstack/react-query'
import { Result } from 'better-result'
import type { Editor } from '@tiptap/core'
import {
  ArrowUp,
  FileText,
  Loader2,
  Mic,
  Paperclip,
  StopCircle,
  X,
} from 'lucide-react'
import { Button } from '@garden/ui/components/ui/button'
import { cn } from '@garden/ui/lib/utils'
import { SpeechInput } from '@/components/ai-elements/speech-input'
import { uploadFile } from '@/lib/api'
import { agentSkillListOptions } from '@/lib/workspace/queries'
import { useWorkspaceId } from '@garden/app-state/hooks'
import type { UploadResult } from '@garden/app-state/hooks/use-file-upload'
import type { SkillSuggestionItem } from '@/features/editor/extensions'
import type {
  StructuredQuestion,
  StructuredQuestionAnswers,
} from '@garden/app-state/chat'
import {
  type ComposerSkill,
  type RealtimeStatus,
} from '../../chat-runtime-provider'
import { formatSkillInvocation } from '../skill-invocation'
import { searchComposerSkills } from '../skill-search'
import { StructuredInputPanel } from '../structured-input-panel'
import type { SelectedThreadDocument } from '../document-selection'
import {
  FileKindIcon,
  getFileKind,
  getFileKindLabel,
} from '../chat-document-panel'
import {
  ACCEPTED_FILE_TYPES,
  COMPOSER_WIDTH_CLASS_NAME,
  normalizeStatus,
  type ComposerThreadDocument,
  type PreviewAttachment,
} from './composer-helpers'
import { ComposerEditor, type ComposerEditorHandle } from './composer-editor'
import { ComposerToolbar } from './composer-toolbar'
import { ComposerAddMenu } from './composer-add-menu'
import { ComposerToolsMenu } from './composer-tools-menu'
import { ComposerSourcesMenu } from './composer-sources-menu'
import { ComposerAgentSelect } from './composer-agent-select'
import { ComposerExtensionRow } from './composer-extension-row'
import {
  DEFAULT_TOOL_PRESET_ID,
  TOOL_PRESET_IDS_WITH_SOURCES,
  type ToolPresetId,
} from './composer-tools'

/** Stable no-op so an absent `onOpenConnections` doesn't change identity. */
function noop() {}

/**
 * Imperative handle exposed by `Composer`. `setDraft` lets a caller (the
 * suggestion pills, Task 13) push text straight into the live editor.
 *
 * Why this exists: `ContentEditor`'s `defaultValue` only seeds the editor on
 * mount — its re-sync effect bails once the editor is editable. So
 * `onInputChange(starter)` alone updates the chat-store draft but leaves the
 * on-screen editor untouched once it has been created. `setDraft` is the
 * escape hatch, delegating to `ComposerEditor`'s imperative `setMarkdown`.
 */
export interface ComposerHandle {
  /** Replace the draft in the live editor and focus it. */
  setDraft: (markdown: string) => void
  /**
   * Put a queued send back into the composer so it can be edited before it
   * goes out (2026-09-16 message-queue design, the pencil action on a queue
   * row). Restores the whole payload, not just the prose: a queued message can
   * carry attachments and selected thread documents, and dropping those on the
   * way back would quietly change what the person is about to send.
   */
  restoreDraft: (payload: {
    markdown: string
    files: File[]
    selectedDocumentIds: string[]
  }) => void
}

export interface ComposerProps {
  agentId: string
  documentLoadState: 'error' | 'loading' | 'ready'
  documents: ComposerThreadDocument[]
  isStreaming: boolean
  status: RealtimeStatus
  input: string
  onInputChange: (value: string) => void
  onSend: (payload: {
    text: string
    files: File[]
    selectedDocuments: SelectedThreadDocument[]
  }) => Promise<void>
  onStop: () => void
  onWarmRuntime?: () => void
  pendingQuestions?: StructuredQuestion[]
  onSubmitAnswers?: (answers: StructuredQuestionAnswers) => void
  /**
   * Opens the Connections dock panel. Two things below reach for it: the
   * extension row's "Connect your apps" strip, and the tools menu's sources
   * panel (`composer-tools-menu.tsx`), whose rows each connect one provider.
   * Optional, so a caller that has no Connections surface can leave it out —
   * both call sites fall back to `noop`.
   */
  onOpenConnections?: () => void
  /** Falls back to this agent when the chat store has no selectedAgentId. */
  fallbackAgentId?: string | null
  /**
   * Slot rendered directly above the pill, inside its width wrapper — the
   * queued-message slab (`../chat-message-queue.tsx`, 2026-09-16 design).
   *
   * A slot rather than a `queuedMessages` prop: the queue's contents, ordering
   * and actions belong to the controller that owns the send pipeline, and the
   * composer only needs to know where the thing goes. It has to be here and
   * not in the controller's own markup because the slab tucks behind the pill
   * the way `ComposerExtensionRow` does, which needs the two to be siblings
   * under the same `COMPOSER_WIDTH_CLASS_NAME` wrapper.
   */
  queue?: ReactNode
}

/**
 * Uploads one file via the generic attachment endpoint (`@/lib/api`'s
 * `uploadFile`) and adapts the response into the `UploadResult` shape
 * `ContentEditor`'s inline upload pipeline expects (see
 * `apps/web/src/features/issues/components/comment-input.tsx` for the
 * pattern this mirrors). Composer has no `threadId` prop — unlike
 * `uploadAgentDocuments` (thread-scoped document persistence, still used by
 * the `+` menu's flow in the parent controller) — so inline editor uploads
 * (paste/drop *inside* the rich-text field, e.g. an inline image) go through
 * this untargeted upload instead. No `try`/`catch` (repo uses
 * `better-result`); a failed upload resolves to `null`, which
 * `uploadAndInsertFile` (in the shared editor) treats as "upload failed,
 * leave a failure marker" rather than throwing.
 */
async function uploadComposerFile(file: File): Promise<UploadResult | null> {
  const result = await Result.tryPromise({
    try: () => uploadFile(file),
    catch: (error) =>
      error instanceof Error ? error : new Error(String(error)),
  })
  if (result.isErr()) return null
  const attachment = result.value
  return {
    id: attachment.id,
    filename: attachment.filename,
    link: attachment.url,
  }
}

/**
 * `ComposerFooter` — bottom row of the composer pill: left cluster (`+`
 * attachment menu, tools menu, and the sources menu when the selected tool
 * has one), right cluster (mic, agent select, send/stop button).
 *
 * The send/stop button's class names and its `isStreaming` / `isSubmitted` /
 * `hasStaleDocumentSelection` / `hasContent` branching are copied verbatim
 * from the pre-Tiptap `../chat-composer.tsx` (~lines 1021-1076) per
 * task-12-rulings.md — deliberately not collapsed into a single simplified
 * enum, because the original lets the glow (armed) styling and the disabled
 * attribute vary independently (a stale document selection disables the
 * button without suppressing the glow) and rulings require that exact
 * behavior, not a redesign.
 */
function ComposerFooter(props: {
  addMenu: ReactNode
  toolsMenu: ReactNode
  /**
   * The `Sources` control, or null. Null rather than a boolean flag because
   * only the caller knows whether the selected tool draws on sources
   * (`TOOL_PRESET_IDS_WITH_SOURCES`) and what connecting one should do; this
   * row just places whatever it is given next to the tools trigger.
   */
  sourcesMenu: ReactNode
  agentSelect: ReactNode
  onMicTranscription: (value: string) => void
  isStreaming: boolean
  hasContent: boolean
  isSubmitted: boolean
  hasStaleDocumentSelection: boolean
  onSend: () => void
  onStop: () => void
}) {
  const {
    addMenu,
    toolsMenu,
    sourcesMenu,
    agentSelect,
    onMicTranscription,
    isStreaming,
    hasContent,
    isSubmitted,
    hasStaleDocumentSelection,
    onSend,
    onStop,
  } = props

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center">
        {addMenu}
        {toolsMenu}
        {sourcesMenu}
      </div>
      <div className="flex items-center gap-2">
        {/*
          Rendered only while there is nothing to send — 2026-09-08 spec §8.2
          ("shown when the editor is empty"), matching the original at
          chat-composer.tsx:962-971.

          Deliberately passes NO `disabled` prop. SpeechInput destructures only
          className / onTranscriptionChange / onAudioRecorded / lang, so a
          `disabled` we pass falls into `...props` and is spread onto its inner
          <Button> AFTER that button's own `disabled={isDisabled}` — the
          caller's value wins and silently defeats the component's readiness
          gate. That gate covers mode === 'none', media-recorder without
          onAudioRecorded, and isProcessing, so overriding it renders the mic
          clickable-but-inert on Safari/Firefox and unsupported browsers.
          Let SpeechInput gate itself.
        */}
        {!isStreaming && !hasContent ? (
          <SpeechInput
            variant="ghost"
            size="icon"
            className="size-8 rounded-sm text-icon-default"
            onTranscriptionChange={onMicTranscription}
          >
            <Mic className="size-4" />
          </SpeechInput>
        ) : null}
        {agentSelect}
        {/*
          Stop and send are no longer mutually exclusive. They were before the
          2026-09-16 message-queue design, which meant a turn in flight hid the
          send button and left mid-reply typing with nowhere to go. Now the
          stop button stays for the whole turn — interrupting is never taken
          away — and the send button joins it as soon as there is something to
          send, queueing that payload behind the running reply.
        */}
        {isStreaming ? (
          <Button
            type="button"
            className="size-8 rounded-xl bg-background-danger-default text-text-danger-on-danger transition-all duration-150 hover:scale-105 hover:bg-background-danger-default-hover"
            onClick={onStop}
            aria-label="Stop generation"
          >
            <StopCircle className="size-4" />
          </Button>
        ) : null}
        {isStreaming && !hasContent ? null : (
          <Button
            type="button"
            className={cn(
              'size-8 rounded-xl transition-all duration-150 hover:scale-105 disabled:opacity-100 disabled:hover:scale-100',
              hasContent
                ? 'bg-background-brand-secondary text-icon-brand-default hover:bg-background-brand-secondary-hover'
                : 'bg-background-disabled-default text-icon-disabled',
            )}
            onClick={onSend}
            disabled={isSubmitted || hasStaleDocumentSelection || !hasContent}
            aria-label={
              isSubmitted
                ? 'Sending'
                : isStreaming
                  ? 'Queue message'
                  : 'Send message'
            }
          >
            {isSubmitted ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowUp className="size-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

export const Composer = forwardRef<ComposerHandle, ComposerProps>(
  function Composer(
    {
      agentId,
      documentLoadState,
      documents,
      isStreaming,
      status,
      input,
      onInputChange,
      onSend,
      onStop,
      onWarmRuntime,
      onOpenConnections,
      pendingQuestions,
      onSubmitAnswers,
      fallbackAgentId,
      queue,
    },
    ref,
  ) {
    const [attachments, setAttachments] = useState<PreviewAttachment[]>([])
    const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([])
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const editorRef = useRef<ComposerEditorHandle>(null)
    const workspaceId = useWorkspaceId()

    // Editor instance in STATE, not just a ref (task-12-rulings.md #1):
    // `onEditorReady` fires inside `useEditor`'s `onCreate`, and a ref
    // assignment alone triggers no re-render — `<ComposerToolbar editor={...}
    // />` would render null forever. The ref is kept alongside for the
    // stable `onSkillSelect` closure below (an imperative read, not a
    // render read).
    const [editorInstance, setEditorInstance] = useState<Editor | null>(null)
    const editorInstanceRef = useRef<Editor | null>(null)

    // Drives the armed/disabled render below only. `handleSubmit` does NOT
    // read this — it reads the live document through
    // `editorRef.current.getMarkdown()`, which is an imperative Tiptap read
    // and therefore never stale, whatever React has or hasn't re-rendered.
    // Seeded from `input` (not `''`) so a restored draft arms the send button
    // on mount.
    const [editorMarkdown, setEditorMarkdown] = useState(input)

    const [toolPreset, setToolPreset] = useState<ToolPresetId>(
      DEFAULT_TOOL_PRESET_ID,
    )

    const selectedDocuments = useMemo(
      () =>
        selectedDocumentIds.flatMap((documentId) => {
          const document = documents.find(
            (candidate) => candidate.documentId === documentId,
          )
          return document ? [document] : []
        }),
      [documents, selectedDocumentIds],
    )
    const hasStaleDocumentSelection =
      selectedDocuments.length !== selectedDocumentIds.length

    // Drag depth counter — dragenter/dragleave fire for child elements too,
    // so nested entries/exits must be counted to know when the pointer has
    // actually left the drop zone. Ported as-is from `chat-composer.tsx:256-259`.
    const dragDepthRef = useRef(0)
    const [isDragging, setIsDragging] = useState(false)

    // Track latest attachments in a ref so unmount cleanup doesn't fire on
    // every re-render (a plain per-render effect would revoke URLs still
    // referenced by rendered <img src=...> nodes). Revocation on
    // remove/clear happens inline in the event handlers below. This is the
    // one tolerated `useEffect` (unmount-only cleanup), matching the
    // ref-mirror pattern already in the original.
    const attachmentsRef = useRef(attachments)
    attachmentsRef.current = attachments
    useEffect(() => {
      return () => {
        attachmentsRef.current.forEach((item) =>
          URL.revokeObjectURL(item.previewUrl),
        )
      }
    }, [])

    const clearAttachments = () => {
      attachments.forEach((item) => URL.revokeObjectURL(item.previewUrl))
      setAttachments([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }

    const handleFiles = (fileList: FileList | File[] | null) => {
      if (!fileList) return
      const array = Array.isArray(fileList) ? fileList : Array.from(fileList)
      if (array.length === 0) return
      const next = array.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      }))
      setAttachments((current) => [...current, ...next])
    }

    // Paste now attaches to the editor's pill wrapper (a plain `div`), not a
    // textarea — the rich-text field owns text paste itself.
    const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
      const files = Array.from(event.clipboardData?.files ?? [])
      if (files.length === 0) return
      event.preventDefault()
      handleFiles(files)
    }

    const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
      if (!event.dataTransfer?.types?.includes('Files')) return
      event.preventDefault()
      dragDepthRef.current += 1
      setIsDragging(true)
    }

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
      if (!event.dataTransfer?.types?.includes('Files')) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
    }

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
      if (!event.dataTransfer?.types?.includes('Files')) return
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
      if (dragDepthRef.current === 0) setIsDragging(false)
    }

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
      if (!event.dataTransfer?.types?.includes('Files')) return
      event.preventDefault()
      dragDepthRef.current = 0
      setIsDragging(false)
      handleFiles(event.dataTransfer.files)
    }

    /**
     * Feeds one `onChange` from `ComposerEditor` into both the local markdown
     * state (which drives the render-time `editorHasContent` derivation) and
     * the parent's chat-store draft.
     */
    const handleEditorChange = useCallback(
      (markdown: string) => {
        setEditorMarkdown(markdown)
        onInputChange(markdown)
      },
      [onInputChange],
    )

    /**
     * Submit the composer. Text now comes straight from the editor as
     * Markdown — no member-mention serialization step; the shared editor's
     * mention extension already emits mention tokens in `getMarkdown()`.
     * Skill `/slug` tokens are literal text, unchanged (2026-09-08 spec
     * §12).
     *
     * Text comes from `editorRef.current.getMarkdown()` — an imperative read
     * of the live Tiptap document, so it is never stale regardless of React's
     * render timing. It deliberately does NOT read `editorMarkdown` (state)
     * or any mirror of it.
     */
    const handleSubmit = async () => {
      // Submitting mid-turn is no longer an implicit "stop". Before the
      // 2026-09-16 message-queue design, `isStreaming` here aborted the run,
      // so pressing Enter while the agent was mid-reply killed it and dropped
      // the text. Now the submit always hands the payload to `onSend`; the
      // controller parks it in the queue when a turn is in flight and sends it
      // when that turn ends. Stopping stays an explicit press of the stop
      // button, which is wired straight to `onStop` in `ComposerFooter`.
      if (normalizeStatus(status) === 'submitted') return

      const text = (editorRef.current?.getMarkdown() ?? '').trim()
      if (
        (!text && attachments.length === 0 && selectedDocuments.length === 0) ||
        hasStaleDocumentSelection
      ) {
        return
      }
      const files = attachments.map((item) => item.file)
      editorRef.current?.clear()
      setEditorMarkdown('')
      onInputChange('')
      clearAttachments()
      setSelectedDocumentIds([])
      await onSend({ text, files, selectedDocuments })
    }

    useImperativeHandle(
      ref,
      () => ({
        setDraft: (markdown: string) => {
          setEditorMarkdown(markdown)
          editorRef.current?.setMarkdown(markdown)
        },
        restoreDraft: ({
          markdown,
          files,
          selectedDocumentIds: documentIds,
        }) => {
          setEditorMarkdown(markdown)
          editorRef.current?.setMarkdown(markdown)
          handleFiles(files)
          setSelectedDocumentIds((current) => [
            ...current,
            ...documentIds.filter((id) => !current.includes(id)),
          ])
        },
      }),
      [],
    )

    const skillsQuery = useQuery({
      ...agentSkillListOptions(workspaceId, agentId),
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      placeholderData: (previous) => previous,
    })
    const skills = useMemo<ComposerSkill[]>(
      () =>
        (skillsQuery.data ?? [])
          .filter((skill) => skill.enabled)
          .map((skill) => ({
            id: skill.id,
            slug: skill.slug ?? skill.name,
            name: skill.name,
            description: skill.description,
          })),
      [skillsQuery.data],
    )
    const skillItems = useCallback(
      ({ query }: { query: string }) =>
        searchComposerSkills(skills, query).map((skill) => ({
          id: skill.id,
          slug: skill.slug ?? skill.name,
          name: skill.name,
          description: skill.description,
        })),
      [skills],
    )
    /**
     * Commits a `/` skill selection from the editor's suggestion popup by
     * inserting the literal `/slug ` token at the trigger range — the same
     * committed format `extractExplicitSkillSlugs` (skill-invocation.ts)
     * already parses server-side, so nothing downstream needs to change.
     */
    const onSkillSelect = useCallback(
      (item: SkillSuggestionItem, range: { from: number; to: number }) => {
        const editor = editorInstanceRef.current
        if (!editor) return
        editor
          .chain()
          .focus()
          .insertContentAt(range, `${formatSkillInvocation(item.slug)} `)
          .run()
      },
      [],
    )

    /**
     * Click-to-focus for the whole composer pill.
     *
     * Before: the pill's handler was `onClick` guarded by
     * `event.target === event.currentTarget`, so only a click landing on the
     * pill element itself focused the editor. Every layout box inside it — the
     * gaps the `flex-col gap-3` opens between toolbar, editor and footer, the
     * footer's own row wrapper, the blank space beside the agent select — is a
     * descendant, so the guard rejected it and the click went nowhere. The pill
     * reads as one input field, so the dead zones felt broken.
     *
     * After: any mousedown inside the pill focuses the editor, except on the
     * editor itself (ProseMirror places the caret at the click position — far
     * better than our `focus("end")`) and on real controls, whose own focus and
     * activation must not be stolen.
     *
     * `onMouseDown` + `preventDefault`, not `onClick`: by click time the browser
     * has already moved focus and begun a text selection from the chrome, so
     * focusing there fights what just happened. Preventing the default on
     * mousedown stops both before they start. This mirrors
     * `handleContainerMouseDown` in `@/features/editor/content-editor.tsx`,
     * which solves the same problem one level down for the editor's own padding.
     */
    const handlePillMouseDown = useCallback(
      (event: ReactMouseEvent<HTMLDivElement>) => {
        const target = event.target as HTMLElement
        if (target.closest('.ProseMirror')) return
        if (
          target.closest(
            'a, button, input, textarea, select, label, [role="button"], [role="menuitem"], [role="combobox"], [contenteditable="true"], [data-node-view-wrapper], [data-composer-keep-focus]',
          )
        ) {
          return
        }
        event.preventDefault()
        editorRef.current?.focus()
      },
      [],
    )

    const editorHasContent = editorMarkdown.trim().length > 0
    const hasContent =
      editorHasContent || attachments.length > 0 || selectedDocuments.length > 0
    const isSubmitted = normalizeStatus(status) === 'submitted'

    return (
      <div className="shrink-0 px-4 pb-3">
        {selectedDocumentIds.length > 0 ? (
          <div
            className={cn(
              'mx-auto mb-2 flex gap-2 overflow-x-auto pb-1',
              COMPOSER_WIDTH_CLASS_NAME,
            )}
          >
            {selectedDocumentIds.map((documentId) => {
              const document = documents.find(
                (candidate) => candidate.documentId === documentId,
              )
              return (
                <div
                  key={documentId}
                  className={cn(
                    'group relative flex h-14 w-52 shrink-0 items-center gap-2.5 rounded-lg border bg-muted/40 px-3',
                    !document && 'border-destructive/40',
                  )}
                >
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-xs font-medium">
                      {document?.filename ?? 'Document unavailable'}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {document?.meta ?? 'Remove and select it again'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedDocumentIds((current) =>
                        current.filter((id) => id !== documentId),
                      )
                    }
                    className="absolute right-1 top-1 rounded-full bg-background/85 p-1 text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    aria-label={`Remove ${document?.filename ?? 'unavailable document'}`}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )
            })}
          </div>
        ) : null}

        {attachments.length > 0 ? (
          <div
            className={cn(
              'mx-auto mb-2 flex gap-2 overflow-x-auto pb-1',
              COMPOSER_WIDTH_CLASS_NAME,
            )}
          >
            {attachments.map((item) => {
              const kind = getFileKind({
                mediaType: item.file.type,
                filename: item.file.name,
              })
              const isImage = kind === 'image'
              return (
                <div
                  key={item.id}
                  className={cn(
                    'group relative shrink-0 overflow-hidden rounded-lg border bg-muted/40',
                    isImage
                      ? 'h-20 w-24'
                      : 'flex h-20 w-44 items-center gap-2.5 px-3',
                  )}
                  title={item.file.name}
                >
                  {isImage ? (
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <>
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-background/70">
                        <FileKindIcon
                          kind={kind}
                          className="text-foreground/70"
                        />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-xs font-medium leading-tight">
                          {item.file.name}
                        </span>
                        <span className="text-xs uppercase tracking-wide text-muted-foreground/70">
                          {getFileKindLabel(kind)}
                        </span>
                      </div>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setAttachments((current) => {
                        const next = current.filter(
                          (entry) => entry.id !== item.id,
                        )
                        URL.revokeObjectURL(item.previewUrl)
                        return next
                      })
                    }
                    className="absolute right-1 top-1 rounded-full bg-background/85 p-1 text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    aria-label={`Remove ${item.file.name}`}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )
            })}
          </div>
        ) : null}

        <div className={cn('mx-auto', COMPOSER_WIDTH_CLASS_NAME)}>
          {/*
            Queued messages slab — the mirror of `ComposerExtensionRow` below:
            it renders here, as a sibling of the pill inside this wrapper, so
            it can tuck behind the pill's rounded top edge and read as one
            shape. It disappears on its own when the queue is empty.
          */}
          {queue}
          <div
            data-testid="composer-pill"
            className={cn(
              'relative z-10 flex flex-col gap-3 rounded-2xl border border-border-default bg-background-main-default p-4 shadow-5 transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-border-brand-secondary focus-within:border-border-brand-secondary',
              /*
               * The I-beam advertises `handlePillMouseDown`: the chrome around
               * the editor is clickable as text, so it should look clickable as
               * text. Without this the pill showed the arrow everywhere except
               * over the editor's own line, which read as "only that line is the
               * field" — the same wrong impression the dead click zones gave.
               *
               * The `:is(...)` reset is required, not belt-and-braces. `cursor`
               * is an inherited property and Tailwind v4's preflight sets no
               * cursor on `button` (checked the installed `preflight.css`), so
               * `cursor-text` alone would inherit straight into every control in
               * the toolbar and footer. `cursor-auto` restores exactly what they
               * had before, since nothing here declared a cursor of its own.
               *
               * The selector list mirrors the skip list in
               * `handlePillMouseDown` above — same elements, same reason — but
               * is written out literally because Tailwind scans source
               * statically and cannot read a shared constant. Keep the two in
               * step; `a`, `[contenteditable]` and `[data-node-view-wrapper]`
               * are omitted here only because they live inside `.ProseMirror`,
               * which sets its own cursor.
               */
              'cursor-text [&_:is(button,input,textarea,select,label,[role=button],[role=menuitem],[role=combobox],[data-composer-keep-focus])]:cursor-auto',
              isDragging && 'border-dashed border-border-brand-secondary',
            )}
            onMouseDown={handlePillMouseDown}
            onPointerEnter={onWarmRuntime}
            onPaste={handlePaste}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isDragging ? (
              <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-2xl border border-dashed border-border-brand-secondary bg-background-brand-tertiary/70 backdrop-blur-[1px]">
                <div className="flex items-center gap-2 rounded-pill bg-background-main-default/90 px-3 py-1.5 text-xs font-medium text-text-default shadow-2">
                  <Paperclip className="size-3.5 text-icon-brand-secondary" />
                  Drop to attach
                </div>
              </div>
            ) : null}
            {pendingQuestions &&
            pendingQuestions.length > 0 &&
            onSubmitAnswers ? (
              /*
               * `data-composer-keep-focus` opts this subtree out of the pill's
               * click-to-focus (see `handlePillMouseDown`). While the agent is
               * asking structured questions the panel — not the editor — is what
               * the user is answering, so a click on its padding must not yank
               * the caret down into the composer mid-answer.
               */
              <div data-composer-keep-focus>
                <StructuredInputPanel
                  questions={pendingQuestions}
                  onSubmit={onSubmitAnswers}
                  disabled={isStreaming}
                />
              </div>
            ) : null}
            <ComposerToolbar
              editor={editorInstance}
              disabled={!editorHasContent}
            />
            <ComposerEditor
              ref={editorRef}
              draft={input}
              onChange={handleEditorChange}
              onSubmit={() => void handleSubmit()}
              onUploadFile={uploadComposerFile}
              onEditorReady={(editor) => {
                editorInstanceRef.current = editor
                setEditorInstance(editor)
              }}
              skillItems={skillItems}
              onSkillSelect={onSkillSelect}
            />
            <ComposerFooter
              addMenu={
                <ComposerAddMenu
                  onUploadClick={() => fileInputRef.current?.click()}
                />
              }
              toolsMenu={
                <ComposerToolsMenu
                  presetId={toolPreset}
                  onPresetChange={setToolPreset}
                />
              }
              sourcesMenu={
                TOOL_PRESET_IDS_WITH_SOURCES.has(toolPreset) ? (
                  <ComposerSourcesMenu onConnect={onOpenConnections ?? noop} />
                ) : null
              }
              agentSelect={
                <ComposerAgentSelect
                  fallbackAgentId={fallbackAgentId ?? agentId}
                />
              }
              onMicTranscription={(value) =>
                editorRef.current?.insertText(value)
              }
              isStreaming={isStreaming}
              hasContent={hasContent}
              isSubmitted={isSubmitted}
              hasStaleDocumentSelection={hasStaleDocumentSelection}
              onSend={() => void handleSubmit()}
              onStop={() => void onStop()}
            />
          </div>
          {/*
            The extension row sits BENEATH the pill as its own slab — the pill
            above keeps its full rounded border and focus ring, per
            task-12-rulings.md #6 and the reference screenshot. Rendering it
            here (inside the same COMPOSER_WIDTH_CLASS_NAME wrapper) keeps it aligned with the
            pill and, because the controller wraps this whole subtree in its
            lift `motion.div`, it animates with the composer rather than
            jumping independently (spec §9).
          */}
          <ComposerExtensionRow onOpenConnections={onOpenConnections ?? noop} />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          hidden
          data-testid="composer-file-input"
          accept={ACCEPTED_FILE_TYPES}
          multiple
          onChange={(event) => {
            handleFiles(event.target.files)
            // Reset so re-selecting the same file re-triggers change.
            event.target.value = ''
          }}
        />
      </div>
    )
  },
)
