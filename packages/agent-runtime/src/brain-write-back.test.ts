import { describe, expect, it, vi } from 'vitest'
import { createBrainWriteBackTools } from './brain-write-back'

const mockGetPooledDb = vi.hoisted(() => vi.fn())

vi.mock('@garden/db/runtime', () => ({ getPooledDb: mockGetPooledDb }))

const execute = async (
  tool: { execute?: (input: never, options: never) => unknown } | undefined,
  input: unknown,
) =>
  (await tool?.execute?.(
    input as never,
    {
      toolCallId: 'call-1',
      messages: [],
    } as never,
  )) as Record<string, unknown>

describe('createBrainWriteBackTools user scope without user context', () => {
  it('skips a user-scoped candidate with no userId and writes nothing', async () => {
    const values = vi.fn().mockResolvedValue([])
    const insert = vi.fn().mockReturnValue({ values })
    mockGetPooledDb.mockReturnValue({ insert })
    const tools = createBrainWriteBackTools({
      env: {},
      ai: { run: async () => ({ data: [] }) },
      files: { get: async () => null },
      databaseUrl: 'postgres://test:test@localhost:5432/test',
      getContext: () => ({
        workspaceId: 'workspace-1',
        agentId: 'agent-1',
        runId: 'run-1',
      }),
    })

    const result = await execute(tools.propose_brain_item, {
      claim: 'Alice prefers short replies.',
      kind: 'preference',
      confidence: 0.9,
      sensitive: false,
      scope: 'user',
    })

    expect(result).toMatchObject({ ok: true, action: 'skipped' })
    expect(mockGetPooledDb).not.toHaveBeenCalled()
    expect(insert).not.toHaveBeenCalled()
    expect(values).not.toHaveBeenCalled()
  })
})
