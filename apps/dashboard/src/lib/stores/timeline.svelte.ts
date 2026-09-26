import { api } from '$lib/api/client'
import { onMessage } from './websocket.svelte'
import { tabState } from './tabs.svelte'

export interface TimelineItem {
  id: string
  type: 'trace' | 'log' | 'metric' | 'hermes'
  timestamp: number
  title: string
  subtitle?: string
  model?: string
  service_name?: string
  session_id?: string
  tool?: string
  status?: string
  duration_ms?: number
  tokens?: number
  cost?: number
  severity_text?: string
  metric_type?: string
  value?: number
  data?: unknown
}

export interface TimelineFilters {
  q: string
  tool: string
  type: string
  dateRange: string
  date_from: number | null
}

export const timelineServices = $state<string[]>([])
export const timelineStatus = $state({ itemsError: '', servicesError: '', servicesTruncated: false })
let loadSequence = 0

function updateServices(services: string[]) {
  const selected = timelineFilters.tool
  const values = [...new Set([...services, ...(selected ? [selected] : [])])].sort()
  timelineServices.splice(0, timelineServices.length, ...values)
}

export const timelineItems = $state<TimelineItem[]>([])
export const selectedItem = $state<{ value: TimelineItem | null }>({ value: null })
export const selectedItemData = $state<{ value: unknown }>({ value: null })
export const relatedLogs = $state<unknown[]>([])
export const timelineFilters = $state<TimelineFilters>({
  q: '',
  tool: '',
  type: '',
  dateRange: '',
  date_from: null,
})

function getDateRange(range: string): number | null {
  if (!range) return null
  const now = Date.now()
  const hour = 60 * 60 * 1000
  const day = 24 * hour

  switch (range) {
    case '1h':
      return now - hour
    case '24h':
      return now - day
    case '7d':
      return now - 7 * day
    default:
      return null
  }
}

export async function loadTimeline() {
  if (tabState.current !== 'timeline') return
  const sequence = ++loadSequence
  const current = () => sequence === loadSequence && tabState.current === 'timeline'
  let resultServices: string[] = []
  let discoveredServices: string[] | null = null
  const params = new URLSearchParams({ limit: '100' })
  if (timelineFilters.q) params.set('q', timelineFilters.q)
  if (timelineFilters.tool) params.set('tool', timelineFilters.tool)
  if (timelineFilters.type) params.set('type', timelineFilters.type)

  const from = getDateRange(timelineFilters.dateRange)
  if (from) params.set('date_from', String(from))

  await Promise.all([
    api.get<TimelineItem[]>(`/api/timeline?${params}`).then(data => {
      if (!current()) return
      timelineStatus.itemsError = ''
      timelineItems.splice(0, timelineItems.length, ...(data || []))
      resultServices = (data || []).map(item => item.service_name || '').filter(name => name.trim())
      updateServices([...(discoveredServices || timelineServices), ...resultServices])
    }).catch(() => {
      if (!current()) return
      timelineItems.length = 0
      timelineStatus.itemsError = 'Could not load events for these filters. Change a filter or try again.'
    }),
    api.get<{ services: string[]; truncated?: boolean }>('/api/timeline/filters').then(filters => {
      if (!current()) return
      timelineStatus.servicesError = ''
      timelineStatus.servicesTruncated = !!filters.truncated
      discoveredServices = filters.services
      updateServices([...filters.services, ...resultServices])
    }).catch(() => {
      if (!current()) return
      timelineStatus.servicesError = 'Could not refresh service choices. Existing choices and available events are still shown.'
      updateServices(timelineServices)
    }),
  ])
}

export async function selectTimelineItem(item: TimelineItem) {
  selectedItem.value = item
  relatedLogs.length = 0

  try {
    if (item.type === 'trace') {
      const detail = await api.get<unknown>(`/api/traces/${item.id}`)
      selectedItemData.value = detail

      // Load related logs if trace has a trace_id
      try {
        const logs = await api.get<{ logs: unknown[] }>(`/api/logs?trace_id=${item.id}&limit=10`)
        relatedLogs.push(...(logs.logs || []))
      } catch {
        // ignore
      }
    } else if (item.type === 'log') {
      const detail = await api.get<unknown>(`/api/logs/${item.id}`)
      selectedItemData.value = detail
    } else if (item.type === 'metric' || item.type === 'hermes') {
      selectedItemData.value = item.data || item
    }
  } catch (e) {
    console.error('Failed to load timeline item:', e)
    selectedItemData.value = null
  }
}

export function clearSelection() {
  selectedItem.value = null
  selectedItemData.value = null
  relatedLogs.length = 0
}

export function clearFilters() {
  timelineFilters.q = ''
  timelineFilters.tool = ''
  timelineFilters.type = ''
  timelineFilters.dateRange = ''
  timelineFilters.date_from = null
  loadTimeline()
}

export function initTimelineSync() {
  let timer: ReturnType<typeof setTimeout> | undefined
  const unsubscribe = onMessage((msg) => {
    if (tabState.current !== 'timeline') return

    if (msg.type === 'new_trace' || msg.type === 'new_log' || msg.type === 'hermes_event') {
      if (timer) return
      timer = setTimeout(() => {
        timer = undefined
        void loadTimeline()
      }, 1000)
    }
  })
  return () => { unsubscribe(); clearTimeout(timer) }
}
