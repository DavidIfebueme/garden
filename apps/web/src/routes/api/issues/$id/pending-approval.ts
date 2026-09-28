import { createFileRoute } from '@tanstack/react-router'
import { and, desc, eq } from 'drizzle-orm'
import { requireAppRequestContext } from '@/lib/server/context'
import type { AppRequestContext } from '@/lib/server/context'
import { json, requireWorkspaceContext } from '@/lib/server/control-plane'
import { schema } from '@/lib/server/db'

export const getIssuePendingApproval = async ({
  context,
  params,
}: {
  context: AppRequestContext
  params: { id: string }
}): Promise<Response> => {
  const appContext = requireAppRequestContext(context)
  const workspaceContext = await requireWorkspaceContext(appContext)
  if (workspaceContext instanceof Response) return workspaceContext

  const db = await appContext.db()
  const [issue] = await db
    .select({ activeRunId: schema.issue.activeRunId })
    .from(schema.issue)
    .where(
      and(
        eq(schema.issue.id, params.id),
        eq(schema.issue.workspaceId, workspaceContext.workspaceId),
      ),
    )
    .limit(1)

  const activeRunId = issue?.activeRunId
  if (activeRunId === null || activeRunId === undefined) {
    return json({ approval: null })
  }

  const [request] = await db
    .select({
      id: schema.permissionRequest.id,
      context: schema.permissionRequest.context,
    })
    .from(schema.permissionRequest)
    .where(
      and(
        eq(schema.permissionRequest.runId, activeRunId),
        eq(schema.permissionRequest.status, 'pending'),
      ),
    )
    .orderBy(desc(schema.permissionRequest.requestedAt))
    .limit(1)

  if (request === undefined) {
    return json({ approval: null })
  }

  return json({
    approval: {
      request_id: request.id,
      title: request.context ?? 'Approval needed',
      body: '',
    },
  })
}

export const Route = createFileRoute('/api/issues/$id/pending-approval')({
  server: {
    handlers: {
      GET: getIssuePendingApproval,
    },
  },
})
