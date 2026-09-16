/**
 * ComposerToolsMenu — the left-hand "Tools" control in the new Tiptap-based
 * chat composer footer (2026-09-08 spec §8.1).
 *
 * Fully controlled: every value it shows (`presetId`, `permissionMode`,
 * `sources`) and every change it can make (`onPresetChange`,
 * `onPermissionModeChange`, `onRemoveSource`) comes in and goes out through
 * props. Task 12 owns the actual state; this component owns none of it
 * except the Sources section's own open/closed disclosure, which is purely
 * a display affordance and not shared with anything else.
 *
 * Three sections, top to bottom:
 *
 * 1. **Presets** — a radio group over `TOOL_PRESETS` (from
 *    `./composer-tools`, Task 4). These presets are static config with no
 *    backend behind them yet (2026-09-08 spec, verdict D: build the UI as
 *    designed, wire it up later). Selecting one is currently inert beyond
 *    updating the trigger label — it does not change what tools are
 *    actually available to the model.
 *
 * 2. **Sources** — mirrors the composer's currently-selected documents. This
 *    is *the same underlying list* as the `+` attachment menu's document
 *    picker, just a second view onto it (per spec, "pending team
 *    confirmation" — the exact cross-view semantics haven't been signed off,
 *    so this component only renders what it's given and calls
 *    `onRemoveSource`; it does not itself decide what counts as a "source").
 *    Removing a chip here is expected to remove the same document from the
 *    `+` menu's picker, since they read the same list — that wiring lives
 *    wherever the shared state is owned (Task 12), not in this component.
 *
 * 3. **Permission mode** — moved here from the old `chat-composer.tsx`
 *    (previously inline in the composer footer, ~lines 890-941). The two
 *    radio items (`ask` "Always ask", `accept-all` "Accept all") are copied
 *    across verbatim, icons and sub-labels included. This control is
 *    already inert today and stays that way here: verified that
 *    `useToolApprovals` takes `{ sessionId, messages,
 *    addToolApprovalResponse, continueAfterGardenApproval }` with no mode
 *    argument, so `permissionMode` currently feeds nothing downstream. It's
 *    parked in this popover pending a final placement decision — do not
 *    read its presence here as "this now controls tool approval behavior."
 *
 * Built on `DropdownMenu` from `@garden/ui/components/ui/dropdown-menu`
 * (Base UI `Menu` under the hood), matching how the rest of the repo
 * composes dropdown popovers (see `chat-document-panel.tsx`'s
 * `DocumentVersionMenu` and `chat-composer.tsx`'s old permission-mode menu,
 * which this section was lifted from).
 *
 * Both the Sources disclosure header and each chip row are wrapped in a
 * `DropdownMenuItem`, which by default closes the whole popover on click
 * (Base UI `Menu.Item`'s `closeOnClick`, default `true` — confirmed against
 * `node_modules/@base-ui/react/menu/item/MenuItem.d.ts`; there is no
 * `onSelect` prop on this component, despite that being the equivalent
 * "prevent auto-close" API on other menu libraries this repo doesn't use).
 * Both are given `closeOnClick={false}` so clicking them toggles/removes
 * without dismissing the menu. The chip row's remove `<button>` additionally
 * calls `event.stopPropagation()` in its own `onClick`, which stops the
 * click from also being treated as "the row itself was clicked" (the row
 * has no click behavior of its own, but stopping propagation keeps that
 * explicit rather than relying on `closeOnClick={false}` alone to make a
 * future row-level `onClick` a no-op).
 */

import { useState } from 'react'
import { ChevronDown, Shield, ShieldCheck, X } from 'lucide-react'
import { Button } from '@garden/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@garden/ui/components/ui/dropdown-menu'
import { cn } from '@garden/ui/lib/utils'
import { FileKindIcon, type FileKind } from '../chat-document-panel'
import {
  DEFAULT_TOOL_PRESET_ID,
  TOOL_PRESETS,
  type ToolPresetId,
} from './composer-tools'
import { SlidersHorizontalIcon } from '@garden/ui/components/icons'

/** One chip in the Sources list — a document currently attached/selected in
 * the composer, mirrored from the `+` menu's document picker. */
export interface ComposerSourceChip {
  id: string
  label: string
  kind: FileKind
}

export function ComposerToolsMenu(props: {
  presetId: ToolPresetId
  onPresetChange: (id: ToolPresetId) => void
  permissionMode: 'ask' | 'accept-all'
  onPermissionModeChange: (mode: 'ask' | 'accept-all') => void
  sources: ComposerSourceChip[]
  onRemoveSource: (id: string) => void
}): JSX.Element {
  const {
    presetId,
    onPresetChange,
    permissionMode,
    onPermissionModeChange,
    sources,
    onRemoveSource,
  } = props
  const [sourcesOpen, setSourcesOpen] = useState(true)

  const selectedPreset =
    TOOL_PRESETS.find((preset) => preset.id === presetId) ??
    TOOL_PRESETS.find((preset) => preset.id === DEFAULT_TOOL_PRESET_ID) ??
    TOOL_PRESETS[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            aria-label="Tools"
            className="h-8 gap-3 rounded-sm px-2 text-icon-default"
          >
            <SlidersHorizontalIcon className="size-4" />
            <span className="body-small text-text-default">
              {selectedPreset.label}
            </span>
          </Button>
        }
      />
      <DropdownMenuContent align="start" sideOffset={6} className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Tools</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={presetId}
            onValueChange={(value) => onPresetChange(value as ToolPresetId)}
          >
            {TOOL_PRESETS.map((preset) => {
              const Icon = preset.icon
              return (
                <DropdownMenuRadioItem key={preset.id} value={preset.id}>
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm">{preset.label}</span>
                </DropdownMenuRadioItem>
              )
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          closeOnClick={false}
          onClick={() => setSourcesOpen((open) => !open)}
          className="justify-between text-xs font-medium text-muted-foreground"
        >
          Sources
          <ChevronDown
            className={cn('size-3.5 opacity-60 transition-transform', {
              '-rotate-90': !sourcesOpen,
            })}
          />
        </DropdownMenuItem>
        {sourcesOpen ? (
          sources.length === 0 ? (
            <DropdownMenuItem disabled>No sources attached</DropdownMenuItem>
          ) : (
            sources.map((source) => (
              <DropdownMenuItem
                key={source.id}
                closeOnClick={false}
                className="justify-between"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FileKindIcon kind={source.kind} />
                  <span className="truncate">{source.label}</span>
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${source.label}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    onRemoveSource(source.id)
                  }}
                  className="shrink-0 rounded-sm p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </DropdownMenuItem>
            ))
          )
        ) : null}

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>Tool permissions</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={permissionMode}
            onValueChange={(value) =>
              onPermissionModeChange(value as 'ask' | 'accept-all')
            }
          >
            <DropdownMenuRadioItem value="ask">
              <Shield className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-sm">Always ask</span>
                <span className="text-muted-foreground/70 text-xs">
                  Confirm every tool use
                </span>
              </div>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="accept-all">
              <ShieldCheck className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-sm">Accept all</span>
                <span className="text-muted-foreground/70 text-xs">
                  Auto-approve tool calls
                </span>
              </div>
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
