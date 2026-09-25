<script lang="ts">
  import { onMount } from 'svelte'
  import { tabState, setTab, type Tab } from '$lib/stores/tabs.svelte'
  import { toggleTheme } from '$lib/stores/theme.svelte'
  import { authAccount, authMode } from '$lib/stores/auth.svelte'

  const activityTabs = [
    ['timeline', 'Timeline'],
    ['traces', 'Traces'],
    ['sessions', 'Sessions'],
    ['continuity', 'Resume work'],
    ['logs', 'Logs'],
    ['metrics', 'Metrics'],
  ] as const

  let activityMenu = $state<HTMLDetailsElement>()
  let settingsMenu = $state<HTMLDetailsElement>()
  let activityActive = $derived(activityTabs.some(([tab]) => tabState.current === tab))

  function choose(tab: Tab) {
    setTab(tab)
    if (activityMenu) activityMenu.open = false
    if (settingsMenu) settingsMenu.open = false
  }

  onMount(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (activityMenu && !activityMenu.contains(event.target as Node)) activityMenu.open = false
      if (settingsMenu && !settingsMenu.contains(event.target as Node)) settingsMenu.open = false
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (activityMenu) activityMenu.open = false
        if (settingsMenu) settingsMenu.open = false
      }
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  })
</script>

<nav class="tabs" data-testid="tabs" aria-label="Dashboard">
  {#if authAccount.value?.role !== 'viewer'}<details class="nav-menu" bind:this={activityMenu}>
    <summary class:active={activityActive}>Activity</summary>
    <div class="nav-menu-items">
      {#each activityTabs as [tab, label]}
        <button class:active={tabState.current === tab} data-testid="tab-{tab}" onclick={() => choose(tab)}>{label}</button>
      {/each}
    </div>
  </details>{/if}
  <button class="tab" class:active={tabState.current === 'models'} data-testid="tab-models" onclick={() => choose('models')}>Models</button>
  <button class="tab" class:active={tabState.current === 'analytics'} data-testid="tab-analytics" onclick={() => choose('analytics')}>Analytics</button>
  <details class="nav-menu" bind:this={settingsMenu}>
    <summary class:active={tabState.current === 'connect' || tabState.current === 'database' || tabState.current === 'users' || tabState.current === 'account'}>Settings</summary>
    <div class="nav-menu-items">
      <button class:active={tabState.current === 'account'} data-testid="tab-account" onclick={() => choose('account')}>My account</button>
      {#if authAccount.value?.role === 'administrator'}
        <button class:active={tabState.current === 'connect'} data-testid="tab-connect" onclick={() => choose('connect')}>Connect</button>
        <button class:active={tabState.current === 'database'} data-testid="tab-database" onclick={() => choose('database')}>Database</button>
        {#if authMode.value !== 'atmem'}<button class:active={tabState.current === 'users'} data-testid="tab-users" onclick={() => choose('users')}>Users &amp; access</button>{/if}
      {/if}
      <button data-testid="theme-toggle" onclick={() => { toggleTheme(); if (settingsMenu) settingsMenu.open = false }}>Toggle theme</button>
    </div>
  </details>
</nav>
