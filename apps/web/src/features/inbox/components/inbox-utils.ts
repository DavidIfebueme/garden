import type { InboxItem, InboxItemType } from '@garden/core/types'

const TEST_WORKSPACE_ID = 'inbox-ui-test-workspace'
const TEST_RECIPIENT_ID = 'inbox-ui-test-recipient'
const TEST_AGENT_ID = 'inbox-ui-test-agent'
const TEST_MEMBER_ID = 'inbox-ui-test-member'

type InboxFixtureSeed = Pick<
  InboxItem,
  'workspace_id' | 'recipient_type' | 'recipient_id'
>

const inboxFixtureTemplates = [
  {
    type: 'review_requested',
    severity: 'action_required',
    title: 'Approve staging deployment',
    body: 'The agent prepared a deployment plan and needs approval before touching staging.',
    issue_status: 'in_review',
    read: false,
    actor_type: 'agent',
    actor_id: TEST_AGENT_ID,
    details: {
      issue_number: '128',
      kind: 'agent_proposal',
      request_id: 'approval-staging-deploy',
      approval_id: 'approval-staging-deploy',
      run_id: 'run-staging-deploy',
    },
  },
  {
    type: 'waiting_for_input',
    severity: 'action_required',
    title: 'Choose sync behavior for archived items',
    body: 'Should archived inbox items stay searchable after a workspace import?',
    issue_status: 'blocked',
    read: false,
    actor_type: 'agent',
    actor_id: TEST_AGENT_ID,
    details: {
      issue_number: '131',
      run_id: 'run-archive-sync-question',
    },
  },
  {
    type: 'new_comment',
    severity: 'attention',
    title: 'Inbox list spacing pass',
    body: 'Can we tighten the timestamp and actor row without losing the unread signal?',
    issue_status: 'in_progress',
    read: false,
    actor_type: 'member',
    actor_id: TEST_MEMBER_ID,
    details: {
      issue_number: '134',
      comment_id: 'comment-inbox-spacing',
    },
  },
  {
    type: 'mentioned',
    severity: 'attention',
    title: 'Connector OAuth copy',
    body: '@you please sanity-check the short copy before we wire it into the modal.',
    issue_status: 'todo',
    read: true,
    actor_type: 'member',
    actor_id: TEST_MEMBER_ID,
    details: {
      issue_number: '139',
      comment_id: 'comment-oauth-copy',
    },
  },
  {
    type: 'wp_review',
    severity: 'action_required',
    title: 'Weekly automation report ready',
    body: 'Draft report is ready with failed-run clustering, owner notes, and next suggested actions.',
    issue_status: 'in_review',
    read: false,
    actor_type: 'agent',
    actor_id: TEST_AGENT_ID,
    details: {
      issue_number: '142',
      work_product_id: 'wp-weekly-automation-report',
      work_product_type: 'report',
    },
  },
  {
    type: 'task_failed',
    severity: 'attention',
    title: 'Calendar import failed',
    body: 'Google Calendar returned an expired-token error while refreshing events.',
    issue_status: 'blocked',
    read: true,
    actor_type: 'agent',
    actor_id: TEST_AGENT_ID,
    details: {
      issue_number: '146',
      run_id: 'run-calendar-import',
    },
  },
  {
    type: 'task_completed',
    severity: 'info',
    title: 'Design audit finished',
    body: 'The agent finished the inbox detail audit and attached notes to the issue.',
    issue_status: 'done',
    read: true,
    actor_type: 'agent',
    actor_id: TEST_AGENT_ID,
    details: {
      issue_number: '151',
      run_id: 'run-design-audit',
    },
  },
  {
    type: 'priority_changed',
    severity: 'info',
    title: 'Webhook delivery backlog',
    body: null,
    issue_status: 'todo',
    read: true,
    actor_type: 'member',
    actor_id: TEST_MEMBER_ID,
    details: {
      issue_number: '155',
      from: 'medium',
      to: 'high',
    },
  },
] as const

export function generateInboxTestItems(items: InboxItem[] = []): InboxItem[] {
  const seed = items[0] satisfies InboxFixtureSeed | undefined
  const workspaceId = seed?.workspace_id ?? TEST_WORKSPACE_ID
  const recipientType = seed?.recipient_type ?? 'member'
  const recipientId = seed?.recipient_id ?? TEST_RECIPIENT_ID
  const now = Date.now()

  return inboxFixtureTemplates.map((template, index): InboxItem => {
    const issueId = `inbox-ui-test-issue-${index + 1}`

    return {
      id: `inbox-ui-test-${template.type}-${index + 1}`,
      workspace_id: workspaceId,
      recipient_type: recipientType,
      recipient_id: recipientId,
      actor_type: template.actor_type,
      actor_id: template.actor_id,
      type: template.type as InboxItemType,
      severity: template.severity,
      issue_id: issueId,
      title: template.title,
      body: template.body,
      issue_status: template.issue_status,
      read: template.read,
      archived: false,
      created_at: new Date(now - index * 47 * 60 * 1000).toISOString(),
      details: template.details,
    }
  })
}
