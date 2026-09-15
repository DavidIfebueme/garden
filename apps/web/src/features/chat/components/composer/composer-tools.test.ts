import {
  CONNECT_APPS_STUB,
  DEFAULT_TOOL_PRESET_ID,
  FOLDER_STUB,
  SUGGESTION_PILLS,
  TOOL_PRESETS,
} from './composer-tools'

describe('composer-tools config', () => {
  it('has 6 tool presets including "default"', () => {
    expect(TOOL_PRESETS).toHaveLength(6)
    expect(TOOL_PRESETS.map((p) => p.id)).toContain('default')
    expect(DEFAULT_TOOL_PRESET_ID).toBe('default')
  })

  it('tool preset ids are unique', () => {
    const ids = TOOL_PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has 7 suggestion pills, each with a non-empty starter', () => {
    expect(SUGGESTION_PILLS).toHaveLength(7)
    for (const pill of SUGGESTION_PILLS) {
      expect(pill.starter.trim().length).toBeGreaterThan(0)
    }
  })

  it('suggestion pill ids are unique', () => {
    const ids = SUGGESTION_PILLS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('folder stub is a non-empty list', () => {
    expect(FOLDER_STUB.length).toBeGreaterThan(0)
  })

  it('connect apps stub has Notion, Slack, Gmail, and GitHub', () => {
    expect(CONNECT_APPS_STUB).toHaveLength(4)
    expect(CONNECT_APPS_STUB.map((a) => a.id)).toEqual([
      'notion',
      'slack',
      'gmail',
      'github',
    ])
  })
})
