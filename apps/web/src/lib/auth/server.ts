import { createBetterAuth } from './instance'
import type { AppEnv } from '@/lib/server/env'
import { getDb } from '@/lib/server/db'

type AuthEnv = Pick<
  AppEnv,
  | 'HYPERDRIVE'
  | 'BETTER_AUTH_SECRET'
  | 'BETTER_AUTH_URL'
  | 'GOOGLE_AUTH_CLIENT_ID'
  | 'GOOGLE_AUTH_CLIENT_SECRET'
  | 'RESEND_API_KEY'
>

/** Builds Better Auth with the request-scoped Garden database client. */
export async function createAuth(env: AuthEnv, request?: Request) {
  return createBetterAuth(await getDb(env), {
    ...env,
    request,
  })
}
