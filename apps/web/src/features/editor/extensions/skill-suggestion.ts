import { Extension } from '@tiptap/core'
import Suggestion, {
  type SuggestionOptions,
  type SuggestionProps,
} from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react'
import { computePosition, offset, flip, shift } from '@floating-ui/dom'
import type { SkillSuggestionConfig, SkillSuggestionItem } from './index'
import {
  SkillSuggestionList,
  type SkillSuggestionListRef,
} from './skill-suggestion-list'

/**
 * `/` slash-command suggestion for the chat composer.
 *
 * Why: the old composer detected `/skill` with textarea cursor math and a
 * bespoke <Command> popover (skill-invocation.ts `detectSkillTrigger`, now
 * removed by a later task). Moving the composer onto the shared Tiptap
 * ContentEditor, we get trigger detection + popup lifecycle for free from
 * @tiptap/suggestion — the same machinery mention-suggestion.tsx already
 * uses for `@`. This extension only owns "when does `/query` match, and what
 * does the popup do" — text insertion is the caller's job via `onSelect`.
 *
 * Committed format is unchanged: on select the caller inserts literal
 * `/{slug} ` text (see skill-invocation.ts `formatSkillInvocation`), so
 * server-side `extractExplicitSkillSlugs` keeps parsing chat messages
 * untouched.
 *
 * `allowedPrefixes` is deliberately left at Tiptap's default (`[' ']`):
 * passing `null` disables the prefix check entirely and would fire the
 * popup mid-word on tokens like `and/or`, `2026/09/08`, `src/features`,
 * which does not match `SKILL_TRIGGER_PATTERN`'s
 * `/(?:^|\s)\/([a-zA-Z0-9_-]*)$/` (only start-of-string or after whitespace).
 *
 * Ref: apps/web/src/features/editor/extensions/mention-suggestion.tsx,
 *      apps/web/src/features/chat/components/skill-invocation.ts
 */
export function createSkillSuggestionExtension(config: SkillSuggestionConfig) {
  return Extension.create<{
    suggestion: Omit<
      SuggestionOptions<SkillSuggestionItem, SkillSuggestionItem>,
      'editor'
    >
  }>({
    name: 'skillSuggestion',

    addOptions() {
      return {
        suggestion: {
          char: '/',
          startOfLine: false,
          items: ({ query }: { query: string }) => config.items({ query }),
          command: ({ range, props }) => {
            config.onSelect(props, range)
          },
          render: config.render ?? defaultRender,
        },
      }
    },

    addProseMirrorPlugins() {
      return [
        Suggestion<SkillSuggestionItem, SkillSuggestionItem>({
          editor: this.editor,
          ...this.options.suggestion,
        }),
      ]
    },
  })
}

/**
 * Minimal built-in popup used when `SkillSuggestionConfig.render` is
 * omitted. Mirrors the render() factory in mention-suggestion.tsx: a
 * ReactRenderer mounts `SkillSuggestionList`, driven imperatively by
 * onStart/onUpdate/onKeyDown/onExit (not React state — this is Tiptap's
 * suggestion plugin lifecycle, which runs outside React's render cycle).
 *
 * Deviation from the task brief's sample: the brief's `defaultRender` snippet
 * constructs the ReactRenderer but never appends `component.element` to the
 * document and never positions it, so nothing would ever become visible
 * (ReactRenderer's constructor only creates a detached DOM node — see
 * @tiptap/react's ReactRenderer, which never calls appendChild itself).
 * mention-suggestion.tsx's render() does the mount + floating-ui positioning
 * explicitly; this default mirrors that same pattern so the fallback popup is
 * actually functional rather than a silent no-op.
 */
function defaultRender() {
  let component: ReactRenderer<SkillSuggestionListRef> | null = null
  let popup: HTMLDivElement | null = null

  return {
    onStart: (
      props: SuggestionProps<SkillSuggestionItem, SkillSuggestionItem>,
    ) => {
      component = new ReactRenderer(SkillSuggestionList, {
        props,
        editor: props.editor,
      })

      popup = document.createElement('div')
      popup.style.position = 'fixed'
      popup.style.zIndex = '50'
      popup.appendChild(component.element)
      document.body.appendChild(popup)

      updatePosition(popup, props.clientRect)
    },
    onUpdate: (
      props: SuggestionProps<SkillSuggestionItem, SkillSuggestionItem>,
    ) => {
      component?.updateProps(props)
      if (popup) updatePosition(popup, props.clientRect)
    },
    onKeyDown: (props: { event: KeyboardEvent }) => {
      if (props.event.key === 'Escape') {
        cleanup()
        return true
      }
      return component?.ref?.onKeyDown(props) ?? false
    },
    onExit: () => {
      cleanup()
    },
  }

  function updatePosition(
    el: HTMLDivElement,
    clientRect: (() => DOMRect | null) | null | undefined,
  ) {
    if (!clientRect) return
    const virtualEl = {
      getBoundingClientRect: () => clientRect() ?? new DOMRect(),
    }
    computePosition(virtualEl, el, {
      placement: 'bottom-start',
      strategy: 'fixed',
      middleware: [offset(4), flip(), shift({ padding: 8 })],
    }).then(({ x, y }) => {
      el.style.left = `${x}px`
      el.style.top = `${y}px`
    })
  }

  function cleanup() {
    component?.destroy()
    component = null
    popup?.remove()
    popup = null
  }
}
