<script lang="ts">
  import { onMount } from 'svelte'
  import { api } from '$lib/api/client'
  import { stats } from '$lib/stores/stats.svelte'
  import { connectionStatus } from '$lib/stores/websocket.svelte'
  import { formatNumber, formatCost, formatLatency } from '$lib/utils/format'
  import { setTab } from '$lib/stores/tabs.svelte'
  import Tabs from './Tabs.svelte'
  import { authAccount } from '$lib/stores/auth.svelte'

  let { onsignout }: { onsignout: () => Promise<void> } = $props()

  let dataCounts = $state({ traces: 0, logs: 0, metrics: 0 })
  let demoCounts = $state({ traces: 0, logs: 0, metrics: 0 })
  let clearingData = $state(false)
  let dataError = $state('')
  let totalRecords = $derived(dataCounts.traces + dataCounts.logs + dataCounts.metrics)
  let demoRecords = $derived(demoCounts.traces + demoCounts.logs + demoCounts.metrics)

  onMount(async () => {
    if (authAccount.value?.role !== 'administrator') return
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
        <button type="button" class="brand-home" aria-label="AtMem.ai AtFlows home" title="Go to home" onclick={() => setTab('timeline')}>
          <svg class="logo-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 6.5 L5.5 17.5 M12 6.5 L18.5 17.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
            <circle cx="12" cy="5" r="2.6" fill="currentColor" />
            <circle cx="5" cy="18.5" r="2.2" fill="none" stroke="currentColor" stroke-width="1.4" />
            <circle cx="19" cy="18.5" r="2.2" fill="none" stroke="currentColor" stroke-width="1.4" />
          </svg>
          <span>AtMem.ai</span><span class="brand-separator">|</span><span>AtFlows</span>
          <span id="connectionStatus" class="status-dot" class:connected={authAccount.value?.role === 'viewer' || connectionStatus.value === 'connected'} class:disconnected={authAccount.value?.role !== 'viewer' && connectionStatus.value === 'disconnected'} data-testid="connection-status" title={authAccount.value?.role === 'viewer' ? 'summary access active' : connectionStatus.value}></span>
        </button>
      </h1>
      <Tabs />
    </div>
    <div class="header-actions">
      <div class="identity-chip"><strong>{authAccount.value?.display_name || 'Account'}</strong><small>{authAccount.value?.role.replace('_', ' ').toUpperCase() || ''}</small></div>
      <button class="signout-button" onclick={onsignout}>Sign out</button>
      <span class="server-chip" class:online={authAccount.value?.role === 'viewer' || connectionStatus.value === 'connected'}>AtFlows {authAccount.value?.role === 'viewer' || connectionStatus.value === 'connected' ? 'active' : 'connecting'}</span>
    </div>
  </div>
  <div class="header-subrow">
    <div class="header-tools">
      <a class="package-link" href="https://pypi.org/project/atflows/" target="_blank" rel="noopener noreferrer">pip install atflows</a>
      {#if authAccount.value?.role === 'administrator'}<button class="clear-data-button" data-testid="clear-all-data" onclick={eraseData} disabled={totalRecords === 0 || clearingData} title={demoRecords ? `Erase ${demoRecords} demo records` : totalRecords ? `Erase all ${totalRecords} saved records` : 'No saved data to erase'}>{clearingData ? 'Erasing…' : demoRecords ? 'Clear demo data' : 'Clear data'}</button>{/if}
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
