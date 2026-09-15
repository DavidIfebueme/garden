/**
 * ComposerExtensionRow — the strip beneath the chat composer pill holding a
 * folder selector (left) and a connected-apps strip (right) (2026-09-08
 * spec §9).
 *
 * The two halves are not equally real:
 *
 * **Folder selector (left) is entirely presentational.** No folder data
 * model exists anywhere in the app yet (verdict D, same as `composer-
 * tools.ts`'s `TOOL_PRESETS`/`FOLDER_STUB`: build the UI as designed,
 * backend later). It renders `FOLDER_STUB` from `./composer-tools` (Task 4)
 * and holds the current pick in local `useState<FolderStubItem | null>`.
 * There is no query, no store field, and no persistence — refreshing the
 * page forgets the selection. The stub's `new` entry (`NEW_FOLDER_STUB_ID`,
 * "New folder…") is inert beyond selection: picking it just sets the
 * trigger label like any other row, it does not open a creation flow.
 *
 * **Connectors (right) are real.** They read
 * `useQuery(connectionListOptions(workspaceId))` from
 * `@/lib/workspace/queries`, with `workspaceId` from `useWorkspaceId()`
 * (`@garden/app-state/hooks`). Clicking the strip calls the injected
 * `onOpenConnections` callback (wired to the Connections dock panel by the
 * caller — this component does not know what "Connections" means beyond a
 * click handler).
 *
 * Resolved connections field shape (read from `apps/web/src/lib/api/
 * connections.ts`, `apps/web/src/lib/executor-contract.ts`, and
 * `features/connections/components/connections-page.tsx`'s `ProviderIcon`):
 *
 * - `listConnections()` decodes to `ExecutorConnectionsSnapshot`, whose
 *   query data shape is `{ integrations: ExecutorIntegrationItem[] }`. The
 *   list of integrations lives at `data.integrations` (empty array, never
 *   undefined, once the query resolves).
 * - "Connected" is `item.status === 'connected'`
 *   (`ExecutorIntegrationStatus` is one of `'available' | 'connected' |
 *   'degraded' | 'setup_required'`) — this is the literal status flag, not
 *   `connections-page.tsx`'s broader `installedIntegrations` filter
 *   (`canRemove || connections.length > 0`), which also counts degraded/
 *   awaiting-setup installs. This strip's copy says "connected apps", so
 *   the literal status match is what's rendered.
 * - Display name: `item.label` (`NonBlankString`, i.e. a non-empty
 *   string) — used only for the `alt`/fallback context, not shown as text
 *   here (the strip shows icons, not names).
 * - Icon URL: `item.icon`, typed `Option.Option<string>`
 *   (`OptionalHttpsUrl = Schema.OptionFromOptionalKey(ExecutorHttpsUrl)`).
 *   Mirrors `connections-page.tsx`'s `ProviderIcon`: `Option.isSome(item
 *   .icon)` renders `<img src={item.icon.value} alt="" />`; `Option.isNone`
 *   (or, per that same component, a failed image load) falls back to the
 *   `Plug` icon. When no integrations are connected, the strip displays the
 *   default app icons (Notion, Slack, Gmail, GitHub) from `CONNECT_APPS_STUB`.
 *   This row skips the `onError`-triggered fallback
 *   `ProviderIcon` does (no local "did this particular image fail" state
 *   per icon) since the row's icons are decorative and small; a broken
 *   image here just shows nothing broken-looking, not a design goal worth
 *   the extra state.
 */

import { useState } from 'react'
import { Option } from 'effect'
import { useQuery } from '@tanstack/react-query'
import { useWorkspaceId } from '@garden/app-state/hooks'
import { ChevronDown, Plug } from 'lucide-react'
import { connectionListOptions } from '@/lib/workspace/queries'
import { FolderIcon } from '@garden/ui/components/icons'
import { Button } from '@garden/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@garden/ui/components/ui/dropdown-menu'
import {
  CONNECT_APPS_STUB,
  FOLDER_STUB,
  type FolderStubItem,
} from './composer-tools'

const MAX_CONNECTION_ICONS = 4

export function ComposerExtensionRow(props: {
  onOpenConnections: () => void
}): JSX.Element {
  const { onOpenConnections } = props
  const [selectedFolder, setSelectedFolder] = useState<FolderStubItem | null>(
    null,
  )

  const workspaceId = useWorkspaceId()
  const { data } = useQuery(connectionListOptions(workspaceId))

  // Guard `integrations` as well as `data`. `data?.integrations.filter(...)`
  // only narrows `data`, so a payload that arrives without an `integrations`
  // key throws "Cannot read properties of undefined (reading 'filter')" and
  // takes the whole composer down with it. Found when this row was first
  // mounted (Task 13) — it renders on every chat, so failing open matters.
  const connectedIntegrations =
    data?.integrations?.filter((item) => item.status === 'connected') ?? []
  const shownIntegrations = connectedIntegrations.slice(0, MAX_CONNECTION_ICONS)
  const overflowCount = connectedIntegrations.length - shownIntegrations.length

  /*
    The three spacing values below are coupled and should move together. The
    slab is pulled up behind the composer pill so it reads as one shape rather
    than a second card: `-mt-8` slides it under the pill far enough that its
    square top corners sit behind the pill's rounded bottom and never show, and
    `pt-10` then pushes this row's own content back below the pill's edge.
    Shrinking the negative margin without shrinking the padding moves the
    content up under the pill; changing either alone breaks the seam.

    This depends on the pill painting above it — `composer.tsx` gives the pill
    `z-10` for exactly this reason. Removing that makes the slab cover it.
  */
  return (
    <div className="-mt-8 flex items-center justify-between gap-2 rounded-b-2xl bg-background-main-secondary px-2 pt-10 pb-4">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={
                selectedFolder
                  ? `Folder: ${selectedFolder.label}`
                  : 'Use a folder'
              }
              className="h-8 gap-2 rounded-sm px-2 text-text-secondary hover:bg-background-main-secondary-hover"
            >
              <FolderIcon className="size-4" />
              <span className="body-small">
                {selectedFolder?.label ?? 'Use a folder'}
              </span>
              <ChevronDown className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="start" sideOffset={6}>
          {FOLDER_STUB.map((folder) => (
            <DropdownMenuItem
              key={folder.id}
              onClick={() => setSelectedFolder(folder)}
            >
              {folder.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        aria-label="Connect your apps"
        onClick={onOpenConnections}
        className="flex h-8 items-center gap-4 rounded-sm px-2 text-text-secondary hover:bg-background-main-secondary-hover hover:text-text-default"
      >
        <span className="body-small">Connect your apps</span>
        <span className="flex items-center gap-1">
          {shownIntegrations.length > 0 ? (
            shownIntegrations.map((integration) =>
              Option.isSome(integration.icon) ? (
                <img
                  key={integration.slug}
                  className="size-4 rounded-sm"
                  src={integration.icon.value}
                  alt=""
                />
              ) : (
                <Plug key={integration.slug} className="size-4" />
              ),
            )
          ) : (
            CONNECT_APPS_STUB.map((app) => {
              const Icon = app.icon
              return <Icon key={app.id} className="size-4" />
            })
          )}
          {overflowCount > 0 ? <span>+{overflowCount}</span> : null}
        </span>
      </button>
    </div>
  )
}
