import { Result, TaggedError, type Result as ResultValue } from 'better-result'
import { schema, type Db } from './db'

export class PermissionActivityError extends TaggedError(
  'PermissionActivityError',
)<{
  status: number
  message: string
  cause?: unknown
}>() {}

export type GrantActivityAction = 'set' | 'deleted'

export type RecordGrantActivityInput = {
  db: Db
  workspaceId: string
  actorUserId: string
  agentId: string
  scope: 'tool' | 'connection'
  connectorId: string
  toolName?: string
  trustLevel?: string | null
  action: GrantActivityAction
}

/**
 * Stores one activity_event row per grant change, so the agent activity feed
 * can show who granted what without joining grant tables. Grant routes own
 * the write; failures surface as 500s so a silent grant never looks clean.
 */
export async function recordGrantActivity(
  input: RecordGrantActivityInput,
): Promise<ResultValue<void, PermissionActivityError>> {
  return Result.tryPromise({
    try: async () => {
      await input.db.insert(schema.activityEvent).values({
        id: crypto.randomUUID(),
        workspaceId: input.workspaceId,
        subjectType: 'agent',
        subjectId: input.agentId,
        actorType: 'user',
        actorId: input.actorUserId,
        eventType: `permission.grant.${input.action}`,
        payload: {
          scope: input.scope,
          connector_id: input.connectorId,
          ...(input.toolName ? { tool_name: input.toolName } : {}),
          ...(input.trustLevel ? { trust: input.trustLevel } : {}),
        },
      })
    },
    catch: (cause) =>
      new PermissionActivityError({
        status: 500,
        message: 'Failed to record permission grant activity',
        cause,
      }),
  })
}
