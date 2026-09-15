import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock the rich-text field: expose a controllable markdown value + submit.
// See task-12-brief.md Step 2 — the fake-submit button fires the same
// onChange/onSubmit sequence a real keystroke + Enter would, letting these
// tests drive `Composer`'s send-gate logic without a real Tiptap instance.
//
// This mock is `forwardRef` + `useImperativeHandle`, mirroring the real
// `ComposerEditor`'s signature, so `Composer`'s `editorRef` is actually
// populated. That matters: `handleSubmit` reads its text from
// `editorRef.current.getMarkdown()`, and an earlier plain-function mock left
// the ref null for the life of every test — so the production text-extraction
// path went entirely unexercised and a fallback branch existed in production
// purely to keep the tests passing. Review finding, fix round 1.
// `md` is what the fake-submit button pushes through `onChange`. `handleMd`,
// when set, is what the imperative handle's `getMarkdown()` returns instead —
// letting a test make the two disagree and prove which one `handleSubmit`
// actually reads.
const editorState = vi.hoisted(() => ({
  md: '',
  handleMd: null as string | null,
  clearCalls: 0,
  onSubmit: () => {},
}))
vi.mock('./composer-editor', async () => {
  const React = await import('react')
  return {
    ComposerEditor: React.forwardRef(
      (props: never, ref: React.Ref<unknown>) => {
        ;(editorState as never).onSubmit = (
          props as { onSubmit: () => void }
        ).onSubmit
        React.useImperativeHandle(ref, () => ({
          getMarkdown: () => editorState.handleMd ?? editorState.md,
          clear: () => {
            editorState.md = ''
            editorState.handleMd = null
            editorState.clearCalls += 1
          },
          focus: () => {},
          insertText: () => {},
          setMarkdown: (markdown: string) => {
            editorState.md = markdown
          },
        }))
        return (
          <button
            data-testid="fake-submit"
            onClick={() => {
              ;(props as { onChange: (s: string) => void }).onChange(
                editorState.md,
              )
              ;(props as { onSubmit: () => void }).onSubmit()
            }}
          />
        )
      },
    ),
  }
})
vi.mock('@garden/app-state/hooks', () => ({
  useWorkspaceId: () => 'ws-1',
  useWorkspaceStore: () => null,
}))
// `queryOptions` is tanstack's identity-shaped helper (it just returns its
// argument with the right typing) — `agentSkillListOptions` calls it
// directly, so the mock needs to pass it through even though the test never
// exercises real query behavior.
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: [], isFetching: false }),
  queryOptions: (options: unknown) => options,
}))
vi.mock('@garden/app-state/chat', () => ({
  useChatStore: (s: (x: unknown) => unknown) =>
    s({ selectedAgentId: null, setSelectedAgentId: vi.fn() }),
}))

import { Composer } from './composer'

const base = {
  agentId: 'a1',
  documentLoadState: 'ready' as const,
  documents: [],
  isStreaming: false,
  status: 'ready' as const,
  input: '',
  onInputChange: vi.fn(),
  onSend: vi.fn().mockResolvedValue(undefined),
  onStop: vi.fn(),
}

function makeDocument(
  overrides: Partial<{
    documentId: string
    filename: string
    meta: string
    versionId: string | null
    versionNumber: number | null
  }> = {},
) {
  return {
    documentId: 'd1',
    filename: 'Spec.docx',
    meta: 'DOCX',
    versionId: null,
    versionNumber: 2,
    ...overrides,
  }
}

describe('Composer', () => {
  beforeEach(() => {
    // `editorState` is module-scoped via vi.hoisted, so it persists across
    // tests in this file. Reset it so one test's markdown or clear() count
    // cannot leak into the next.
    editorState.md = ''
    editorState.handleMd = null
    editorState.clearCalls = 0
  })

  it('sends the editor markdown', async () => {
    editorState.md = 'hello **world**'
    const onSend = vi.fn().mockResolvedValue(undefined)
    render(<Composer {...base} onSend={onSend} />)
    await userEvent.click(screen.getByTestId('fake-submit'))
    expect(onSend).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'hello **world**',
        files: [],
        selectedDocuments: [],
      }),
    )
  })

  /**
   * Guards the production text-extraction path. `handleSubmit` reads
   * `editorRef.current.getMarkdown()`, so the text it sends must come from
   * the editor handle rather than from whatever was last pushed through
   * `onChange`. Diverging the two proves which one is actually read: if a
   * regression reintroduced a state/ref mirror as the source, this fails.
   */
  it('takes the sent text from the editor handle, not the last onChange value', async () => {
    editorState.md = 'stale via onChange'
    editorState.handleMd = 'fresh from getMarkdown'
    const onSend = vi.fn().mockResolvedValue(undefined)
    render(<Composer {...base} onSend={onSend} />)
    await userEvent.click(screen.getByTestId('fake-submit'))
    expect(onSend).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'fresh from getMarkdown' }),
    )
  })

  it('does not send when empty', async () => {
    editorState.md = '   '
    const onSend = vi.fn()
    render(<Composer {...base} onSend={onSend} />)
    await userEvent.click(screen.getByTestId('fake-submit'))
    expect(onSend).not.toHaveBeenCalled()
  })

  it('shows Stop while streaming', () => {
    render(<Composer {...base} isStreaming />)
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument()
  })

  it('does not send when the selected document has gone stale (hasStaleDocumentSelection)', async () => {
    editorState.md = 'hello'
    const onSend = vi.fn()
    const doc = makeDocument()
    const { rerender } = render(
      <Composer {...base} documents={[doc]} onSend={onSend} />,
    )
    await userEvent.click(screen.getByRole('button', { name: /add files/i }))
    await userEvent.click(
      await screen.findByRole('menuitemcheckbox', { name: /Spec\.docx/ }),
    )
    // The document disappears from the thread (e.g. deleted) while still
    // selected — selectedDocumentIds now points at nothing.
    rerender(<Composer {...base} documents={[]} onSend={onSend} />)
    await userEvent.click(screen.getByTestId('fake-submit'))
    expect(onSend).not.toHaveBeenCalled()
  })

  it('attaches a file, renders a chip, removes it, and sends the remaining attachment', async () => {
    editorState.md = ''
    const onSend = vi.fn().mockResolvedValue(undefined)
    render(<Composer {...base} onSend={onSend} />)
    const fileA = new File(['a'], 'notes.txt', { type: 'text/plain' })
    const fileB = new File(['b'], 'plan.txt', { type: 'text/plain' })
    const input = screen.getByTestId('composer-file-input') as HTMLInputElement

    await userEvent.upload(input, fileA)
    expect(await screen.findByText('notes.txt')).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: /remove notes\.txt/i }),
    )
    expect(screen.queryByText('notes.txt')).not.toBeInTheDocument()

    await userEvent.upload(input, fileB)
    expect(await screen.findByText('plan.txt')).toBeInTheDocument()

    await userEvent.click(screen.getByTestId('fake-submit'))
    expect(onSend).toHaveBeenCalledWith(
      expect.objectContaining({ files: [fileB] }),
    )
  })

  it('keeps the drop overlay up across a nested drag and hides it only after the matching leave', () => {
    render(<Composer {...base} />)
    const pill = screen.getByTestId('composer-pill')
    const dataTransfer = { types: ['Files'] }

    fireEvent.dragEnter(pill, { dataTransfer })
    fireEvent.dragEnter(pill, { dataTransfer })
    expect(screen.getByText(/drop to attach/i)).toBeInTheDocument()

    fireEvent.dragLeave(pill, { dataTransfer })
    expect(screen.getByText(/drop to attach/i)).toBeInTheDocument()

    fireEvent.dragLeave(pill, { dataTransfer })
    expect(screen.queryByText(/drop to attach/i)).not.toBeInTheDocument()
  })

  it('attaches a pasted file', () => {
    render(<Composer {...base} />)
    const pill = screen.getByTestId('composer-pill')
    const file = new File(['x'], 'clip.png', { type: 'image/png' })
    fireEvent.paste(pill, {
      clipboardData: { files: [file], types: ['Files'] },
    })
    expect(screen.getByTitle('clip.png')).toBeInTheDocument()
  })

  it('clears the editor, draft, attachments, and selected documents on a successful send', async () => {
    editorState.md = 'hello'
    const onSend = vi.fn().mockResolvedValue(undefined)
    const onInputChange = vi.fn()
    const doc = makeDocument()
    render(
      <Composer
        {...base}
        documents={[doc]}
        onSend={onSend}
        onInputChange={onInputChange}
      />,
    )

    const file = new File(['a'], 'a.txt', { type: 'text/plain' })
    await userEvent.upload(
      screen.getByTestId('composer-file-input') as HTMLInputElement,
      file,
    )
    await userEvent.click(screen.getByRole('button', { name: /add files/i }))
    await userEvent.click(
      await screen.findByRole('menuitemcheckbox', { name: /Spec\.docx/ }),
    )
    await userEvent.keyboard('{Escape}')

    await userEvent.click(screen.getByTestId('fake-submit'))

    expect(onSend).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'hello',
        files: [file],
        selectedDocuments: [expect.objectContaining({ documentId: 'd1' })],
      }),
    )
    expect(onInputChange).toHaveBeenLastCalledWith('')
    expect(screen.queryByText('a.txt')).not.toBeInTheDocument()
    expect(screen.queryByText('Spec.docx')).not.toBeInTheDocument()
    // The editor itself must be cleared through the handle, not merely the
    // store draft. Asserting only on `onInputChange` would pass even if
    // `editorRef.current.clear()` were never called and the user's text
    // stayed visible in the composer after sending.
    expect(editorState.clearCalls).toBe(1)
  })
})
