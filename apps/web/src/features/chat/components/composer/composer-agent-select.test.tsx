import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const setSelectedAgentId = vi.hoisted(() => vi.fn())

/**
 * Fixture shaped like `toAgent` output rather than the Penpot board: a seeded
 * default agent plus workspace-created ones, deliberately out of order and
 * including non-active rows, because the API route returns every agent row
 * for the workspace with no status filter and no ORDER BY.
 */
vi.mock('@garden/app-state/hooks', () => ({ useWorkspaceId: () => 'ws-1' }))
vi.mock('@garden/app-state/chat', () => ({
  useChatStore: (sel: (s: unknown) => unknown) =>
    sel({ selectedAgentId: null, setSelectedAgentId }),
}))
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: [
      { id: 'a3', name: 'Scout', is_default: false, record_status: 'active' },
      {
        id: 'a4',
        name: 'Retired',
        is_default: false,
        record_status: 'archived',
      },
      { id: 'a1', name: 'Garden', is_default: true, record_status: 'active' },
      {
        id: 'a5',
        name: 'Proposed',
        is_default: false,
        record_status: 'pending_approval',
      },
      {
        id: 'a2',
        name: 'Archivist',
        is_default: false,
        record_status: 'active',
      },
    ],
    isPending: false,
  }),
}))
vi.mock('@/lib/workspace/queries', () => ({
  agentListOptions: () => ({}),
}))

import { ComposerAgentSelect } from './composer-agent-select'

describe('ComposerAgentSelect', () => {
  it('shows the fallback agent name when the store has none', () => {
    render(<ComposerAgentSelect fallbackAgentId="a1" />)
    expect(screen.getByRole('button', { name: /garden/i })).toBeInTheDocument()
  })

  it('sets the selected agent on pick', async () => {
    render(<ComposerAgentSelect fallbackAgentId="a1" />)
    await userEvent.click(screen.getByRole('button', { name: /garden/i }))
    await userEvent.click(
      await screen.findByRole('menuitemradio', { name: 'Scout' }),
    )
    expect(setSelectedAgentId).toHaveBeenCalledWith('a3')
  })

  it('lists active agents only, default first then alphabetical', async () => {
    render(<ComposerAgentSelect fallbackAgentId="a1" />)
    await userEvent.click(screen.getByRole('button', { name: /garden/i }))
    const items = await screen.findAllByRole('menuitemradio')

    expect(items.map((item) => item.textContent)).toEqual([
      'Garden',
      'Archivist',
      'Scout',
    ])
  })

  it('falls back to the first selectable agent when no id resolves', () => {
    render(<ComposerAgentSelect fallbackAgentId="a4" />)
    expect(screen.getByRole('button', { name: /garden/i })).toBeInTheDocument()
  })
})
