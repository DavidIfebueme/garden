/**
 * Shared extension factory for ContentEditor.
 *
 * One function builds the extension array for BOTH edit and readonly modes.
 * This ensures visual consistency — the same extensions parse and render
 * content identically regardless of mode.
 *
 * Split:
 * - Both modes: StarterKit, CodeBlock, Link, Image, Table, Markdown, Mention
 * - Edit only: Typography, Placeholder, markdownPaste, submitShortcut,
 *   fileUpload, Mention suggestion popup
 *
 * Link config differs: edit mode has autolink (detects URLs while typing),
 * readonly does not (prevents false positives on display).
 *
 * Mention suggestion is only attached in edit mode — readonly doesn't need
 * the autocomplete popup.
 *
 * All link styling is controlled by content-editor.css (var(--brand) color),
 * not Tailwind HTMLAttributes, to keep a single source of truth.
 */
import type { RefObject } from 'react'
import StarterKit from '@tiptap/starter-kit'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Typography from '@tiptap/extension-typography'
import TextAlign from '@tiptap/extension-text-align'
import Image from '@tiptap/extension-image'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { Table } from '@tiptap/extension-table'
import { Markdown } from '@tiptap/markdown'
import { ReactNodeViewRenderer } from '@tiptap/react'
import type { AnyExtension } from '@tiptap/core'
import type { SuggestionOptions } from '@tiptap/suggestion'
import type { UploadResult } from '@garden/app-state/hooks/use-file-upload'
import { BaseMentionExtension } from './mention-extension'
import { createMentionSuggestion } from './mention-suggestion'
import type { MentionItem } from './mention-suggestion'
import { CodeBlockView } from './code-block-view'
import { createMarkdownPasteExtension } from './markdown-paste'
import { createSubmitExtension } from './submit-shortcut'
import { createFileUploadExtension } from './file-upload'
import { createSkillSuggestionExtension } from './skill-suggestion'
import { FileCardExtension } from './file-card'
import { ImageView } from './image-view'

const lowlight = createLowlight(common)

const LinkEditable = Link.extend({ inclusive: false }).configure({
  openOnClick: false,
  autolink: true,
  linkOnPaste: true,
  defaultProtocol: 'https',
})

const LinkReadonly = Link.configure({
  openOnClick: false,
  autolink: false,
})

const ImageExtension = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      uploading: {
        default: false,
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.uploading ? { 'data-uploading': '' } : {},
        parseHTML: (el: HTMLElement) => el.hasAttribute('data-uploading'),
      },
    }
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageView)
  },
}).configure({
  inline: false,
  allowBase64: false,
})

/**
 * Tiptap's `SuggestionOptions['render']` return shape, re-exported so
 * `SkillSuggestionConfig.render` callers don't need to reach into
 * `@tiptap/suggestion` themselves. See skill-suggestion.ts `defaultRender`
 * and mention-suggestion.tsx's `render()` for the canonical shape
 * (onStart/onUpdate/onKeyDown/onExit).
 */
export type SuggestionRenderer = ReturnType<
  NonNullable<SuggestionOptions['render']>
>

/** One candidate offered by the `/` skill suggestion popup. */
export interface SkillSuggestionItem {
  id: string
  slug: string
  name: string
  description?: string
}

/**
 * Config for the chat composer's `/` skill-suggestion Tiptap extension
 * (2026-09-08 chat composer overhaul, task 3). The design spec (§6.1)
 * originally sketched `{ onQuery, getItems, onSelect }`; that sketch is
 * superseded by this shape per a recorded controller ruling, since tasks 11
 * and 12 (composer wiring, popup) both consume this exact interface.
 *
 * `items` is recomputed by the caller per query (no internal caching/query
 * state here — this extension only owns trigger detection + popup
 * lifecycle). `onSelect` performs the actual text insertion so the
 * committed message format (`/{slug} `) stays exactly what
 * `extractExplicitSkillSlugs` (skill-invocation.ts) already parses.
 */
export interface SkillSuggestionConfig {
  /** Filtered candidates to render, recomputed by the caller per query. */
  items: (args: { query: string }) => SkillSuggestionItem[]
  /** Commit — caller inserts the literal `/slug ` text into the editor. */
  onSelect: (
    item: SkillSuggestionItem,
    range: { from: number; to: number },
  ) => void
  /** Optional: render the popup. If omitted, a minimal built-in list is used. */
  render?: () => SuggestionRenderer
}

export interface EditorExtensionsOptions {
  editable: boolean
  placeholder?: string
  queryClient?: import('@tanstack/react-query').QueryClient
  onSubmitRef?: RefObject<(() => void) | undefined>
  onUploadFileRef?: RefObject<
    ((file: File) => Promise<UploadResult | null>) | undefined
  >
  /** When true, bare Enter also submits (chat-style). Default false. */
  submitOnEnter?: boolean
  /**
   * When true, append @tiptap/extension-text-align (heading + paragraph).
   * Opt-in so non-chat consumers keep an unchanged extension set.
   * Added for the chat composer overhaul (2026-09-08 spec).
   */
  textAlign?: boolean
  /**
   * Restricts what the `@` popup offers. Omitted → all types (members,
   * agents, issues, @all), which is what issues / comments / create-issue
   * expect. The chat composer passes ['member']: chat's `@` was members-only
   * before the Tiptap migration and the team chose to keep it that way
   * (2026-09-08 spec §12).
   */
  mentionTypes?: readonly MentionItem['type'][]
  /**
   * When present (and `editable`), append a `/` slash-command suggestion
   * extension. Opt-in so non-chat consumers (issues, comments, create-issue)
   * keep an unchanged extension set. Added for the chat composer overhaul
   * (2026-09-08 spec, task 3) to replace the old textarea-cursor-math
   * `/skill` detection with a proper Tiptap suggestion plugin.
   */
  skillSuggestion?: SkillSuggestionConfig
}

export function createEditorExtensions(
  options: EditorExtensionsOptions,
): AnyExtension[] {
  const { editable, placeholder: placeholderText } = options

  const extensions: AnyExtension[] = [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: false,
      codeBlock: false,
    }),
    CodeBlockLowlight.extend({
      addNodeView() {
        return ReactNodeViewRenderer(CodeBlockView)
      },
    }).configure({ lowlight }),
    // ⚠️ Link MUST appear before markdownPaste in this array.
    // linkOnPaste relies on Link's handlePaste plugin firing first;
    // markdownPaste's handlePaste is a catch-all that returns true.
    editable ? LinkEditable : LinkReadonly,
    ImageExtension,
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    Markdown,
    FileCardExtension,
    BaseMentionExtension.configure({
      HTMLAttributes: { class: 'mention' },
      ...(editable && options.queryClient
        ? {
            suggestion: createMentionSuggestion(options.queryClient, {
              types: options.mentionTypes,
            }),
          }
        : {}),
    }),
  ]

  if (options.textAlign) {
    extensions.push(TextAlign.configure({ types: ['heading', 'paragraph'] }))
  }

  if (editable) {
    extensions.push(
      Typography,
      Placeholder.configure({ placeholder: placeholderText }),
      createMarkdownPasteExtension(),
      createSubmitExtension(
        () => {
          const fn = options.onSubmitRef?.current
          if (!fn) return false // no submit wired — let default Enter insert newline
          fn()
          return true
        },
        { submitOnEnter: options.submitOnEnter ?? false },
      ),
      createFileUploadExtension(options.onUploadFileRef!),
    )

    if (options.skillSuggestion) {
      extensions.push(createSkillSuggestionExtension(options.skillSuggestion))
    }
  }

  return extensions
}
