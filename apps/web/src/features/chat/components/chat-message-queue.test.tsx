import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ChatMessageQueue, type QueuedChatMessage } from './chat-message-queue'

function queued(overrides: Partial<QueuedChatMessage> = {}): QueuedChatMessage {
  return {
    id: 'q1',
    text: 'Lets go away',
    files: [],
    selectedDocuments: [],
    ...overrides,
  }
}

describe('ChatMessageQueue', () => {
  it('renders nothing when the queue is empty', () => {
    const { container } = render(
      <ChatMessageQueue messages={[]} onEdit={vi.fn()} onRemove={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('numbers rows by their position in the queue', () => {
    render(
      <ChatMessageQueue
        messages={[
          queued(),
          queued({ id: 'q2', text: 'Hello to the greatest willers' }),
        ]}
        onEdit={vi.fn()}
        onRemove={vi.fn()}
      />,
    )
    expect(screen.getByText('Queue 1')).toBeInTheDocument()
    expect(screen.getByText('Queue 2')).toBeInTheDocument()
    expect(screen.getAllByText('Reply after current reply')).toHaveLength(2)
  })

  it('names the attachments when a queued send carries no prose', () => {
    render(
      <ChatMessageQueue
        messages={[
          queued({
            text: '',
            files: [new File(['x'], 'brief.pdf', { type: 'application/pdf' })],
          }),
        ]}
        onEdit={vi.fn()}
        onRemove={vi.fn()}
      />,
    )
    expect(screen.getByText('1 attachment')).toBeInTheDocument()
  })

  it('hands the whole message to onEdit and only the id to onRemove', async () => {
    const onEdit = vi.fn()
    const onRemove = vi.fn()
    const message = queued()
    render(
      <ChatMessageQueue
        messages={[message]}
        onEdit={onEdit}
        onRemove={onRemove}
      />,
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Edit queued message' }),
    )
    expect(onEdit).toHaveBeenCalledWith(message)

    await userEvent.click(
      screen.getByRole('button', { name: 'Remove queued message' }),
    )
    expect(onRemove).toHaveBeenCalledWith('q1')
  })

  it('copies the queued text and confirms it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    render(
      <ChatMessageQueue
        messages={[queued()]}
        onEdit={vi.fn()}
        onRemove={vi.fn()}
      />,
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Copy queued message' }),
    )

    expect(writeText).toHaveBeenCalledWith('Lets go away')
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })
})
