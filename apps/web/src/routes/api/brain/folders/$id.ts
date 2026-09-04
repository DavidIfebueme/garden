import { Effect, Result as EffectResult } from 'effect'
import { createFileRoute } from '@tanstack/react-router'
import { WorkspaceId } from '@garden/brain/domain'
import { Brain } from '@garden/brain/services/brain'
import { makeWebBrainLive } from '@garden/brain/services/web'
import {
  BrainFolderDetailResponseSchema,
  BrainFolderResponseSchema,
  BrainFolderUpdateInputSchema,
} from '@/features/brain/contract'
import { brainFileSummaryOf } from '@/lib/server/brain-file-summary'
import {
  requireAppRequestContext,
  type AppRequestContext,
} from '@/lib/server/context'
import {
  badRequest,
  notFound,
  requireWorkspaceContext,
} from '@/lib/server/control-plane'
import type { AppEnv } from '@/lib/server/env'
import {
  brainFolderSummaryOf,
  deleteBrainFolder,
  getBrainFolder,
  listBrainFolderFileIds,
  updateBrainFolder,
} from '@/lib/server/brain-folders'

/**
 * Folder detail for the Files & Folders folder view: Garden-owned folder row
 * plus its member files resolved through Brain (Helix). Membership stores
 * Helix item ids, so files are validated against the workspace's real Brain
 * file list — stale members whose files were deleted drop out silently.
 */
export const getBrainFolderDetail = async ({
  context,
  params,
}: {
  context: AppRequestContext
  params: { id: string }
}): Promise<Response> => {
  const appContext = requireAppRequestContext(context)
  const workspaceContext = await requireWorkspaceContext(appContext)
  if (workspaceContext instanceof Response) return workspaceContext

  const folder = await getBrainFolder({
    env: appContext.env,
    workspaceId: workspaceContext.workspaceId,
    folderId: params.id,
  })
  if (folder === null) return notFound('Folder not found')

  const memberIds = await listBrainFolderFileIds({
    env: appContext.env,
    workspaceId: workspaceContext.workspaceId,
    folderId: params.id,
  })

  const env = appContext.env as AppEnv & {
    HELIX_URL?: string
    HELIX_API_KEY?: string
  }
  const helixUrl = env.HELIX_URL
  if (helixUrl === undefined) {
    return badRequest('Brain is not configured (missing HELIX_URL)')
  }

  const brainLive = makeWebBrainLive({
    baseUrl: helixUrl,
    apiKey: env.HELIX_API_KEY,
    ai: env.AI,
    files: env.BRAIN_FILES,
  })
  const listResult = await Effect.runPromise(
    Effect.result(
      Effect.flatMap(Brain, (brain) =>
        brain.listFiles({
          tenantId: WorkspaceId.make(workspaceContext.workspaceId),
        }),
      ).pipe(Effect.provide(brainLive)),
    ),
  )
  if (EffectResult.isFailure(listResult)) {
    return Response.json(
      { error: 'Brain files are unavailable' },
      { status: 503 },
    )
  }

  const memberIdSet = new Set(memberIds)
  const files = listResult.success
    .filter((item) => memberIdSet.has(item.id))
    .map((item) => brainFileSummaryOf(item))

  const body = BrainFolderDetailResponseSchema.parse({
    item: brainFolderSummaryOf({ ...folder, fileCount: files.length }),
    files,
  })

  return Response.json(body, {
    headers: { 'Cache-Control': 'no-store' },
  })
}

/** Applies rename/privacy updates from the folder card menu. */
export const patchBrainFolder = async ({
  context,
  params,
  request,
}: {
  context: AppRequestContext
  params: { id: string }
  request: Request
}): Promise<Response> => {
  const appContext = requireAppRequestContext(context)
  const workspaceContext = await requireWorkspaceContext(appContext)
  if (workspaceContext instanceof Response) return workspaceContext

  const inputResult = BrainFolderUpdateInputSchema.safeParse(
    await request.json(),
  )
  if (!inputResult.success) {
    return badRequest(
      inputResult.error.issues[0]?.message ?? 'Invalid folder input',
    )
  }

  const updated = await updateBrainFolder({
    env: appContext.env,
    workspaceId: workspaceContext.workspaceId,
    folderId: params.id,
    name: inputResult.data.name,
    privacy: inputResult.data.privacy,
  })
  if (!updated) return notFound('Folder not found')

  const row = await getBrainFolder({
    env: appContext.env,
    workspaceId: workspaceContext.workspaceId,
    folderId: params.id,
  })
  if (row === null) return notFound('Folder not found')

  const body = BrainFolderResponseSchema.parse({
    item: brainFolderSummaryOf(row),
  })

  return Response.json(body)
}

/** Deletes a folder; member files themselves stay in the knowledge base. */
export const deleteBrainFolderHandler = async ({
  context,
  params,
}: {
  context: AppRequestContext
  params: { id: string }
}): Promise<Response> => {
  const appContext = requireAppRequestContext(context)
  const workspaceContext = await requireWorkspaceContext(appContext)
  if (workspaceContext instanceof Response) return workspaceContext

  const deleted = await deleteBrainFolder({
    env: appContext.env,
    workspaceId: workspaceContext.workspaceId,
    folderId: params.id,
  })
  if (!deleted) return notFound('Folder not found')

  return new Response(null, { status: 204 })
}

export const Route = createFileRoute('/api/brain/folders/$id')({
  server: {
    handlers: {
      GET: getBrainFolderDetail,
      PATCH: patchBrainFolder,
      DELETE: deleteBrainFolderHandler,
    },
  },
})
