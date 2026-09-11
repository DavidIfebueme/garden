import { createFileRoute } from '@tanstack/react-router'
import {
  BrainFolderDetailResponseSchema,
  BrainFolderResponseSchema,
  BrainFolderUpdateInputSchema,
} from '@/features/brain/contract'
import {
  brainFileSummaryOf,
  loadBrainItemsByIds,
} from '@/lib/server/brain-file-summary'
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
 * Helix item ids; members are resolved by id (loadBrainItemsByIds) rather
 * than by filtering the capped listFiles response, so folders stay correct
 * once a workspace has >100 files — stale members whose files were deleted
 * drop out silently either way.
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
    userId: workspaceContext.session.user.id,
    folderId: params.id,
  })
  if (folder === null) return notFound('Folder not found')

  const memberIds = await listBrainFolderFileIds({
    env: appContext.env,
    workspaceId: workspaceContext.workspaceId,
    folderId: params.id,
  })

  const resolved = await loadBrainItemsByIds({
    env: appContext.env as AppEnv & { HELIX_URL?: string },
    workspaceId: workspaceContext.workspaceId,
    fileIds: memberIds,
  })
  if (resolved.status === 'unconfigured') {
    return badRequest('Brain is not configured (missing HELIX_URL)')
  }
  if (resolved.status === 'unavailable') {
    return Response.json(
      { error: 'Brain files are unavailable' },
      { status: 503 },
    )
  }

  const files = resolved.items.map((item) => brainFileSummaryOf(item))

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
    userId: workspaceContext.session.user.id,
    folderId: params.id,
    name: inputResult.data.name,
    privacy: inputResult.data.privacy,
  })
  if (!updated) return notFound('Folder not found')

  const row = await getBrainFolder({
    env: appContext.env,
    workspaceId: workspaceContext.workspaceId,
    userId: workspaceContext.session.user.id,
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
    userId: workspaceContext.session.user.id,
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
