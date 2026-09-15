/**
 * ComposerAgentSelect — the right-hand "Harnessy" agent selector in the
 * chat composer footer (2026-09-08 spec §8.2, verdict B).
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
 * Built on the `ModelSelector*` family (`@/components/ai-elements/model-
 * selector.tsx`, itself a thin wrapper over `Dialog` + `Command`) rather
 * than a bespoke popover, so this control matches the model-picker's
 * interaction pattern (searchable command palette in a dialog). The agent
 * avatar mirrors `features/agents/components/agents-page.tsx`'s
 * `AgentCard`: `Avatar` + `AvatarImage` (when `avatar_url` is set) +
 * `AvatarFallback` showing a generic bot glyph.
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Bot } from 'lucide-react'
import type { Agent } from '@garden/core/types'
import { useWorkspaceId } from '@garden/app-state/hooks'
import { useChatStore } from '@garden/app-state/chat'
import { agentListOptions } from '@/lib/workspace/queries'
import { Button } from '@garden/ui/components/ui/button'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@garden/ui/components/ui/avatar'
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorTrigger,
} from '@/components/ai-elements/model-selector'

/**
 * Small avatar glyph for one agent (or the empty/unresolved state).
 *
 * Sized by className rather than `size="sm"`: that variant applies its size
 * through a `data-[size=sm]:size-6` rule, and a class+attribute selector wins
 * over a plain `size-*` class, so passing both silently renders 24px instead
 * of the 18px this trigger wants. Verified against `Avatar` in
 * `packages/ui/components/ui/avatar.tsx`.
 */
function AgentGlyph({ agent }: { agent: Agent | undefined }): JSX.Element {
  return (
    <Avatar className="size-4.5">
      {agent?.avatar_url ? <AvatarImage src={agent.avatar_url} /> : null}
      <AvatarFallback>
        <Bot className="size-3.5" />
      </AvatarFallback>
    </Avatar>
  )
}

export function ComposerAgentSelect(props: {
  /** Falls back to this when the store has no selectedAgentId. */
  fallbackAgentId: string | null
}): JSX.Element {
  const { fallbackAgentId } = props
  const [open, setOpen] = useState(false)
  const workspaceId = useWorkspaceId()
  const { data, isPending } = useQuery(agentListOptions(workspaceId))
  const selectedAgentId = useChatStore((s) => s.selectedAgentId)
  const setSelectedAgentId = useChatStore((s) => s.setSelectedAgentId)

  const agents = data ?? []
  const wantedId = selectedAgentId ?? fallbackAgentId
  const current = agents.find((agent) => agent.id === wantedId) ?? agents[0]

  return (
    <ModelSelector open={open} onOpenChange={setOpen}>
      <ModelSelectorTrigger
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
            <ChevronDown className="size-[18px] text-icon-default" />
          </Button>
        }
      />
      <ModelSelectorContent title="Select agent">
        <ModelSelectorInput placeholder="Search agents…" />
        <ModelSelectorList>
          <ModelSelectorEmpty>
            {isPending ? 'Loading agents…' : 'No agents'}
          </ModelSelectorEmpty>
          <ModelSelectorGroup>
            {agents.map((agent) => (
              <ModelSelectorItem
                key={agent.id}
                value={agent.name}
                onSelect={() => {
                  setSelectedAgentId(agent.id)
                  setOpen(false)
                }}
              >
                <AgentGlyph agent={agent} /> {agent.name}
              </ModelSelectorItem>
            ))}
          </ModelSelectorGroup>
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  )
}
