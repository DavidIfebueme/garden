import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// The component reads active state through useEditorState (required — see
// Step 3). The real hook subscribes to editor transactions and needs a live
// Editor; against a plain object mock it throws. Run the selector directly.
vi.mock('@tiptap/react', () => ({
  useEditorState: ({
    editor,
    selector,
  }: {
    editor: unknown
    selector: (a: { editor: unknown }) => unknown
  }) => selector({ editor }),
}))

import { ComposerToolbar } from './composer-toolbar'

/**
 * Builds a chainable editor mock. Every command returns the chain so
 * `editor.chain().focus().toggleBold().run()` works; `run` is the spy we
 * assert. Every non-`run` call on the chain is additionally recorded (method
 * name + args) into `__calls`, in call order — this is what lets tests pin
 * "the Bold button dispatches toggleBold(), not some other chain call" (see
 * review round 1, finding 1: asserting `run` alone can't distinguish
 * toggleBold() from toggleItalic()).
 */
function makeEditor(overrides: Record<string, unknown> = {}) {
  const run = vi.fn(() => true)
  const calls: Array<{ method: string; args: unknown[] }> = []
  const chain: Record<string, unknown> = { run }
  const chainProxy = new Proxy(chain, {
    get: (target, prop) =>
      prop in target
        ? (target as never)[prop]
        : (...args: unknown[]) => {
            calls.push({ method: String(prop), args })
            return chainProxy
          },
  })
  return {
    chain: () => chainProxy,
    can: () => chainProxy,
    isActive: vi.fn(() => false),
    getAttributes: vi.fn(() => ({})),
    ...overrides,
    __run: run,
    __calls: calls,
  } as never
}

describe('ComposerToolbar', () => {
  it('renders nothing without an editor', () => {
    const { container } = render(<ComposerToolbar editor={null} />)
    expect(container.querySelector('[role="toolbar"]')).toBeNull()
  })

  it('renders a toolbar with the format controls', () => {
    render(<ComposerToolbar editor={makeEditor()} />)
    expect(screen.getByRole('toolbar')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /bold/i })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /align left/i }),
    ).toBeInTheDocument()
  })

  // Table-driven command pinning (review round 1, finding 1). Chosen over
  // one bespoke test per button: the assertion shape is identical for every
  // simple mark/align button (accessible name -> exactly this chain method
  // with exactly these args), so a table keeps the file from growing a
  // near-duplicate test per row while still pinning each command distinctly
  // — `toContainEqual` fails if the button dispatches any other method.
  const COMMAND_CASES: Array<{
    name: string
    method: string
    args: unknown[]
  }> = [
    { name: 'bold', method: 'toggleBold', args: [] },
    { name: 'italic', method: 'toggleItalic', args: [] },
    { name: 'underline', method: 'toggleUnderline', args: [] },
    { name: 'inline code', method: 'toggleCode', args: [] },
    { name: 'align left', method: 'setTextAlign', args: ['left'] },
    { name: 'align center', method: 'setTextAlign', args: ['center'] },
    { name: 'align right', method: 'setTextAlign', args: ['right'] },
    { name: 'align justify', method: 'setTextAlign', args: ['justify'] },
  ]

  it.each(COMMAND_CASES)(
    '"$name" button dispatches $method$args',
    async ({ name, method, args }) => {
      const editor = makeEditor()
      render(<ComposerToolbar editor={editor} />)
      await userEvent.click(
        screen.getByRole('button', { name: new RegExp(`^${name}$`, 'i') }),
      )
      expect(
        (editor as never as { __calls: unknown[] }).__calls,
      ).toContainEqual({ method, args })
    },
  )

  it('"Clear formatting" button dispatches unsetAllMarks then clearNodes', async () => {
    const editor = makeEditor()
    render(<ComposerToolbar editor={editor} />)
    await userEvent.click(
      screen.getByRole('button', { name: /clear formatting/i }),
    )
    const calls = (editor as never as { __calls: Array<{ method: string }> })
      .__calls
    const methods = calls.map((c) => c.method)
    expect(methods).toContain('unsetAllMarks')
    expect(methods).toContain('clearNodes')
    expect(methods.indexOf('unsetAllMarks')).toBeLessThan(
      methods.indexOf('clearNodes'),
    )
  })

  it('cycles heading level: paragraph -> h1 on first click', async () => {
    const editor = makeEditor({ getAttributes: vi.fn(() => ({})) })
    render(<ComposerToolbar editor={editor} />)
    await userEvent.click(screen.getByRole('button', { name: /heading/i }))
    expect((editor as never as { __calls: unknown[] }).__calls).toContainEqual({
      method: 'toggleHeading',
      args: [{ level: 1 }],
    })
  })

  // Roving tabindex (review round 1, finding 2): a single tab stop into the
  // toolbar, ArrowLeft/ArrowRight move both DOM focus and tabIndex="0"
  // between buttons, wrapping at each end.
  it('moves focus and tabIndex with ArrowRight/ArrowLeft, wrapping at both ends', () => {
    const editor = makeEditor()
    render(<ComposerToolbar editor={editor} />)
    const toolbar = screen.getByRole('toolbar')
    const buttons = screen.getAllByRole('button')

    // Single tab stop: only the first button is in the tab order initially.
    expect(buttons[0]).toHaveAttribute('tabindex', '0')
    for (const button of buttons.slice(1)) {
      expect(button).toHaveAttribute('tabindex', '-1')
    }

    fireEvent.keyDown(toolbar, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(buttons[1])
    expect(buttons[1]).toHaveAttribute('tabindex', '0')
    expect(buttons[0]).toHaveAttribute('tabindex', '-1')

    fireEvent.keyDown(toolbar, { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(buttons[0])
    expect(buttons[0]).toHaveAttribute('tabindex', '0')
    expect(buttons[1]).toHaveAttribute('tabindex', '-1')

    // Wrap backward: ArrowLeft from the first button goes to the last.
    fireEvent.keyDown(toolbar, { key: 'ArrowLeft' })
    const last = buttons[buttons.length - 1]
    expect(document.activeElement).toBe(last)
    expect(last).toHaveAttribute('tabindex', '0')
    expect(buttons[0]).toHaveAttribute('tabindex', '-1')

    // Wrap forward: ArrowRight from the last button goes back to the first.
    fireEvent.keyDown(toolbar, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(buttons[0])
    expect(buttons[0]).toHaveAttribute('tabindex', '0')
    expect(last).toHaveAttribute('tabindex', '-1')
  })
})
