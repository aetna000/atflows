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
  import DatabaseTab from '$lib/components/settings/DatabaseTab.svelte'
  import Login from '$lib/components/layout/Login.svelte'
  import { api } from '$lib/api/client'
  import { tabState, initTabHashSync, setTab, validTabs } from '$lib/stores/tabs.svelte'
  import { initTheme, toggleTheme } from '$lib/stores/theme.svelte'
  import { initWebSocket, closeWebSocket } from '$lib/stores/websocket.svelte'
  import { loadStats, initStatsSync } from '$lib/stores/stats.svelte'
  import atflowsPackage from '../../../package.json'
  import { authAccount, type Account } from '$lib/stores/auth.svelte'
  import UsersTab from '$lib/components/settings/UsersTab.svelte'
  import AccountTab from '$lib/components/settings/AccountTab.svelte'

  let authState = $state<'loading' | 'signed-out' | 'change-password' | 'authenticated'>('loading')
  let stopDashboard: (() => void) | undefined

  $effect(() => {
    if (authState !== 'authenticated') return
    const role = authAccount.value?.role
    if (role === 'viewer' && tabState.current !== 'models' && tabState.current !== 'analytics' && tabState.current !== 'account') setTab('models')
    else if (role !== 'administrator' && ['connect', 'database', 'users'].includes(tabState.current)) setTab('timeline')
  })

  function startDashboard() {
    if (stopDashboard) return
    initTheme()
    initTabHashSync()
    if (authAccount.value?.role === 'viewer' && tabState.current !== 'models' && tabState.current !== 'analytics' && tabState.current !== 'account') setTab('models')
    if (authAccount.value?.role !== 'viewer') initWebSocket()
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
    api.get<{ authenticated: boolean; password_change_required: boolean; account: Account | null }>('/api/auth/status')
      .then((status) => {
        authAccount.value = status.account
        authState = status.authenticated ? status.password_change_required ? 'change-password' : 'authenticated' : 'signed-out'
        if (authState === 'authenticated') startDashboard()
      })
      .catch(() => { authState = 'signed-out' })
    return () => { stopDashboard?.(); closeWebSocket() }
  })

  function signedIn(changeRequired: boolean, account: Account) {
    authAccount.value = account
    authState = changeRequired ? 'change-password' : 'authenticated'
    if (!changeRequired) startDashboard()
  }

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    window.location.reload()
  }
</script>

<div class="container">
  {#if authState === 'authenticated'}
    <Header onsignout={signOut} />

    <main>

    <div id="accountTab" class="tab-content {tabState.current === 'account' ? 'active' : ''}" data-testid="account-tab-panel"><AccountTab /></div>

    {#if authAccount.value?.role === 'administrator'}<div
      id="connectTab"
      class="tab-content {tabState.current === 'connect' ? 'active' : ''}"
      data-testid="connect-tab-panel"
    >
      <ConnectTab />
    </div>
      <div id="usersTab" class="tab-content {tabState.current === 'users' ? 'active' : ''}" data-testid="users-tab-panel">
        <UsersTab />
      </div>
    <div
      id="databaseTab"
      class="tab-content {tabState.current === 'database' ? 'active' : ''}"
      data-testid="database-tab-panel"
    >
      <DatabaseTab />
    </div>
    {/if}

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
  {#if authState !== 'loading'}
    <footer class="product-footer" aria-label="AtMem.ai and AtFlows links">
      <div class="footer-versions">
        <span class="footer-label">Current build</span>
        <span class="footer-version-chip">AtFlows <strong>{atflowsPackage.version}</strong></span>
      </div>
      <nav aria-label="Project links">
        <a href="https://atmem.ai/" target="_blank" rel="noopener noreferrer">AtMem.ai ↗</a>
        <a href="mailto:hello@atmem.ai">hello@atmem.ai</a>
        <a href="https://atmem.ai/about" target="_blank" rel="noopener noreferrer">About AtMem</a>
        <a href="https://x.com/AtMemAi" target="_blank" rel="noopener noreferrer">X ↗</a>
        <a href="https://github.com/aetna000/atmem" target="_blank" rel="noopener noreferrer">AtMem repo ↗</a>
        <a href="https://github.com/aetna000/atflows" target="_blank" rel="noopener noreferrer">AtFlows repo ↗</a>
        <a href="https://github.com/javadtaghia" target="_blank" rel="noopener noreferrer">By Javad Taghia ↗</a>
      </nav>
    </footer>
  {/if}
</div>
