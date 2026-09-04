import { describe, expect, it } from 'vitest'
import { formatFileSize, truncateMiddle } from './format'

describe('truncateMiddle', () => {
  it('returns short names unchanged', () => {
    expect(truncateMiddle('notes.txt')).toBe('notes.txt')
  })

  it('middle-ellipsizes long names, keeping the extension visible', () => {
    const long = `${'quarterly-'.repeat(8)}final.pdf`
    const result = truncateMiddle(long, 40)

    expect(result.length).toBe(40)
    expect(result).toContain('…')
    expect(result.endsWith('final.pdf')).toBe(true)
  })

  it('respects custom limits', () => {
    expect(truncateMiddle('abcdefghij.txt', 10)).toBe('abcde….txt')
  })
})

describe('formatFileSize', () => {
  it('formats bytes, KB, and MB', () => {
    expect(formatFileSize(undefined)).toBe('—')
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(11_264)).toBe('11 KB')
    expect(formatFileSize(1536)).toBe('1.5 KB')
    expect(formatFileSize(5_242_880)).toBe('5 MB')
  })
})
