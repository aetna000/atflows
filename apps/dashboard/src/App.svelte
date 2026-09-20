<script lang="ts">
  import { onMount } from 'svelte'
  import Header from '$lib/components/layout/Header.svelte'
  import TimelineTab from '$lib/components/timeline/TimelineTab.svelte'
  import TracesTab from '$lib/components/traces/TracesTab.svelte'
  import LogsTab from '$lib/components/logs/LogsTab.svelte'
  import MetricsTab from '$lib/components/metrics/MetricsTab.svelte'
  import ModelsTab from '$lib/components/models/ModelsTab.svelte'
  import AnalyticsTab from '$lib/components/analytics/AnalyticsTab.svelte'
  import SessionsTab from '$lib/components/sessions/SessionsTab.svelte'
  import ConnectTab from '$lib/components/connect/ConnectTab.svelte'
  import Login from '$lib/components/layout/Login.svelte'
  import { api } from '$lib/api/client'
  import { tabState, initTabHashSync, setTab, validTabs } from '$lib/stores/tabs.svelte'
  import { initTheme, toggleTheme } from '$lib/stores/theme.svelte'
  import { initWebSocket, closeWebSocket } from '$lib/stores/websocket.svelte'
  import { loadStats, initStatsSync } from '$lib/stores/stats.svelte'

  let authState = $state<'loading' | 'signed-out' | 'change-password' | 'authenticated'>('loading')
  let stopDashboard: (() => void) | undefined

  function startDashboard() {
    if (stopDashboard) return
    initTheme()
    initTabHashSync()
    initWebSocket()
    loadStats()
    initStatsSync()

    // Polling fallback for stats
    const statsInterval = setInterval(loadStats, 30000)

    // Keyboard shortcuts
    const handleKeydown = (e: KeyboardEvent) => {
      const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        document.activeElement?.tagName || '',
      )

      // "/" to focus search
      if (e.key === '/' && !isInputFocused) {
        e.preventDefault()
        const searchInput = document.querySelector<HTMLInputElement>(
          '.filter-bar input[type="text"]',
        )
        searchInput?.focus()
        return
      }

      // Escape: blur input
      if (e.key === 'Escape') {
        if (isInputFocused) {
          ;(document.activeElement as HTMLElement)?.blur()
        }
        return
      }

      if (isInputFocused) return

      // Tab shortcuts
      if (e.key >= '1' && e.key <= '8' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tabIndex = parseInt(e.key) - 1
        if (tabIndex < validTabs.length) {
          e.preventDefault()
          setTab(validTabs[tabIndex])
        }
        return
      }

      // "t" to toggle theme
      if (e.key === 't' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        toggleTheme()
        return
      }

      // Arrow key / j/k navigation
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'j' || e.key === 'k') {
        e.preventDefault()
        navigateList(e.key === 'ArrowDown' || e.key === 'j' ? 1 : -1)
        return
      }

      // "r" to refresh
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        // Trigger refresh by dispatching custom event or calling load functions
        window.dispatchEvent(new CustomEvent('atflows:refresh'))
        return
      }
    }

    function navigateList(direction: number) {
      let rows: HTMLElement[]
      let currentSelected: HTMLElement | null

      if (tabState.current === 'timeline') {
        rows = Array.from(document.querySelectorAll('.timeline-item'))
        currentSelected = document.querySelector('.timeline-item.selected')
      } else if (tabState.current === 'traces') {
        rows = Array.from(document.querySelectorAll('#tracesBody .trace-row'))
        currentSelected = document.querySelector('#tracesBody .trace-row.selected')
      } else if (tabState.current === 'logs') {
        rows = Array.from(document.querySelectorAll('[data-testid="logs-body"] .trace-row'))
        currentSelected = document.querySelector('[data-testid="logs-body"] .trace-row.selected')
      } else if (tabState.current === 'metrics') {
        rows = Array.from(document.querySelectorAll('[data-testid="metrics-body"] .trace-row'))
        currentSelected = document.querySelector('[data-testid="metrics-body"] .trace-row.selected')
      } else {
        return
      }

      if (rows.length === 0) return

      let currentIndex = currentSelected ? rows.indexOf(currentSelected) : -1
      let newIndex = currentIndex + direction

      if (newIndex < 0) newIndex = rows.length - 1
      if (newIndex >= rows.length) newIndex = 0

      const newRow = rows[newIndex]
      if (newRow) {
        newRow.click()
        newRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }

    window.addEventListener('keydown', handleKeydown)

    stopDashboard = () => {
      clearInterval(statsInterval)
      window.removeEventListener('keydown', handleKeydown)
    }
  }

  onMount(() => {
    api.get<{ authenticated: boolean; password_change_required: boolean }>('/api/auth/status')
      .then((status) => {
        authState = status.authenticated ? status.password_change_required ? 'change-password' : 'authenticated' : 'signed-out'
        if (authState === 'authenticated') startDashboard()
      })
      .catch(() => { authState = 'signed-out' })
    return () => { stopDashboard?.(); closeWebSocket() }
  })

  function signedIn(changeRequired: boolean) {
    authState = changeRequired ? 'change-password' : 'authenticated'
    if (!changeRequired) startDashboard()
  }

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    stopDashboard?.()
    stopDashboard = undefined
    closeWebSocket()
    authState = 'signed-out'
  }
</script>

<div class="container">
  {#if authState === 'authenticated'}
    <Header onsignout={signOut} />

    <main>

    <div
      id="connectTab"
      class="tab-content {tabState.current === 'connect' ? 'active' : ''}"
      data-testid="connect-tab-panel"
    >
      <ConnectTab />
    </div>

    <div
      id="timelineTab"
      class="tab-content {tabState.current === 'timeline' ? 'active' : ''}"
      data-testid="timeline-tab"
    >
      <TimelineTab />
    </div>
    <div
      id="tracesTab"
      class="tab-content {tabState.current === 'traces' ? 'active' : ''}"
      data-testid="traces-tab"
    >
      <TracesTab />
    </div>
    <div
      id="sessionsTab"
      class="tab-content {tabState.current === 'sessions' ? 'active' : ''}"
      data-testid="sessions-tab"
    >
      <SessionsTab />
    </div>
    <div
      id="logsTab"
      class="tab-content {tabState.current === 'logs' ? 'active' : ''}"
      data-testid="logs-tab"
    >
      <LogsTab />
    </div>
    <div
      id="metricsTab"
      class="tab-content {tabState.current === 'metrics' ? 'active' : ''}"
      data-testid="metrics-tab"
    >
      <MetricsTab />
    </div>
    <div
      id="modelsTab"
      class="tab-content {tabState.current === 'models' ? 'active' : ''}"
      data-testid="models-tab"
    >
      <ModelsTab />
    </div>
    <div
      id="analyticsTab"
      class="tab-content {tabState.current === 'analytics' ? 'active' : ''}"
      data-testid="analytics-tab"
    >
      <AnalyticsTab />
    </div>
    </main>
  {:else if authState === 'signed-out' || authState === 'change-password'}
    <Login onsignedin={signedIn} mustChange={authState === 'change-password'} />
  {/if}
</div>
