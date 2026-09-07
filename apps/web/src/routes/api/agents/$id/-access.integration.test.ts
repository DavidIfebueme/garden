import type { AppRequestContext } from '@/lib/server/context'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route } from './access'

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  resolveWorkspaceId: vi.fn(),
}))

vi.mock('@/lib/server/control-plane', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/server/control-plane')>()
  return {
    ...actual,
    requireSession: mocks.requireSession,
    resolveWorkspaceId: mocks.resolveWorkspaceId,
  }
})

function getGetHandler() {
  const handlers = Route.options.server?.handlers

  if (!handlers || typeof handlers === 'function') {
    throw new Error('Expected agent access route handlers')
  }

  const getHandler = handlers.GET

  if (typeof getHandler !== 'function') {
    throw new Error('Expected agent access GET handler')
  }

  return getHandler
}

function chainable(rows: unknown[]) {
  const arr = [...rows]
  return Object.assign(arr, {
    where: vi.fn(() => chainable(rows)),
    limit: vi.fn(() => Promise.resolve(rows)),
  })
}

describe('agent access route', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.requireSession.mockResolvedValue({
      user: { id: 'member-id' },
    })
    mocks.resolveWorkspaceId.mockResolvedValue('workspace-id')
  })

  it('rejects unauthenticated callers', async () => {
    mocks.requireSession.mockResolvedValueOnce(null)

    const response = await getGetHandler()({
      context: {} as AppRequestContext,
      request: new Request('https://garden.test/api/agents/agent-id/access'),
      params: { id: 'agent-id' },
      pathname: '/api/agents/$id/access',
      next: () => ({ isNext: true, context: undefined }),
    })

    expect(response).toBeInstanceOf(Response)
    expect(response?.status).toBe(401)
  })

  it('resolves effective trust as tool grant, connection grant, risk default', async () => {
    const queued: unknown[][] = [
      [{ id: 'agent-id' }],
      [
        {
          id: 'capability-id',
          connectorType: 'github',
          name: 'add_issue_comment',
          riskClass: 'write',
        },
      ],
      [],
      [],
    ]
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => chainable((queued.shift() ?? []) as unknown[])),
      })),
    }

    const response = await getGetHandler()({
      context: {
        db: async () => db,
      } as unknown as AppRequestContext,
      request: new Request('https://garden.test/api/agents/agent-id/access'),
      params: { id: 'agent-id' },
      pathname: '/api/agents/$id/access',
      next: () => ({ isNext: true, context: undefined }),
    })

    expect(response).toBeInstanceOf(Response)
    expect(response?.status).toBe(200)
    await expect(response?.json()).resolves.toEqual({
      connections: [],
      tools: [
        {
          connector_id: 'github',
          tool_name: 'add_issue_comment',
          risk_class: 'write',
          trust: 'allow',
          granted: false,
        },
      ],
    })
  })
})
