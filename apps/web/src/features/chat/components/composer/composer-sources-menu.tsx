/**
 * ComposerSourcesMenu — the `Sources` control in the chat composer footer,
 * sitting immediately right of the tools trigger (2026-09-17 composer-field
 * board).
 *
 * It is a sibling of `ComposerToolsMenu`, not a section inside it. The first
 * pass at this design put the source list inside the tools popover, anchored
 * to the selected row; the board instead puts it in the composer row itself,
 * so the active tool and its sources read as two controls on one line and the
 * list opens as its own popover from its own trigger.
 *
 * Whether it appears at all is the caller's decision, driven by
 * `TOOL_PRESET_IDS_WITH_SOURCES`: `composer.tsx` mounts it only while a
 * document-backed preset (Org. Brain, Research Synthesis, Document Review) is
 * selected. It is absent rather than disabled for the other three — there is
 * nothing to explain to someone using `QA Agent`, so a greyed-out control
 * would be noise.
 *
 * Every row renders as not-yet-connected: a muted provider name with a
 * Connect action on the right. See `TOOL_SOURCE_STUB` for why live connection
 * status is not read here. Connecting opens the Connections route through
 * `onConnect`, the same callback the extension row's "Connect your apps"
 * strip uses — this component does not know what "Connections" means beyond a
 * click handler.
 *
 * Rows pass `closeOnClick={false}` (Base UI `Menu.Item`'s `closeOnClick`,
 * default `true` — confirmed against
 * `node_modules/@base-ui/react/menu/item/MenuItem.d.ts`; there is no
 * `onSelect` prop on this component, despite that being the equivalent
 * "prevent auto-close" API on other menu libraries this repo doesn't use).
 * Connecting navigates elsewhere, so tearing the composer's popover down from
 * underneath the click is the caller's call to make, not this row's.
 *
 * The whole row is the click target rather than just the "Connect" text — the
 * text is the affordance, the row is the hit area, which is how the rest of
 * the composer's menu items behave.
 */

import type { JSX } from 'react'
import { CaretUpDown, ListMagnifyingGlass } from '@phosphor-icons/react'
import { Button } from '@garden/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@garden/ui/components/ui/dropdown-menu'
import { TOOL_SOURCE_STUB } from './composer-tools'

export function ComposerSourcesMenu(props: {
  onConnect: () => void
}): JSX.Element {
  const { onConnect } = props

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            aria-label="Sources"
            className="h-8 gap-3 rounded-sm px-2 text-icon-default"
          >
            <ListMagnifyingGlass className="size-4" />
            <span className="body-small text-text-default">Sources</span>
            <CaretUpDown className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" sideOffset={6} className="w-56">
        {TOOL_SOURCE_STUB.map((source) => {
          const Icon = source.icon
          return (
            <DropdownMenuItem
              key={source.id}
              closeOnClick={false}
              onClick={onConnect}
              aria-label={`Connect ${source.label}`}
              className="justify-between gap-3 py-2"
            >
              <span className="flex min-w-0 items-center gap-3">
                <Icon className="size-4 shrink-0" />
                <span className="body-small truncate text-text-secondary">
                  {source.label}
                </span>
              </span>
              <span className="body-small shrink-0 text-text-default">
                Connect
              </span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
