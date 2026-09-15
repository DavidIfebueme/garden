import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ComposerToolsMenu } from './composer-tools-menu'

const base = {
  presetId: 'default' as const,
  onPresetChange: vi.fn(),
  permissionMode: 'ask' as const,
  onPermissionModeChange: vi.fn(),
  sources: [],
  onRemoveSource: vi.fn(),
}

describe('ComposerToolsMenu', () => {
  it('shows the selected preset label on the trigger', () => {
    render(<ComposerToolsMenu {...base} presetId="org-brain" />)
    expect(screen.getByRole('button', { name: /tools/i })).toHaveTextContent(
      'Org. Brain',
    )
  })

  it('changes preset on selection', async () => {
    const onPresetChange = vi.fn()
    render(<ComposerToolsMenu {...base} onPresetChange={onPresetChange} />)
    await userEvent.click(screen.getByRole('button', { name: /tools/i }))
    // Base UI's Menu mounts/positions its popup asynchronously (floating-ui
    // computes placement off the microtask queue), so the radio items are
    // not present in the DOM the instant the click handler returns —
    // findByRole polls until they appear instead of asserting synchronously.
    await userEvent.click(
      await screen.findByRole('menuitemradio', { name: /QA Agent/ }),
    )
    expect(onPresetChange).toHaveBeenCalledWith('qa-agent')
  })

  it('lists source chips and removes them', async () => {
    const onRemoveSource = vi.fn()
    render(
      <ComposerToolsMenu
        {...base}
        sources={[{ id: 's1', label: 'Manager.pdf', kind: 'pdf' }]}
        onRemoveSource={onRemoveSource}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /tools/i }))
    await userEvent.click(
      await screen.findByRole('button', { name: /remove Manager\.pdf/i }),
    )
    expect(onRemoveSource).toHaveBeenCalledWith('s1')
  })

  it('switches permission mode', async () => {
    const onPermissionModeChange = vi.fn()
    render(
      <ComposerToolsMenu
        {...base}
        onPermissionModeChange={onPermissionModeChange}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /tools/i }))
    await userEvent.click(
      await screen.findByRole('menuitemradio', { name: /Accept all/ }),
    )
    expect(onPermissionModeChange).toHaveBeenCalledWith('accept-all')
  })

  it('does not close the menu when removing a source chip', async () => {
    const onRemoveSource = vi.fn()
    render(
      <ComposerToolsMenu
        {...base}
        sources={[{ id: 's1', label: 'Manager.pdf', kind: 'pdf' }]}
        onRemoveSource={onRemoveSource}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /tools/i }))
    const removeButton = await screen.findByRole('button', {
      name: /remove Manager\.pdf/i,
    })
    await userEvent.click(removeButton)
    // The permission-mode radio group is further down in the same popover;
    // if removing the chip had dismissed the menu, this would fail to find it.
    expect(
      await screen.findByRole('menuitemradio', { name: /Accept all/ }),
    ).toBeInTheDocument()
  })

  it('toggles the Sources section open/closed without closing the menu', async () => {
    render(
      <ComposerToolsMenu
        {...base}
        sources={[{ id: 's1', label: 'Manager.pdf', kind: 'pdf' }]}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /tools/i }))
    // Sources starts open by default, so the chip row is visible.
    expect(
      await screen.findByRole('button', { name: /remove Manager\.pdf/i }),
    ).toBeInTheDocument()

    const sourcesHeader = await screen.findByRole('menuitem', {
      name: /sources/i,
    })
    await userEvent.click(sourcesHeader)

    // Collapsing hides the chip row...
    expect(
      screen.queryByRole('button', { name: /remove Manager\.pdf/i }),
    ).not.toBeInTheDocument()
    // ...but the popover itself must still be open — a control further down
    // in the same content (the permission-mode radios) is still reachable.
    // If clicking the header had instead closed the whole menu (the
    // pre-fix behavior, since Base UI `Menu.Item` has no `onSelect` and
    // defaults `closeOnClick` to true), this would fail to find it.
    expect(
      await screen.findByRole('menuitemradio', { name: /Accept all/ }),
    ).toBeInTheDocument()

    // Clicking again re-expands it, still without closing the menu.
    await userEvent.click(sourcesHeader)
    expect(
      await screen.findByRole('button', { name: /remove Manager\.pdf/i }),
    ).toBeInTheDocument()
  })
})
