/**
 * ComposerToolbar — always-visible formatting bar above the chat composer.
 *
 * The chat composer runs on the shared Tiptap editor (2026-09-08 spec §7),
 * but unlike `apps/web/src/features/editor/bubble-menu.tsx` this bar does
 * not show or hide on selection — it sits above the input at all times, so
 * it is a plain view component rather than a Tiptap `<BubbleMenu>`.
 *
 * Reactivity: `content-editor.tsx` sets `shouldRerenderOnTransaction: false`
 * on the underlying `useEditor` call, so this component is NOT re-rendered
 * by the parent on selection or mark changes. Reading `editor.isActive(...)`
 * directly in the render body would therefore freeze every button's
 * pressed/level state at whatever it was on first mount. Every reactive
 * read here goes through `useEditorState` instead, which subscribes to
 * editor transactions itself and re-renders only this component when the
 * selected values change — mirroring the precise-subscription pattern
 * already used in `bubble-menu.tsx` (see the `fmt` selector there).
 * Command dispatch (`editor.chain().focus()....run()`) is a direct,
 * one-off call and does not need to go through the hook.
 *
 * Styling is modeled on `bubble-menu.tsx`: `Toggle` from
 * `@garden/ui/components/ui/toggle` for pressable buttons, `Separator`
 * between clusters. No new visual language is introduced here.
 */

import { Fragment, useRef, useState } from 'react'
import { useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import { Toggle } from '@garden/ui/components/ui/toggle'
import { Separator } from '@garden/ui/components/ui/separator'
import {
  Bold,
  Italic,
  Underline,
  Code,
  Heading as HeadingIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
} from 'lucide-react'

type TextAlign = 'left' | 'center' | 'right' | 'justify'

interface ToolbarButtonConfig {
  label: string
  icon: React.ComponentType<{ className?: string }>
  pressed: boolean
  onToggle: (editor: Editor) => void
}

/** Next heading level in the none -> H1 -> H2 -> H3 -> paragraph cycle. */
function nextHeadingLevel(level: 1 | 2 | 3 | undefined): 1 | 2 | 3 | undefined {
  if (level === undefined) return 1
  if (level < 3) return (level + 1) as 1 | 2 | 3
  return undefined
}

/**
 * Outer guard. Renders nothing until the editor instance exists, then mounts
 * `ToolbarForEditor` fresh with a non-null editor.
 *
 * This split is load-bearing, not cosmetic. `useEditorState` builds its
 * `EditorStateManager` once, in a `useState` initializer, from whatever editor
 * it is first given. Its `watch(nextEditor)` reassigns the internal editor but
 * does NOT bump `transactionNumber` or notify subscribers, and `getSnapshot()`
 * returns the cached snapshot while those numbers match. So a manager built
 * with `null` keeps handing the selector `{ editor: null }` even after the real
 * instance arrives — the selector returns null and the toolbar stays invisible
 * until some unrelated transaction bumps the counter.
 *
 * Observed: the toolbar was missing on a fresh chat and only appeared after the
 * first keystroke. Mounting the inner component only once `editor` is non-null
 * means the manager is constructed with the real editor and the first snapshot
 * is already correct. Verified against @tiptap/react's EditorStateManager
 * (dist/index.js: constructor, getSnapshot, watch).
 *
 * The outer function deliberately holds NO hooks, so returning early here
 * cannot break hook order.
 */
export function ComposerToolbar({
  editor,
}: {
  editor: Editor | null
}): JSX.Element | null {
  if (!editor) return null
  return <ToolbarForEditor editor={editor} />
}

function ToolbarForEditor({ editor }: { editor: Editor }): JSX.Element | null {
  const [focusedIndex, setFocusedIndex] = useState(0)
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([])

  // Precise subscription to formatting state — see the JSDoc above for why
  // this must go through useEditorState rather than a direct editor.isActive()
  // read in the render body.
  const state = useEditorState({
    editor,
    selector: ({ editor: ed }) => {
      if (!ed) return null
      return {
        bold: ed.isActive('bold'),
        italic: ed.isActive('italic'),
        underline: ed.isActive('underline'),
        code: ed.isActive('code'),
        heading: ed.isActive('heading'),
        headingLevel: ed.getAttributes('heading').level as
          | 1
          | 2
          | 3
          | undefined,
        alignLeft: ed.isActive({ textAlign: 'left' }),
        alignCenter: ed.isActive({ textAlign: 'center' }),
        alignRight: ed.isActive({ textAlign: 'right' }),
        alignJustify: ed.isActive({ textAlign: 'justify' }),
      }
    },
  })

  if (!editor || !state) return null

  const setAlign = (align: TextAlign) => (ed: Editor) =>
    ed.chain().focus().setTextAlign(align).run()

  const buttons: ToolbarButtonConfig[] = [
    {
      label: 'Clear formatting',
      icon: Highlighter,
      pressed: false,
      onToggle: (ed) => ed.chain().focus().unsetAllMarks().clearNodes().run(),
    },
    {
      label: 'Underline',
      icon: Underline,
      pressed: state.underline,
      onToggle: (ed) => ed.chain().focus().toggleUnderline().run(),
    },
    {
      label: 'Inline code',
      icon: Code,
      pressed: state.code,
      onToggle: (ed) => ed.chain().focus().toggleCode().run(),
    },
    {
      label: 'Bold',
      icon: Bold,
      pressed: state.bold,
      onToggle: (ed) => ed.chain().focus().toggleBold().run(),
    },
    {
      label: 'Italic',
      icon: Italic,
      pressed: state.italic,
      onToggle: (ed) => ed.chain().focus().toggleItalic().run(),
    },
    {
      label: 'Heading',
      icon: HeadingIcon,
      pressed: state.heading,
      onToggle: (ed) => {
        const level = ed.getAttributes('heading').level as 1 | 2 | 3 | undefined
        const next = nextHeadingLevel(level)
        if (next) {
          ed.chain().focus().toggleHeading({ level: next }).run()
        } else {
          ed.chain().focus().setParagraph().run()
        }
      },
    },
    {
      label: 'Align center',
      icon: AlignCenter,
      pressed: state.alignCenter,
      onToggle: setAlign('center'),
    },
    {
      label: 'Align left',
      icon: AlignLeft,
      pressed: state.alignLeft,
      onToggle: setAlign('left'),
    },
    {
      label: 'Align right',
      icon: AlignRight,
      pressed: state.alignRight,
      onToggle: setAlign('right'),
    },
    {
      label: 'Align justify',
      icon: AlignJustify,
      pressed: state.alignJustify,
      onToggle: setAlign('justify'),
    },
  ]

  // Three formatting controls per group, followed by the four alignment controls.
  const separatorAfter = new Set([2, 5])

  const focusButton = (index: number) => {
    setFocusedIndex(index)
    buttonRefs.current[index]?.focus()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      focusButton((focusedIndex + 1) % buttons.length)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focusButton((focusedIndex - 1 + buttons.length) % buttons.length)
    }
  }

  return (
    <div
      role="toolbar"
      aria-label="Text formatting"
      aria-orientation="horizontal"
      className="flex items-center"
      onKeyDown={handleKeyDown}
    >
      {buttons.map((button, index) => (
        <Fragment key={button.label}>
          <Toggle
            ref={(el: HTMLButtonElement | null) => {
              buttonRefs.current[index] = el
            }}
            className="size-8 rounded-sm p-0 text-icon-default"
            aria-label={button.label}
            pressed={button.pressed}
            tabIndex={index === focusedIndex ? 0 : -1}
            onPressedChange={() => button.onToggle(editor)}
            onMouseDown={(event: React.MouseEvent) => event.preventDefault()}
            onFocus={() => setFocusedIndex(index)}
          >
            <button.icon className="size-4" />
          </Toggle>
          {separatorAfter.has(index) && (
            <Separator
              orientation="vertical"
              className="mx-3 h-8 w-px bg-border-default"
            />
          )}
        </Fragment>
      ))}
    </div>
  )
}
