import { describe, expect, it } from 'vitest'
import { mirrorRowValues } from './connection-mirror'

describe('mirrorRowValues', () => {
  it('builds an isolated mirror row for a mapped connector', () => {
    const now = new Date('2026-09-10T00:00:00Z')
    expect(
      mirrorRowValues(
        {
          executorSlug: 'google_gmail',
          userId: 'user-1',
          workspaceId: 'workspace-1',
          identityLabel: 'david@klawva.xyz',
          scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
          expiresAtMs: 1789001455000,
        },
        'gmail',
        now,
      ),
    ).toEqual({
      userId: 'user-1',
      accountId: 'david@klawva.xyz',
      providerId: 'executor:google_gmail',
      workspaceId: 'workspace-1',
      status: 'connected',
      scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
      accessTokenExpiresAt: new Date(1789001455000),
      connectorType: 'gmail',
      createdAt: now,
      updatedAt: now,
    })
  })

  it('falls back to the slug and empty scopes', () => {
    const now = new Date('2026-09-10T00:00:00Z')
    const row = mirrorRowValues(
      {
        executorSlug: 'google_drive',
        userId: 'user-1',
        workspaceId: 'workspace-1',
      },
      'google-drive',
      now,
    )
    expect(row.accountId).toBe('google_drive')
    expect(row.scopes).toEqual([])
    expect(row.accessTokenExpiresAt).toBeNull()
  })
})
