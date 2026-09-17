import {
  CONNECT_APPS_STUB,
  DEFAULT_TOOL_PRESET_ID,
  FOLDER_STUB,
  SUGGESTION_PILLS,
  TOOL_PRESET_IDS_WITH_SOURCES,
  TOOL_PRESETS,
  TOOL_SOURCE_STUB,
} from './composer-tools'

describe('composer-tools config', () => {
  it('lists the 6 tool presets in menu order, "default" first', () => {
    expect(TOOL_PRESETS.map((p) => p.id)).toEqual([
      'default',
      'qa-agent',
      'eng-issue-triage',
      'org-brain',
      'research-synthesis',
      'document-review',
    ])
    expect(DEFAULT_TOOL_PRESET_ID).toBe('default')
  })

  it('gives every preset an icon and an accent class', () => {
    for (const preset of TOOL_PRESETS) {
      expect(preset.icon).toBeTruthy()
      expect(preset.iconClassName.trim().length).toBeGreaterThan(0)
    }
  })

  it('marks only the document-backed presets as having sources', () => {
    expect([...TOOL_PRESET_IDS_WITH_SOURCES].sort()).toEqual([
      'document-review',
      'org-brain',
      'research-synthesis',
    ])
    // Every id in the set must be a real preset, or the menu would silently
    // never show the panel for it.
    const presetIds = new Set(TOOL_PRESETS.map((p) => p.id))
    for (const id of TOOL_PRESET_IDS_WITH_SOURCES) {
      expect(presetIds.has(id)).toBe(true)
    }
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

  it('tool source stub adds Google Drive to the connect apps', () => {
    expect(TOOL_SOURCE_STUB.map((a) => a.id)).toEqual([
      'notion',
      'slack',
      'gmail',
      'github',
      'google-drive',
    ])
    for (const source of TOOL_SOURCE_STUB) {
      expect(source.icon).toBeTruthy()
    }
  })
})
