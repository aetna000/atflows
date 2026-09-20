import { describe, expect, it } from 'vitest'
import { highlightJson } from './json-highlight'

describe('JSON highlighting', () => {
  it('keeps the exact JSON text and distinguishes keys from value types', () => {
    const source = JSON.stringify({ trace: { id: '6d1c', model: null, total_tokens: 0, ok: true, quote: 'say "hi"' } }, null, 2)
    const tokens = highlightJson(source)
    expect(tokens.map((token) => token.text).join('')).toBe(source)
    expect(tokens).toContainEqual({ text: '"trace"', kind: 'key' })
    expect(tokens).toContainEqual({ text: '"6d1c"', kind: 'string' })
    expect(tokens).toContainEqual({ text: '0', kind: 'number' })
    expect(tokens).toContainEqual({ text: 'true', kind: 'boolean' })
    expect(tokens).toContainEqual({ text: 'null', kind: 'null' })
  })

  it('leaves non-JSON span text unchanged', () => {
    expect(highlightJson('plain text')).toEqual([{ text: 'plain text', kind: 'plain' }])
  })
})
