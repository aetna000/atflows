function validDate(timestamp: number | string): Date | null {
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? null : date
}

const two = (value: number) => String(value).padStart(2, '0')
const three = (value: number) => String(value).padStart(3, '0')

export function formatLocalIso(timestamp: number | string): string {
  const date = validDate(timestamp)
  if (!date) return '—'
  const offsetMinutes = -date.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const offset = `${sign}${two(Math.floor(Math.abs(offsetMinutes) / 60))}:${two(Math.abs(offsetMinutes) % 60)}`
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}T${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}.${three(date.getMilliseconds())}${offset}`
}

export function formatUtcIso(timestamp: number | string): string {
  return validDate(timestamp)?.toISOString() ?? '—'
}

export function formatTime(timestamp: number | string): string {
  return formatLocalIso(timestamp)
}

export function formatNumber(num: number | null | undefined): string {
  if (num == null) return '-'
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
  return num.toString()
}

export function formatCost(cost: number | null | undefined): string {
  if (cost == null) return '-'
  if (cost === 0) return '$0.00'
  if (cost < 0.01) return '<$0.01'
  return '$' + cost.toFixed(2)
}

export function formatLatency(ms: number | null | undefined): string {
  if (ms == null) return '-'
  if (ms < 1000) return Math.round(ms) + 'ms'
  return (ms / 1000).toFixed(1) + 's'
}

/** Human label for a recorded runtime while preserving its exact filter key. */
export function formatAgentSource(source: string | null | undefined): string {
  if (!source) return 'Unknown agent or service'
  if (source.startsWith('hermes-native:')) return 'Hermes · local agent'
  if (source === 'openclaw-gateway') return 'OpenClaw · gateway'
  if (source === 'codex_cli_rs' || source === 'codex-cli') return 'Codex · CLI'
  return source
}

export function escapeHtml(str: string): string {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}
