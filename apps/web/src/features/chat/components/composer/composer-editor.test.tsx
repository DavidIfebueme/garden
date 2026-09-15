import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'

const contentEditorProps = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('@/features/editor', () => ({
  ContentEditor: (props: unknown) => {
    contentEditorProps.current = props
    return <div data-testid="content-editor" />
  },
}))

import { ComposerEditor } from './composer-editor'

describe('ComposerEditor', () => {
  it('passes chat config to ContentEditor', () => {
    render(
      <ComposerEditor
        draft="hello"
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onUploadFile={vi.fn()}
        onEditorReady={vi.fn()}
        skillItems={() => []}
        onSkillSelect={vi.fn()}
      />,
    )
    const p = contentEditorProps.current as Record<string, unknown>
    expect(p.submitOnEnter).toBe(true)
    expect(p.showBubbleMenu).toBe(false)
    expect(p.textAlign).toBe(true)
    expect(p.defaultValue).toBe('hello')
    expect(p.skillSuggestion).toBeTruthy()
    expect(p.debounceMs).toBe(0)
    // Chat's @ stays members-only (spec §12) — the shared popup's default
    // (members + agents + issues + @all) must not leak in here.
    expect(p.mentionTypes).toEqual(['member'])
  })
})
