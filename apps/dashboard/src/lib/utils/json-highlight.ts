export type JsonToken = { text: string; kind: 'plain' | 'key' | 'string' | 'number' | 'boolean' | 'null' | 'punctuation' }

const TOKEN = /"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\b(?:true|false|null)\b|[{}\[\]:,]/g

export function highlightJson(source: string): JsonToken[] {
  try {
    JSON.parse(source)
  } catch {
    return [{ text: source, kind: 'plain' }]
  }

  const result: JsonToken[] = []
  let cursor = 0
  for (const match of source.matchAll(TOKEN)) {
    const start = match.index ?? 0
    if (start > cursor) result.push({ text: source.slice(cursor, start), kind: 'plain' })
    const text = match[0]
    const kind = text.startsWith('"')
      ? /^\s*:/.test(source.slice(start + text.length)) ? 'key' : 'string'
      : text === 'true' || text === 'false' ? 'boolean'
      : text === 'null' ? 'null'
      : /^-?\d/.test(text) ? 'number'
      : 'punctuation'
    result.push({ text, kind })
    cursor = start + text.length
  }
  if (cursor < source.length) result.push({ text: source.slice(cursor), kind: 'plain' })
  return result
}
