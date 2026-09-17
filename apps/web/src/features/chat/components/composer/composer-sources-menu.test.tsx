import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ComposerSourcesMenu } from './composer-sources-menu'

describe('ComposerSourcesMenu', () => {
  it('lists every source with a Connect action', async () => {
    render(<ComposerSourcesMenu onConnect={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /sources/i }))
    // Base UI's Menu mounts/positions its popup asynchronously, so poll for
    // the rows rather than asserting synchronously after the click.
    const items = await screen.findAllByRole('menuitem')
    expect(items.map((item) => item.textContent)).toEqual([
      'NotionConnect',
      'SlackConnect',
      'GmailConnect',
      'GitHubConnect',
      'Google DriveConnect',
    ])
  })

  it('opens connections from a row without closing the menu', async () => {
    const onConnect = vi.fn()
    render(<ComposerSourcesMenu onConnect={onConnect} />)
    await userEvent.click(screen.getByRole('button', { name: /sources/i }))
    await userEvent.click(
      await screen.findByRole('menuitem', { name: /connect notion/i }),
    )
    expect(onConnect).toHaveBeenCalledTimes(1)
    // If the row had dismissed the menu (Base UI `Menu.Item` defaults
    // `closeOnClick` to true), the other rows would be gone.
    expect(
      await screen.findByRole('menuitem', { name: /connect gmail/i }),
    ).toBeInTheDocument()
  })
})
