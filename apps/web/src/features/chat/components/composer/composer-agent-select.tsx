/**
 * ComposerAgentSelect — the right-hand agent selector in the chat composer
 * footer (2026-09-08 spec §8.2, verdict B).
 *
 * What it shows: the agent whose id is `selectedAgentId ?? fallbackAgentId`
 * (the chat store value, falling back to the caller-supplied default),
 * falling back further to the first agent in the workspace's agent list if
 * neither id resolves to a known agent. `fallbackAgentId` is typically the
 * workspace's default/primary agent, passed in by the caller rather than
 * looked up here.
 *
 * What picking an agent does: it calls `setSelectedAgentId(id)` on the
 * shared chat store (`@garden/app-state/chat`). That store value is not new
 * — it is the existing signal `chat-composer.tsx` already reads to decide
 * which agent a *new* session gets created against, and to filter which
 * warm/idle sessions are reusable for the current agent. This component
 * only writes that one value; it does not add a second source of truth.
 *
 * Known limitation (accepted, not solved here — spec verdict B): there is
 * no server path for retargeting an *in-progress* conversation to a
 * different agent. Writing `selectedAgentId` governs the next new session
 * only. If the user picks a different agent mid-conversation, the current
 * session keeps running against whichever agent it was created with; the
 * new selection takes effect only once a fresh session is started. Do not
 * read this component as "switch the live session's agent" — it isn't
 * that, and there is intentionally no API call wired up here to make it so.
 *
 * What this control is NOT: a model picker. The Penpot board for this menu
 * (2026-09) drew rows named after models ("GPT 5.6", "Opus 4.8", "Sonnet
 * 4.8"), but a model is not an agent property in Garden — `schema.agent`
 * has no model column and the model is resolved per deployment from
 * `GARDEN_MODEL_ID` (`packages/agent-runtime/src/model.ts`). Rows here can
 * only ever be workspace agents: the seeded default plus whatever the
 * workspace has created. Model selection needs its own control and its own
 * persistence before it can exist; it is deliberately not faked here by
 * matching agent names against provider strings.
 *
 * Built on `DropdownMenu` from `@garden/ui/components/ui/dropdown-menu`,
 * matching the tools selector beside it.
 */

import type { JSX } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Bot } from 'lucide-react'
import type { Agent } from '@garden/core/types'
import { useWorkspaceId } from '@garden/app-state/hooks'
import { useChatStore } from '@garden/app-state/chat'
import { agentListOptions } from '@/lib/workspace/queries'
import { HarnessyIcon } from '@garden/ui/components/icons'
import { Button } from '@garden/ui/components/ui/button'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@garden/ui/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@garden/ui/components/ui/dropdown-menu'

/**
 * Small glyph for one agent (or the empty/unresolved state).
 *
 * Identity is read from fields the server actually owns, never from the
 * display name: an earlier pass matched `agent.name` against "gpt" / "opus" /
 * "sonnet" substrings to pick a provider logo, which put a vendor mark on any
 * workspace agent a user happened to name "Opus notes" and implied a
 * model-per-agent that does not exist (see the file header).
 *
 * Order: uploaded avatar, then the Harnessy mark for the workspace's default
 * agent (`is_default`, set once at workspace creation), then a generic bot.
 * The avatar branch is inert today — `toAgent` in
 * `apps/web/src/lib/server/control-plane.ts` hardcodes `avatar_url: null` —
 * but it is the shape the API type promises, so it stays wired rather than
 * being re-derived when avatars land.
 *
 * Sized by className rather than `size="sm"`: that variant applies its size
 * through a `data-[size=sm]:size-6` rule, and a class+attribute selector wins
 * over a plain `size-*` class, so passing both silently renders 24px instead
 * of the 20px this row wants. Verified against `Avatar` in
 * `packages/ui/components/ui/avatar.tsx`. The Harnessy mark is drawn on an
 * 18×24 viewBox, so it takes `h-5 w-3.75` (20×15px) to share the 20px optical
 * row height without stretching.
 */
function AgentGlyph({ agent }: { agent: Agent | undefined }): JSX.Element {
  if (agent?.avatar_url) {
    return (
      <Avatar className="size-5">
        <AvatarImage src={agent.avatar_url} />
        <AvatarFallback>
          <Bot className="size-3.5" />
        </AvatarFallback>
      </Avatar>
    )
  }

  if (agent?.is_default) {
    return <HarnessyIcon className="h-5 w-3.75 shrink-0" />
  }

  return <Bot className="size-5 shrink-0 text-icon-default" />
}

/**
 * Active agents for this workspace, in a stable menu order.
 *
 * Two server gaps are absorbed here rather than in the shared query, which
 * other surfaces (mention tags, issue assignees) rely on for the full set:
 *
 * 1. `GET /api/agents` returns every row for the workspace with no status
 *    filter — its `include_archived` query param is accepted by the client
 *    (`listAgents`) but never read by the route handler
 *    (`apps/web/src/routes/api/agents.ts`). Archived and pending-approval
 *    agents would otherwise be pickable here and start sessions.
 * 2. That same query has no `ORDER BY`, so Postgres row order is unspecified
 *    and the menu could reshuffle between loads. Default agent first, then
 *    alphabetical, keeps the workspace's primary agent pinned to the top row
 *    the way the board draws it.
 */
function selectableAgents(agents: Agent[]): Agent[] {
  return agents
    .filter((agent) => agent.record_status === 'active')
    .sort((left, right) => {
      if (left.is_default !== right.is_default) return left.is_default ? -1 : 1
      return left.name.localeCompare(right.name)
    })
}

export function ComposerAgentSelect(props: {
  /** Falls back to this when the store has no selectedAgentId. */
  fallbackAgentId: string | null
}): JSX.Element {
  const { fallbackAgentId } = props
  const workspaceId = useWorkspaceId()
  const { data, isPending } = useQuery(agentListOptions(workspaceId))
  const selectedAgentId = useChatStore((s) => s.selectedAgentId)
  const setSelectedAgentId = useChatStore((s) => s.setSelectedAgentId)

  const agents = selectableAgents(data ?? [])
  const wantedId = selectedAgentId ?? fallbackAgentId
  const current = agents.find((agent) => agent.id === wantedId) ?? agents[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            aria-label={`Agent: ${current?.name ?? 'Select agent'}`}
            className="h-8 gap-2 rounded-pill bg-background-main-secondary px-3 hover:bg-background-main-secondary-hover"
          >
            <AgentGlyph agent={current} />
            <span className="body-small max-w-28 truncate text-text-default">
              {current?.name ?? 'Agent'}
            </span>
            <ChevronDown className="size-4.5 text-icon-default" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" sideOffset={6} className="w-52">
        <DropdownMenuRadioGroup
          value={current?.id ?? ''}
          onValueChange={(value) => setSelectedAgentId(value)}
        >
          {agents.map((agent) => (
            <DropdownMenuRadioItem
              key={agent.id}
              value={agent.id}
              className="gap-3 py-2"
            >
              <AgentGlyph agent={agent} />
              <span className="body-small truncate text-text-default">
                {agent.name}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {agents.length === 0 ? (
          <span className="body-small block px-1.5 py-2 text-text-subtle">
            {isPending ? 'Loading agents…' : 'No agents'}
          </span>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
