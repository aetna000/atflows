import type { TimelineItem } from '../stores/timeline.svelte'

export type EventGrouping = 'tool' | 'service_name' | 'model' | 'type' | 'hour' | 'session_id'

export function eventGroup(item: TimelineItem, by: EventGrouping): string {
  if (by === 'hour') {
    return Number.isFinite(item.timestamp)
      ? new Date(Math.floor(item.timestamp / 3600000) * 3600000).toISOString()
      : 'Not recorded'
  }
  return item[by]?.trim() || 'Not recorded'
}

export function groupEvents(items: TimelineItem[], by: EventGrouping) {
  const counts = new Map<string, number>()
  for (const item of items) {
    const key = eventGroup(item, by)
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return [...counts].map(([key, count]) => ({ key, count }))
    .sort((a, b) => by === 'hour' ? a.key.localeCompare(b.key) : b.count - a.count || a.key.localeCompare(b.key))
}
