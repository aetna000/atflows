import { describe, expect, it } from 'vitest'
import { formatLocalIso, formatUtcIso, formatTime } from './format'

describe('event timestamps', () => {
  it('keeps millisecond precision and a local ISO offset in the dashboard', () => {
    const timestamp = Date.UTC(2026, 8, 20, 9, 12, 8, 417)
    const local = formatLocalIso(timestamp)
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.417[+-]\d{2}:\d{2}$/)
    expect(Date.parse(local)).toBe(timestamp)
    expect(formatTime(timestamp)).toBe(local)
    expect(formatUtcIso(timestamp)).toBe('2026-09-20T09:12:08.417Z')
  })

  it('does not invent a timestamp for invalid input', () => {
    expect(formatLocalIso('bad time')).toBe('—')
    expect(formatUtcIso('bad time')).toBe('—')
  })
})
