import { Effect, Result as EffectResult } from 'effect'
import { createFileRoute } from '@tanstack/react-router'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { Kind, WorkspaceId } from '@garden/brain/domain'
import { Brain } from '@garden/brain/services/brain'
import { makeWebBrainLive } from '@garden/brain/services/web'
import { archiveInboxItemsByKey } from '@garden/db/inbox'
import { requireAppRequestContext } from '@/lib/server/context'
import type { AppRequestContext } from '@/lib/server/context'
import { json, requireWorkspaceContext } from '@/lib/server/control-plane'
import { schema, type Db } from '@/lib/server/db'
import { appEnv } from '@/lib/server/env'
import type { AppEnv } from '@/lib/server/env'
import { parseJsonBody } from '@/lib/server/validation/common'

const resolveBodySchema = z
  .object({ action: z.enum(['approve', 'reject']) })
  .strict()

const archiveForUser = async (args: {
  db: Db
  workspaceId: string
  proposalId: string
}) => {
  await archiveInboxItemsByKey({
    db: args.db,
    workspaceId: args.workspaceId,
    itemKeys: [`brain_proposal:${args.proposalId}`],
  })
}

export const resolveBrainProposal = async ({
  context,
  request,
  params,
}: {
  context: AppRequestContext
  request: Request
  params: { id: string }
}): Promise<Response> => {
  const appContext = requireAppRequestContext(context)
  const workspaceContext = await requireWorkspaceContext(appContext)
  if (workspaceContext instanceof Response) return workspaceContext

  const bodyResult = await parseJsonBody(
    request,
    resolveBodySchema,
    'Invalid proposal action',
  )
  if (bodyResult.isErr()) {
    return json({ error: bodyResult.error.message }, 400)
  }

  const db = await appContext.db()
  const [row] = await db
    .select()
    .from(schema.brainWriteProposal)
    .where(
      and(
        eq(schema.brainWriteProposal.id, params.id),
        eq(schema.brainWriteProposal.workspaceId, workspaceContext.workspaceId),
      ),
    )
    .limit(1)

  if (row === undefined) {
    return json({ error: 'Proposal not found' }, 404)
  }

  if (row.status !== 'pending') {
    await archiveForUser({
      db,
      workspaceId: workspaceContext.workspaceId,
      proposalId: row.id,
    })
    return json({ ok: true, status: row.status })
  }

  if (
    row.scope.kind === 'user' &&
    row.scope.userId !== workspaceContext.session.user.id
  ) {
    return json({ error: 'Proposal not found' }, 404)
  }

  if (bodyResult.value.action === 'approve') {
    const env = appEnv as AppEnv & {
      HELIX_URL?: string
      HELIX_API_KEY?: string
    }
    if (env.HELIX_URL === undefined) {
      return json({ error: 'Brain is not configured' }, 503)
    }
    const layer = makeWebBrainLive({
      baseUrl: env.HELIX_URL,
      apiKey: env.HELIX_API_KEY,
      ai: env.AI,
      files: env.BRAIN_FILES,
    })
    const writeResult = await Effect.runPromise(
      Effect.result(
        Effect.flatMap(Brain, (brain) =>
          brain.addText({
            tenantId: WorkspaceId.make(workspaceContext.workspaceId),
            label: row.claim.slice(0, 80),
            body: row.claim,
            kind: Kind.make(row.kind),
            scope: row.scope,
            actor: {
              _tag: 'Agent',
              agentId: 'brain-write-back',
              runId: row.runId,
            },
          }),
        ).pipe(Effect.provide(layer)),
      ),
    )
    if (EffectResult.isFailure(writeResult)) {
      return json({ error: 'Could not write to the brain' }, 502)
    }
  }

  const status = bodyResult.value.action === 'approve' ? 'approved' : 'rejected'
  await db
    .update(schema.brainWriteProposal)
    .set({
      status,
      decidedBy: workspaceContext.session.user.id,
      decidedAt: new Date(),
    })
    .where(eq(schema.brainWriteProposal.id, row.id))
  await archiveForUser({
    db,
    workspaceId: workspaceContext.workspaceId,
    proposalId: row.id,
  })

  return json({ ok: true, status })
}

export const Route = createFileRoute('/api/brain/proposals/$id/resolve')({
  server: {
    handlers: {
      POST: resolveBrainProposal,
    },
  },
})
