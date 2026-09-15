import { describe, expect, it, vi } from 'vitest'
import { Schema } from '@tiptap/pm/model'
import { findSuggestionMatch } from '@tiptap/suggestion'
import { createSkillSuggestionExtension } from './skill-suggestion'

/**
 * Minimal doc+paragraph+text schema, used only to build a ProseMirror
 * `ResolvedPos` for `findSuggestionMatch` below — this is not the real
 * editor schema (StarterKit et al.), just enough structure for
 * `findSuggestionMatch` to read `$position.nodeBefore`.
 */
const docSchema = new Schema({
  nodes: {
    doc: { content: 'paragraph+' },
    paragraph: { content: 'text*' },
    text: {},
  },
})

/** Resolves a position at the end of `text` inside a single paragraph. */
function resolvedPositionAfter(text: string) {
  const paragraph = docSchema.node(
    'paragraph',
    null,
    text ? [docSchema.text(text)] : [],
  )
  const doc = docSchema.node('doc', null, [paragraph])
  return doc.resolve(1 + text.length)
}

describe('createSkillSuggestionExtension', () => {
  it('is a named extension keyed for the slash trigger', () => {
    const ext = createSkillSuggestionExtension({
      items: () => [],
      onSelect: vi.fn(),
    })
    expect(ext.name).toBe('skillSuggestion')
  })

  it('exposes the "/" trigger char via suggestion options', () => {
    const ext = createSkillSuggestionExtension({
      items: () => [],
      onSelect: vi.fn(),
    })
    // The extension stores suggestion config in its options.
    expect(ext.options.suggestion.char).toBe('/')
  })

  it('filters via the provided items callback', () => {
    const items = vi.fn(() => [{ id: 'a', slug: 'pdf', name: 'PDF' }])
    const ext = createSkillSuggestionExtension({ items, onSelect: vi.fn() })
    const result = ext.options.suggestion.items({ query: 'pd' })
    expect(items).toHaveBeenCalledWith({ query: 'pd' })
    expect(result).toEqual([{ id: 'a', slug: 'pdf', name: 'PDF' }])
  })

  /**
   * Locks the highest-risk invariant this task's brief calls out:
   * `allowedPrefixes` must stay at Tiptap's default (`[' ']`), never `null`.
   * `null` disables the prefix check entirely, which fires the popup
   * mid-word on tokens like `and/or`, `2026/09/08`, `src/features` — the
   * opposite of `SKILL_TRIGGER_PATTERN` in skill-invocation.ts
   * (`/(?:^|\s)\/([a-zA-Z0-9_-]*)$/`, start-of-string or after whitespace
   * only). Flagged by code review round 1 (2026-09-09): the original suite
   * asserted `.char` but never `allowedPrefixes`, so a future
   * `allowedPrefixes: null` edit would pass every existing test.
   *
   * Property assertion first (cheap, exact regression the config could
   * reintroduce), then a behavior-level assertion below using Tiptap's own
   * `findSuggestionMatch` against a real ProseMirror position — this proves
   * *why* leaving it undefined matters, not just that the field is unset.
   */
  it('does not override allowedPrefixes (stays at the Tiptap default)', () => {
    const ext = createSkillSuggestionExtension({
      items: () => [],
      onSelect: vi.fn(),
    })
    expect(ext.options.suggestion.allowedPrefixes).toBeUndefined()
  })
})

/**
 * Behavioral companion to the `allowedPrefixes` property test above.
 *
 * `Suggestion()` (the @tiptap/suggestion plugin factory our extension calls
 * in addProseMirrorPlugins) defaults `allowedPrefixes` to `[' ']` via a
 * destructuring default — that default only fires for `undefined`, never for
 * `null` (see node_modules/@tiptap/suggestion/dist/index.cjs, `Suggestion`:
 * `allowedPrefixes = [" "]`). `findSuggestionMatch` itself (also exported by
 * @tiptap/suggestion) applies no such default — it uses whatever
 * `allowedPrefixes` it's given. So to exercise the exact matching Tiptap
 * would perform for our extension, this resolves our extension's actual
 * configured value the same way `Suggestion()` would (undefined -> `[' ']`,
 * anything else passed through unchanged) and drives `findSuggestionMatch`
 * directly against a minimal ProseMirror doc/position — no full Editor/DOM
 * mount required, since `findSuggestionMatch` only reads `$position.nodeBefore`.
 *
 * If a future edit sets `allowedPrefixes: null` on the extension, the
 * "mid-word" case below starts matching `/or` inside `and/or` and this test
 * fails — reproducing the exact regression the property test alone can't
 * demonstrate.
 */
describe('createSkillSuggestionExtension slash trigger matching', () => {
  function matchFor(text: string) {
    const ext = createSkillSuggestionExtension({
      items: () => [],
      onSelect: vi.fn(),
    })
    const configuredAllowedPrefixes = ext.options.suggestion.allowedPrefixes
    const allowedPrefixes =
      configuredAllowedPrefixes === undefined
        ? [' ']
        : configuredAllowedPrefixes

    return findSuggestionMatch({
      char: ext.options.suggestion.char,
      allowSpaces: false,
      allowToIncludeChar: false,
      allowedPrefixes,
      startOfLine: ext.options.suggestion.startOfLine,
      $position: resolvedPositionAfter(text),
    })
  }

  it('does not trigger for a "/" mid-word (and/or)', () => {
    expect(matchFor('and/or')).toBeNull()
  })

  it('does not trigger for a "/" mid-token (2026/09/08)', () => {
    expect(matchFor('2026/09/08')).toBeNull()
  })

  it('triggers for a "/" at the start of the doc', () => {
    expect(matchFor('/pdf')).toMatchObject({ query: 'pdf' })
  })

  it('triggers for a "/" after whitespace', () => {
    expect(matchFor('use /pdf')).toMatchObject({ query: 'pdf' })
  })
})
