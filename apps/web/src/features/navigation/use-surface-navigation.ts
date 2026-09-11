import { useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useSurfaceTabsStore } from '@garden/app-state/surface-tabs'
import type { AgentChatSession } from '@garden/core/types'

/**
 * Surface navigation for the redesigned shell — the dock.openPanel replacement.
 * Every cross-surface open goes through typed helpers here: they navigate to the
 * owning route and, for tabbable surfaces (Chats, Tasks), record the tab in the
 * surface-tabs store. Callers keep the one-call ergonomics the dock had without
 * depending on FlexLayout state.
 */
export function useSurfaceNavigation() {
  const navigate = useNavigate()
  const upsertTab = useSurfaceTabsStore((s) => s.upsertTab)

  const openIssue = useCallback(
    (issue: { id: string; title: string }, options?: { focus?: string | null }) => {
      upsertTab('tasks', { id: issue.id, title: issue.title })
      void navigate({
        to: '/tasks/$issueId',
        params: { issueId: issue.id },
        // focus carries inbox deep-link targets (comment/run/question/…)
        // through to the task detail — TanStack clears search when the
        // destination omits it, so it must be forwarded explicitly.
        search: options?.focus ? { focus: options.focus } : {},
      })
    },
    [navigate, upsertTab],
  )

  const openChatSession = useCallback(
    (session: Pick<AgentChatSession, 'id' | 'title'>) => {
      upsertTab('chats', { id: session.id, title: session.title })
      void navigate({
        to: '/chats/$threadId',
        params: { threadId: session.id },
      })
    },
    [navigate, upsertTab],
  )

  const openAgent = useCallback(
    (agent: { id: string }) => {
      void navigate({ to: '/agents/$agentId', params: { agentId: agent.id } })
    },
    [navigate],
  )

  const openAutomation = useCallback(
    (automation: { id: string }) => {
      void navigate({
        to: '/workflows/$id',
        params: { id: automation.id },
      })
    },
    [navigate],
  )

  const openSkill = useCallback(
    (skillId: string) => {
      void navigate({ to: '/skills', search: { focus: skillId } })
    },
    [navigate],
  )

  const openConnections = useCallback(
    (connectorId?: string) => {
      void navigate({
        to: '/connectors',
        search: connectorId ? { connector_id: connectorId } : {},
      })
    },
    [navigate],
  )

  return {
    openIssue,
    openChatSession,
    openAgent,
    openAutomation,
    openSkill,
    openConnections,
    navigate,
  }
}
