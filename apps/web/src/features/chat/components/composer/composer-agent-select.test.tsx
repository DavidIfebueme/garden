import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const setSelectedAgentId = vi.hoisted(() => vi.fn())

vi.mock('@garden/app-state/hooks', () => ({ useWorkspaceId: () => 'ws-1' }))
vi.mock('@garden/app-state/chat', () => ({
  useChatStore: (sel: (s: unknown) => unknown) =>
    sel({ selectedAgentId: null, setSelectedAgentId }),
}))
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: [
      { id: 'a1', name: 'Harnessy', avatar_url: null },
      { id: 'a2', name: 'Scout', avatar_url: null },
    ],
    isPending: false,
  }),
}))
vi.mock('@/lib/workspace/queries', () => ({
  agentListOptions: () => ({}),
}))

import { ComposerAgentSelect } from './composer-agent-select'

describe('ComposerAgentSelect', () => {
  beforeEach(() => {
    // cmdk calls scrollIntoView on the first selected item, which jsdom doesn't implement
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('shows the fallback agent name when the store has none', () => {
    render(<ComposerAgentSelect fallbackAgentId="a1" />)
    expect(
      screen.getByRole('button', { name: /harnessy/i }),
    ).toBeInTheDocument()
  })

  it('sets the selected agent on pick', async () => {
    render(<ComposerAgentSelect fallbackAgentId="a1" />)
    await userEvent.click(screen.getByRole('button', { name: /harnessy/i }))
    await userEvent.click(screen.getByText('Scout'))
    expect(setSelectedAgentId).toHaveBeenCalledWith('a2')
  })
})
