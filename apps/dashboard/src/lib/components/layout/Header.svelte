<script lang="ts">
  import { onMount } from 'svelte'
  import { api } from '$lib/api/client'
  import { stats } from '$lib/stores/stats.svelte'
  import { connectionStatus } from '$lib/stores/websocket.svelte'
  import { toggleTheme } from '$lib/stores/theme.svelte'
  import { formatNumber, formatCost, formatLatency } from '$lib/utils/format'
  import Tabs from './Tabs.svelte'

  let { onsignout }: { onsignout: () => Promise<void> } = $props()

  let dataCounts = $state({ traces: 0, logs: 0, metrics: 0 })
  let demoCounts = $state({ traces: 0, logs: 0, metrics: 0 })
  let clearingData = $state(false)
  let dataError = $state('')
  let totalRecords = $derived(dataCounts.traces + dataCounts.logs + dataCounts.metrics)
  let demoRecords = $derived(demoCounts.traces + demoCounts.logs + demoCounts.metrics)

  onMount(async () => {
    try {
      ;[dataCounts, demoCounts] = await Promise.all([
        api.get<typeof dataCounts>('/api/data'),
        api.get<typeof demoCounts>('/api/demo-data'),
      ])
    } catch {
      dataError = 'Could not check saved data'
    }
  })

  async function eraseData() {
    if (!totalRecords || clearingData) return
    const confirmed = demoRecords
      ? window.confirm(
          `Erase demo data (${demoCounts.traces} traces, ${demoCounts.logs} logs, ${demoCounts.metrics} metrics)? Other activity will remain.`,
        )
      : window.confirm(
          `Permanently erase all saved telemetry (${dataCounts.traces} traces, ${dataCounts.logs} logs, ${dataCounts.metrics} metrics), including Codex activity? This resets the dashboard, model cards, and statistics.`,
        )
    if (!confirmed) return
    clearingData = true
    dataError = ''
    try {
      if (demoRecords) {
        await api.delete<typeof demoCounts>('/api/demo-data', 'clear-demo-data')
      } else {
        await api.delete<typeof dataCounts>('/api/data', 'clear-all-data')
      }
      window.location.reload()
    } catch {
      dataError = 'Could not erase saved data'
      clearingData = false
    }
  }
</script>

<header data-testid="header">
  <div class="header-row">
    <div class="header-left">
      <h1 class="logo" data-testid="logo">
        <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
          <path d="M12 5L5 19M12 5l7 14M5 19h14" />
          <circle cx="12" cy="4" r="2" fill="currentColor" stroke="none" />
          <circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" />
        </svg>
        AtFlows
        <span id="connectionStatus" class="status-dot" class:connected={connectionStatus.value === 'connected'} class:disconnected={connectionStatus.value === 'disconnected'} data-testid="connection-status" title={connectionStatus.value}></span>
      </h1>
      <Tabs />
    </div>
    <div class="header-actions">
      <div class="identity-chip"><strong>Local Administrator</strong><small>ADMINISTRATOR</small></div>
      <button class="signout-button" onclick={onsignout}>Sign out</button>
      <button class="theme-toggle" data-testid="theme-toggle" onclick={toggleTheme} title="Toggle theme">
        <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
        <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5" /><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
        <span>Theme</span>
      </button>
      <span class="server-chip" class:online={connectionStatus.value === 'connected'}>AtFlows {connectionStatus.value === 'connected' ? 'active' : 'connecting'}</span>
    </div>
  </div>
  <div class="header-subrow">
    <div class="header-tools">
      <a class="package-link" href="https://pypi.org/project/atflows/" target="_blank" rel="noopener noreferrer">pip install atflows</a>
      <button class="clear-data-button" data-testid="clear-all-data" onclick={eraseData} disabled={totalRecords === 0 || clearingData} title={demoRecords ? `Erase ${demoRecords} demo records` : totalRecords ? `Erase all ${totalRecords} saved records` : 'No saved data to erase'}>{clearingData ? 'Erasing…' : demoRecords ? 'Clear demo data' : 'Clear data'}</button>
      {#if dataError}<span class="data-error" role="alert">{dataError}</span>{/if}
    </div>
    <div class="stats-bar" data-testid="stats-bar">
      <div class="stat" data-testid="stat-traces"><span class="stat-value" data-testid="total-requests">{stats.total_requests > 0 ? formatNumber(stats.total_requests) : '-'}</span><span class="stat-label">Traces</span></div>
      <div class="stat" data-testid="stat-tokens"><span class="stat-value" data-testid="total-tokens">{stats.total_tokens > 0 ? formatNumber(stats.total_tokens) : '-'}</span><span class="stat-label">Tokens</span></div>
      <div class="stat" data-testid="stat-cost"><span class="stat-value" data-testid="total-cost">{stats.total_cost > 0 ? formatCost(stats.total_cost) : '-'}</span><span class="stat-label">Cost</span></div>
      <div class="stat" data-testid="stat-latency"><span class="stat-value" data-testid="avg-latency">{stats.avg_duration > 0 ? formatLatency(stats.avg_duration) : '-'}</span><span class="stat-label">Avg Latency</span></div>
    </div>
  </div>
</header>
