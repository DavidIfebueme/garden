import { Pool } from 'pg'

export async function isTestDbReachable(
  connectionString: string,
  timeoutMillis = 2000,
): Promise<boolean> {
  const pool = new Pool({ connectionString, connectionTimeoutMillis: timeoutMillis })
  try {
    await pool.query('SELECT 1')
    return true
  } catch {
    return false
  } finally {
    await pool.end().catch(() => undefined)
  }
}
