import { DateTime } from 'effect'
import { inArray } from 'drizzle-orm'
import type { BrainItem } from '@garden/brain/domain'
import type { BrainFileSummary } from '@/features/brain/contract'
import { brainFileStatusOf } from '@/features/brain/contract'
import { getDb, schema } from '@/lib/server/db'
import type { AppEnv } from '@/lib/server/env'

/**
 * Maps a Helix brain item to the public file summary. Upload time comes from
 * `origin.at` (set at staging); the uploader's display name comes from the
 * human actor's user id, resolved by `loadBrainFileOwnerNames`.
 */
export function brainFileSummaryOf(
  item: BrainItem,
  ownerNames?: ReadonlyMap<string, string>,
): BrainFileSummary {
  const uploadedAt = DateTime.toDate(item.origin.at).toISOString()
  const actor = item.origin.actor
  const createdByName =
    actor._tag === 'Human' ? ownerNames?.get(actor.userId) : undefined

  return {
    id: item.id,
    name: item.label,
    status: brainFileStatusOf(item),
    uploadedAt,
    ...(item.sizeBytes !== undefined ? { sizeBytes: item.sizeBytes } : {}),
    ...(createdByName ? { createdByName } : {}),
  }
}

/**
 * Batch-resolves display names ("Made by …") for the human actors behind a
 * set of brain items. Profiles without a name fall back to their email.
 */
export async function loadBrainFileOwnerNames(args: {
  env: Pick<AppEnv, 'HYPERDRIVE'>
  items: readonly BrainItem[]
}): Promise<Map<string, string>> {
  const userIds = [
    ...new Set(
      args.items.flatMap((item) =>
        item.origin.actor._tag === 'Human' ? [item.origin.actor.userId] : [],
      ),
    ),
  ]
  if (userIds.length === 0) return new Map()

  const db = await getDb(args.env)
  const rows = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
    })
    .from(schema.user)
    .where(inArray(schema.user.id, userIds))

  return new Map(
    rows.map((row) => [row.id, row.name.trim() || row.email] as const),
  )
}
