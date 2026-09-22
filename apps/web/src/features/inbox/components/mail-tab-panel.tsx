import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@garden/app-state/auth'
import { Button } from '@garden/ui/components/ui/button'
import { Bot } from 'lucide-react'
import {
  MailAgentConversationPanel,
  MailAgentPane,
  MailComposer,
  MailConversationDetail,
  MailConversationList,
  MailConversationRow,
  MailDetailSkeleton,
  MailDetailToolbar,
  MailEmptyState,
  MailErrorState,
  MailNoSelectionState,
  MailSplitView,
  type MailConversationSummaryView,
  type MailConversationView,
} from './mail'
import {
  eligibleMailAgentsOptions,
  mailAgentSessionOptions,
} from '../mail.queries'
import {
  type ActiveMailInboxController,
  type MailInboxController,
  useMailInboxController,
} from '../mail-inbox-controller'

function MailDetailSurface({
  controller,
  workspaceId,
  conversationId,
  compact,
  onClose,
  agentPanel,
  onToggleAgent,
}: {
  controller: ActiveMailInboxController
  workspaceId: string
  conversationId: string
  compact: boolean
  onClose: () => void
  agentPanel: { agentId: string; open: boolean } | null
  onToggleAgent: (agentId: string) => void
}) {
  const queryClient = useQueryClient()
  const ownerUserId = useAuthStore((state) => state.user?.id ?? null)
  const [expansion, setExpansion] = useState<{
    conversationId: string
    expandedIds: ReadonlySet<string>
  } | null>(null)
  const eligibleAgentsQuery = useQuery(
    eligibleMailAgentsOptions({ workspaceId, conversationId }),
  )
  const detail = controller.detail

  if (detail.status === 'loading' || detail.status === 'idle') {
    return <MailDetailSkeleton />
  }
  if (detail.status === 'error') {
    return (
      <MailErrorState
        title="Conversation could not be loaded"
        description={detail.message}
        onRetry={detail.retry}
      />
    )
  }
  if (detail.conversation.id !== conversationId) return <MailDetailSkeleton />

  const conversation: MailConversationView = detail.conversation
  const selectedAgentId =
    agentPanel &&
    eligibleAgentsQuery.data?.some((agent) => agent.id === agentPanel.agentId)
      ? agentPanel.agentId
      : (conversation.agentAssignments[0]?.agentId ??
        eligibleAgentsQuery.data?.[0]?.id ??
        null)
  const selectedAgent = eligibleAgentsQuery.data?.find(
    (agent) => agent.id === selectedAgentId,
  )
  const agentPanelOpen =
    agentPanel?.open === true &&
    agentPanel.agentId === selectedAgent?.id &&
    selectedAgent !== undefined

  const newestMessageId = conversation.messages.at(-1)?.id
  const expandedMessageIds =
    expansion?.conversationId === conversation.id
      ? expansion.expandedIds
      : new Set(newestMessageId ? [newestMessageId] : [])

  const toggleMessage = (messageId: string) => {
    setExpansion((current) => {
      const next = new Set(
        current?.conversationId === conversation.id
          ? current.expandedIds
          : newestMessageId
            ? [newestMessageId]
            : [],
      )
      if (next.has(messageId)) next.delete(messageId)
      else next.add(messageId)
      return { conversationId: conversation.id, expandedIds: next }
    })
  }

  const inlineComposer =
    controller.composer?.replyToMessageId === undefined ? null : (
      <MailComposer variant="inline" {...controller.composer.props} />
    )

  const toolbar = (
    <MailDetailToolbar
      compact={compact}
      starred={conversation.starred}
      unread={conversation.unread}
      folders={controller.folders}
      onBack={onClose}
      onClose={onClose}
      onReplyAll={
        conversation.canSend
          ? () => controller.actions.replyAll(conversation.id)
          : undefined
      }
      onToggleStar={() => controller.actions.toggleStar(conversation.id)}
      onToggleRead={() => controller.actions.toggleRead(conversation.id)}
      onArchive={() => {
        controller.actions.archive(conversation.id)
        onClose()
      }}
      onViewSource={() => controller.actions.viewSource(conversation.id)}
      agentControl={
        <Button
          variant={agentPanelOpen ? 'secondary' : 'ghost'}
          size="icon-sm"
          disabled={!selectedAgent}
          aria-label={agentPanelOpen ? 'Close agent' : 'Open agent'}
          title={
            selectedAgent
              ? agentPanelOpen
                ? 'Close agent'
                : 'Open agent'
              : 'No mailbox agent available'
          }
          onClick={() => {
            if (!selectedAgent) return
            onToggleAgent(selectedAgent.id)
          }}
          onPointerEnter={() => {
            if (!selectedAgent) return
            void queryClient.prefetchQuery(
              mailAgentSessionOptions({
                workspaceId,
                agentId: selectedAgent.id,
                ownerUserId,
              }),
            )
          }}
          onFocus={() => {
            if (!selectedAgent) return
            void queryClient.prefetchQuery(
              mailAgentSessionOptions({
                workspaceId,
                agentId: selectedAgent.id,
                ownerUserId,
              }),
            )
          }}
        >
          <Bot />
        </Button>
      }
    />
  )

  return (
    <MailConversationDetail
      conversation={conversation}
      toolbar={toolbar}
      expandedMessageIds={expandedMessageIds}
      replyingToMessageId={controller.composer?.replyToMessageId}
      inlineComposer={inlineComposer}
      onToggleMessage={toggleMessage}
      messageActions={(message) =>
        controller.actions.messageProps(conversation.id, message)
      }
    />
  )
}

export function MailTabPanel({
  workspaceId,
  search,
  unreadOnly,
  compact,
}: {
  workspaceId: string
  search: string
  unreadOnly: boolean
  compact: boolean
}) {
  const [mailConversationId, setMailConversationId] = useState<string | null>(
    null,
  )
  const [agentPanel, setAgentPanel] = useState<{
    agentId: string
    open: boolean
  } | null>(null)
  const [listCollapsed, setListCollapsed] = useState(false)

  const controller: MailInboxController = useMailInboxController({
    workspaceId,
    selectedConversationId: mailConversationId,
    search,
    unreadOnly,
  })

  if (controller.status === 'unavailable') {
    return (
      <MailEmptyState
        title="Mail isn't available yet"
        description="This workspace does not have a connected mailbox yet."
      />
    )
  }

  const toggleAgent = (agentId: string) => {
    const opening = agentPanel?.agentId !== agentId || !agentPanel.open
    if (opening) setListCollapsed(true)
    setAgentPanel({ agentId, open: opening })
  }

  const renderMailRow = (conversation: MailConversationSummaryView) => (
    <MailConversationRow
      key={conversation.id}
      conversation={conversation}
      selected={conversation.id === mailConversationId}
      onOpen={() => setMailConversationId(conversation.id)}
      onToggleStar={() => controller.actions.toggleStar(conversation.id)}
      onToggleRead={() => controller.actions.toggleRead(conversation.id)}
      onArchive={() => {
        if (conversation.id === mailConversationId) setMailConversationId(null)
        controller.actions.archive(conversation.id)
      }}
    />
  )

  const panelComposer =
    controller.composer && controller.composer.replyToMessageId === undefined
      ? controller.composer
      : null

  const list = controller.list
  const listBody =
    list.status === 'loading' ? (
      <MailConversationList
        state="loading"
        conversations={[]}
        renderConversation={renderMailRow}
      />
    ) : list.status === 'error' ? (
      <MailConversationList
        state="error"
        conversations={[]}
        renderConversation={renderMailRow}
        error={list.message}
        onRetry={list.retry}
      />
    ) : (
      <MailConversationList
        state="ready"
        conversations={list.entries.map((entry) => entry.conversation)}
        renderConversation={renderMailRow}
        filtered={Boolean(search || unreadOnly)}
        refreshing={list.refreshing}
        loadingMore={list.loadingMore}
        hasMore={list.hasMore}
        onLoadMore={list.loadMore}
      />
    )

  const detailContent = panelComposer ? (
    <MailComposer variant="panel" {...panelComposer.props} />
  ) : mailConversationId ? (
    <MailDetailSurface
      controller={controller}
      workspaceId={workspaceId}
      conversationId={mailConversationId}
      compact={compact}
      onClose={() => setMailConversationId(null)}
      agentPanel={agentPanel}
      onToggleAgent={toggleAgent}
    />
  ) : (
    <MailNoSelectionState />
  )

  return (
    <div className="flex min-h-0 flex-1">
      <div className="min-w-0 flex-1">
        <MailSplitView
          compact={compact}
          detailOpen={panelComposer !== null || mailConversationId !== null}
          listCollapsed={listCollapsed}
          onExpandList={() => setListCollapsed(false)}
          list={<div className="flex h-full min-h-0 flex-col">{listBody}</div>}
          detail={detailContent}
        />
      </div>
      {agentPanel?.open ? (
        <MailAgentPane>
          <MailAgentConversationPanel
            workspaceId={workspaceId}
            conversationId={mailConversationId}
            agentId={agentPanel.agentId}
            onClose={() => setAgentPanel(null)}
            onOpenDraft={controller.actions.openAgentDraft}
          />
        </MailAgentPane>
      ) : null}
    </div>
  )
}
