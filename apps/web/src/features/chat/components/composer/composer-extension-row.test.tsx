import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@garden/app-state/hooks', () => ({ useWorkspaceId: () => 'ws-1' }))
vi.mock('@/lib/workspace/queries', () => ({
  connectionListOptions: () => ({}),
}))
const useQueryMock = vi.hoisted(() => vi.fn())
vi.mock('@tanstack/react-query', () => ({ useQuery: useQueryMock }))

import { ComposerExtensionRow } from './composer-extension-row'

describe('ComposerExtensionRow', () => {
  it('shows "Use a folder" by default and "Connect your apps"', () => {
    useQueryMock.mockReturnValue({ data: undefined, isPending: false })
    render(<ComposerExtensionRow onOpenConnections={vi.fn()} />)
    expect(
      screen.getByRole('button', { name: /use a folder/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('Connect your apps')).toBeInTheDocument()
  })

  it('opens connections when the strip is clicked', async () => {
    useQueryMock.mockReturnValue({ data: undefined, isPending: false })
    const onOpenConnections = vi.fn()
    render(<ComposerExtensionRow onOpenConnections={onOpenConnections} />)
    await userEvent.click(
      screen.getByRole('button', { name: /connect your apps/i }),
    )
    expect(onOpenConnections).toHaveBeenCalledTimes(1)
  })

  it('picks a stub folder', async () => {
    useQueryMock.mockReturnValue({ data: undefined, isPending: false })
    render(<ComposerExtensionRow onOpenConnections={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /use a folder/i }))
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Planning' }),
    )
    expect(
      screen.getByRole('button', { name: /planning/i }),
    ).toBeInTheDocument()
  })

  it('renders default app icons when there are no connected integrations', () => {
    useQueryMock.mockReturnValue({
      data: { integrations: [] },
      isPending: false,
    })
    render(<ComposerExtensionRow onOpenConnections={vi.fn()} />)
    const strip = screen.getByRole('button', { name: /connect your apps/i })
    expect(strip.querySelectorAll('svg')).toHaveLength(4)
    expect(strip.querySelector('img')).not.toBeInTheDocument()
  })

  it('renders connected integration icons, capped at 4 with an overflow count', () => {
    useQueryMock.mockReturnValue({
      data: {
        integrations: [
          {
            slug: 'a',
            label: 'A',
            status: 'connected',
            icon: { _tag: 'Some', value: 'https://x/a.png' },
          },
          {
            slug: 'b',
            label: 'B',
            status: 'connected',
            icon: { _tag: 'None' },
          },
          {
            slug: 'c',
            label: 'C',
            status: 'connected',
            icon: { _tag: 'Some', value: 'https://x/c.png' },
          },
          {
            slug: 'd',
            label: 'D',
            status: 'connected',
            icon: { _tag: 'Some', value: 'https://x/d.png' },
          },
          {
            slug: 'e',
            label: 'E',
            status: 'connected',
            icon: { _tag: 'Some', value: 'https://x/e.png' },
          },
          {
            slug: 'f',
            label: 'F',
            status: 'available',
            icon: { _tag: 'Some', value: 'https://x/f.png' },
          },
        ],
      },
      isPending: false,
    })
    render(<ComposerExtensionRow onOpenConnections={vi.fn()} />)
    const strip = screen.getByRole('button', { name: /connect your apps/i })
    expect(strip.querySelectorAll('img')).toHaveLength(3)
    expect(strip.querySelectorAll('svg')).toHaveLength(1)
    expect(screen.getByText('+1')).toBeInTheDocument()
  })
})
