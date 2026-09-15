import { forwardRef, useImperativeHandle, useState } from 'react'
import type { SuggestionProps } from '@tiptap/suggestion'
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@garden/ui/components/ui/command'
import type { SkillSuggestionItem } from './index'

export interface SkillSuggestionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

type SkillSuggestionListProps = SuggestionProps<
  SkillSuggestionItem,
  SkillSuggestionItem
>

/**
 * Default popup body for the `/` skill suggestion (used when
 * `SkillSuggestionConfig.render` is not supplied — see skill-suggestion.ts
 * `defaultRender`). Mirrors MentionList in mention-suggestion.tsx: a
 * forwardRef list driven by ArrowUp/ArrowDown/Enter via the imperative
 * `onKeyDown`, because the suggestion popup never receives DOM focus (the
 * editor keeps it), so cmdk's own focus-driven keyboard handling can't drive
 * selection — we track `selectedIndex` ourselves and call `command(item)` on
 * pick. Styled with Command/CommandItem (@garden/ui) to match the mention
 * popup and the deleted composer `<Command>` popover (chat-composer.tsx).
 */
export const SkillSuggestionList = forwardRef<
  SkillSuggestionListRef,
  SkillSuggestionListProps
>(function SkillSuggestionList({ items, command }, ref) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const index = Math.min(selectedIndex, Math.max(items.length - 1, 0))

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.isComposing || items.length === 0) return false
      if (event.key === 'ArrowUp') {
        setSelectedIndex((index + items.length - 1) % items.length)
        return true
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((index + 1) % items.length)
        return true
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        const item = items[index]
        if (item) command(item)
        return true
      }
      return false
    },
  }))

  if (items.length === 0) {
    return (
      <div className="rounded-xl bg-popover p-2 text-xs text-muted-foreground shadow-[var(--shadow-float-1)]">
        No matching skills
      </div>
    )
  }

  return (
    <Command
      shouldFilter={false}
      className="w-72 rounded-xl bg-popover shadow-[var(--shadow-float-1)]"
    >
      <CommandList className="max-h-72">
        <CommandGroup heading="Skills">
          {items.map((item, itemIndex) => (
            <CommandItem
              key={item.id}
              value={item.id}
              className={itemIndex === index ? 'bg-accent text-foreground' : ''}
              onMouseMove={() => setSelectedIndex(itemIndex)}
              onMouseDown={(event) => event.preventDefault()}
              onSelect={() => command(item)}
            >
              <span className="shrink-0 font-medium">/{item.slug}</span>
              {item.description && (
                <span className="truncate text-xs text-muted-foreground">
                  {item.description}
                </span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  )
})
