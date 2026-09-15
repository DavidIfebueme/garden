import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ComposerAddMenu } from './composer-add-menu'

const base = {
  documents: [],
  documentLoadState: 'ready' as const,
  selectedDocumentIds: [],
  onToggleDocument: vi.fn(),
  onUploadClick: vi.fn(),
}

describe('ComposerAddMenu', () => {
  it('fires onUploadClick', async () => {
    const onUploadClick = vi.fn()
    render(<ComposerAddMenu {...base} onUploadClick={onUploadClick} />)
    await userEvent.click(screen.getByRole('button', { name: /add files/i }))
    await userEvent.click(
      await screen.findByRole('menuitem', { name: /upload from computer/i }),
    )
    expect(onUploadClick).toHaveBeenCalled()
  })

  it('toggles a thread document', async () => {
    const onToggleDocument = vi.fn()
    render(
      <ComposerAddMenu
        {...base}
        documents={[
          {
            documentId: 'd1',
            filename: 'Spec.docx',
            meta: 'DOCX',
            versionNumber: 2,
          } as never,
        ]}
        onToggleDocument={onToggleDocument}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /add files/i }))
    await userEvent.click(
      await screen.findByRole('menuitemcheckbox', { name: /Spec\.docx/ }),
    )
    expect(onToggleDocument).toHaveBeenCalledWith('d1', true)
  })

  it('shows loading affordance when documents are loading', async () => {
    render(<ComposerAddMenu {...base} documentLoadState="loading" />)
    await userEvent.click(screen.getByRole('button', { name: /add files/i }))
    expect(await screen.findByText(/Loading documents…/)).toBeInTheDocument()
    expect(screen.queryAllByRole('menuitemcheckbox')).toHaveLength(0)
  })

  it('shows error affordance when document load fails', async () => {
    render(<ComposerAddMenu {...base} documentLoadState="error" />)
    await userEvent.click(screen.getByRole('button', { name: /add files/i }))
    expect(
      await screen.findByText(/Couldn't load documents/),
    ).toBeInTheDocument()
    expect(screen.queryAllByRole('menuitemcheckbox')).toHaveLength(0)
  })

  it('shows empty affordance when no documents exist', async () => {
    render(
      <ComposerAddMenu {...base} documentLoadState="ready" documents={[]} />,
    )
    await userEvent.click(screen.getByRole('button', { name: /add files/i }))
    expect(
      await screen.findByText(/No documents in this chat yet/),
    ).toBeInTheDocument()
    expect(screen.queryAllByRole('menuitemcheckbox')).toHaveLength(0)
  })
})
