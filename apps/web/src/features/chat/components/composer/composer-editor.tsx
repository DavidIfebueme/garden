/**
 * ComposerEditor — the chat composer's rich-text field.
 *
 * Per the 2026-09-08 chat composer overhaul spec (§5/§6), the old chat
 * composer used a plain `<textarea>` with hand-rolled cursor math for `@`
 * mentions and `/` skill triggers (see the now-superseded `chat-composer.tsx`
 * `detectSkillTrigger`/`detectMemberMentionTrigger` machinery). This wraps
 * the shared `ContentEditor` (Tiptap) instead, configured for chat:
 * members-only `@` mentions, a `/` skill-suggestion popup, submit-on-Enter,
 * and no bubble menu (chat uses a persistent toolbar — Task 3 — instead of
 * the shared floating one).
 *
 * Contract: `defaultValue={draft}` SEEDS the editor once on mount (it is
 * uncontrolled afterwards — the editor owns the live document); every edit
 * is written back to the parent via `onUpdate={onChange}`, which the parent
 * (a Zustand chat-store draft field) persists. This mirrors the old
 * textarea's `value={input}` / `onChange={onInputChange}` contract from
 * `chat-composer.tsx`, just uncontrolled-after-mount instead of fully
 * controlled — Tiptap has no realistic controlled-value mode.
 *
 * `debounceMs={0}`: `ContentEditor` debounces `onUpdate` at 300ms by default
 * (content-editor.tsx) to avoid thrashing expensive consumers (autosave,
 * etc). The composer's send-button armed/disabled state derives from this
 * same callback (via the chat-store draft), and the old textarea updated
 * that state synchronously on every keystroke. At the default 300ms, typing
 * a character and immediately clicking send can hit a still-disabled
 * button. Chat drafts are cheap to persist (a single Zustand store write),
 * so the debounce buys nothing here and only reintroduces that races.
 *
 * `mentionTypes={CHAT_MENTION_TYPES}` (team verdict, spec §12): chat's `@`
 * stays members-only, matching pre-Tiptap behavior. Without this the shared
 * mention popup would start offering agents, issues and `@all` in chat,
 * which it never did before. Declared as a module-level constant so its
 * array identity is stable across renders (an inline array literal would
 * change identity every render and could retrigger extension rebuilds).
 */

import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react'
import type { Editor } from '@tiptap/core'
import { ContentEditor, type ContentEditorRef } from '@/features/editor'
import type { SkillSuggestionItem } from '@/features/editor/extensions'
import type { MentionItem } from '@/features/editor/extensions/mention-suggestion'
import type { UploadResult } from '@garden/app-state/hooks/use-file-upload'

const CHAT_MENTION_TYPES = [
  'member',
] as const satisfies readonly MentionItem['type'][]

export interface ComposerEditorHandle {
  getMarkdown: () => string
  clear: () => void
  focus: () => void
  insertText: (text: string) => void
  /** Replace the whole document. Used by the suggestion pills (Tasks 12, 13). */
  setMarkdown: (markdown: string) => void
}

export interface ComposerEditorProps {
  /** Seeds the editor on mount. Uncontrolled afterwards — see file JSDoc. */
  draft: string
  onChange: (markdown: string) => void
  onSubmit: () => void
  onUploadFile: (file: File) => Promise<UploadResult | null>
  onEditorReady: (editor: Editor) => void
  skillItems: (args: { query: string }) => SkillSuggestionItem[]
  onSkillSelect: (
    item: SkillSuggestionItem,
    range: { from: number; to: number },
  ) => void
}

export const ComposerEditor = forwardRef<
  ComposerEditorHandle,
  ComposerEditorProps
>(function ComposerEditor(
  {
    draft,
    onChange,
    onSubmit,
    onUploadFile,
    onEditorReady,
    skillItems,
    onSkillSelect,
  },
  ref,
) {
  const contentEditorRef = useRef<ContentEditorRef>(null)
  // Captures the live Tiptap instance from ContentEditor's onCreate callback.
  // A ref (not state) is correct here: nothing in this component renders off
  // the editor instance, it's only read imperatively by insertText/setMarkdown.
  const editorRef = useRef<Editor | null>(null)

  const handleEditorReady = useCallback(
    (editor: Editor) => {
      editorRef.current = editor
      onEditorReady(editor)
    },
    [onEditorReady],
  )

  useImperativeHandle(
    ref,
    () => ({
      getMarkdown: () => contentEditorRef.current?.getMarkdown() ?? '',
      clear: () => {
        contentEditorRef.current?.clearContent()
      },
      // Caret goes to the end, not to Tiptap's default (start of doc).
      // The only caller is the pill's click-to-focus handler, where the click
      // landed on composer chrome rather than on a text position — putting the
      // caret ahead of everything the user already typed is the wrong guess.
      // Falls back to `ContentEditorRef.focus()` if the click somehow beats
      // `onEditorReady`.
      focus: () => {
        const editor = editorRef.current
        if (editor) {
          editor.commands.focus('end')
          return
        }
        contentEditorRef.current?.focus()
      },
      insertText: (text: string) => {
        editorRef.current?.chain().focus().insertContent(text).run()
      },
      // ContentEditor's `defaultValue` re-sync effect bails when `editable`
      // (`if (!editor || editable) return`), so a parent cannot push text in
      // by changing props in edit mode. setMarkdown is the escape hatch the
      // suggestion pills (Tasks 12, 13) use to prefill the composer.
      setMarkdown: (markdown: string) => {
        const editor = editorRef.current
        if (!editor) return
        editor.commands.setContent(markdown, { contentType: 'markdown' })
        editor.commands.focus('end')
      },
    }),
    [],
  )

  return (
    /*
     * `max-h-[min(40vh,18rem)] overflow-y-auto` lands on the `.ProseMirror`
     * node itself — `ContentEditor` forwards `className` into
     * `editorProps.attributes.class` — so the editable area is its own scroll
     * port.
     *
     * Before: the cap was `max-h-[40vh]`. It did clamp, but 40vh is far too
     * generous for a chat input. Measured in the running app at a 986px
     * viewport, a ~1.9k-character draft pinned the editor at its full 394px
     * and grew the whole pill to 516px, which pushed the pill's top above the
     * viewport — the composer swallowed the thread instead of sitting under
     * it. So the field read as "grows without limit" long before the limit
     * bound.
     *
     * After: `min(40vh, 18rem)` keeps the viewport-relative behavior that
     * matters on short windows and adds a 288px ceiling for tall ones, which
     * holds the pill around 410px at its worst. Beyond that the editor
     * scrolls, caret-into-view included (ProseMirror scrolls the nearest
     * scrollable ancestor, which is this element).
     *
     * The old `min-h-20` is dropped rather than retuned: it never applied.
     * `content-editor.css` sets `.rich-text-editor.ProseMirror { min-height:
     * 100% }` and is imported unlayered, so it beats every Tailwind utility
     * (unlayered CSS wins over `@layer` regardless of specificity) — the empty
     * editor measures ~22.75px, not 80px. The compact single-line resting
     * state is therefore what the composer has always shipped, and reviving an
     * 80px floor here would be a silent visual change, not a fix.
     */
    <ContentEditor
      ref={contentEditorRef}
      defaultValue={draft}
      onUpdate={onChange}
      debounceMs={0}
      onSubmit={onSubmit}
      submitOnEnter
      showBubbleMenu={false}
      textAlign
      mentionTypes={CHAT_MENTION_TYPES}
      onUploadFile={onUploadFile}
      onEditorReady={handleEditorReady}
      skillSuggestion={{ items: skillItems, onSelect: onSkillSelect }}
      placeholder="Make requests with Garden AI..."
      className="max-h-[min(40vh,18rem)] overflow-y-auto"
    />
  )
})
