<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import TimelineList from './TimelineList.svelte'
  import TimelineDetail from './TimelineDetail.svelte'
  import EventGroups from './EventGroups.svelte'
  import { eventGroup, type EventGrouping } from '$lib/utils/event-groups'
  let groupBy = $state<EventGrouping>('tool')
  let selectedGroup = $state('')
  let groupedItems = $derived(selectedGroup ? timelineItems.filter(item => eventGroup(item, groupBy) === selectedGroup) : timelineItems)
  import {
    timelineFilters,
    timelineItems,
    timelineServices,
    timelineStatus,
    loadTimeline,
    clearFilters,
    initTimelineSync,
  } from '$lib/stores/timeline.svelte'
  import { tabState, setTab } from '$lib/stores/tabs.svelte'
  import { downloadJson } from '$lib/utils/export'
  import { authAccount } from '$lib/stores/auth.svelte'

  let searchInput = $state('')
  let debounceTimer: ReturnType<typeof setTimeout>

  function handleSearchInput(e: Event) {
    const value = (e.target as HTMLInputElement).value
    searchInput = value
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      timelineFilters.q = value
      loadTimeline()
    }, 300)
  }

  function handleToolChange(e: Event) {
    selectedGroup = ''
    timelineFilters.tool = (e.target as HTMLSelectElement).value
    loadTimeline()
  }

  function handleTypeChange(e: Event) {
    selectedGroup = ''
    timelineFilters.type = (e.target as HTMLSelectElement).value
    loadTimeline()
  }

  function handleDateChange(e: Event) {
    selectedGroup = ''
    timelineFilters.dateRange = (e.target as HTMLSelectElement).value
    loadTimeline()
  }

  function handleClear() {
    selectedGroup = ''
    searchInput = ''
    clearFilters()
  }

  onMount(() => {
    const stopSync = initTimelineSync()
    return () => { stopSync(); clearTimeout(debounceTimer) }
  })

  $effect(() => {
    if (tabState.current === 'timeline') {
      untrack(() => loadTimeline())
    }
  })
</script>

{#if authAccount.value?.role === 'administrator'}<button type="button" class="connect-hint" data-testid="timeline-connect-hint" onclick={() => setTab('connect')}>
  <span><strong>Connect your first tool</strong><small>Choose Codex, Claude Code, OpenClaw, or an app to see setup steps for this server.</small></span>
  <span class="connect-hint-action">Open Connect →</span>
</button>{/if}

<div class="filter-bar" data-testid="timeline-filters">
  <input
    type="text"
    id="timelineSearchInput"
    data-testid="timeline-search"
    placeholder="Search timeline... (press /)"
    value={searchInput}
    oninput={handleSearchInput}
  />
  <select
    aria-label="Filter by recorded tool or service"
    id="toolFilter"
    data-testid="timeline-tool-filter"
    value={timelineFilters.tool}
    onchange={handleToolChange}
  >
    <option value="">All tools / services</option>
    {#each timelineServices as service}
      <option value={service}>{service}</option>
    {/each}
  </select>
  <select
    id="timelineTypeFilter"
    data-testid="timeline-type-filter"
    value={timelineFilters.type}
    onchange={handleTypeChange}
  >
    <option value="">All Types</option>
    <option value="trace">Traces</option>
    <option value="log">Logs</option>
    <option value="metric">Metrics</option>
    <option value="hermes">Hermes events</option>
  </select>
  <select
    id="timelineDateFilter"
    data-testid="timeline-date-filter"
    value={timelineFilters.dateRange}
    onchange={handleDateChange}
  >
    <option value="">All Time</option>
    <option value="1h">Last Hour</option>
    <option value="24h">Last 24h</option>
    <option value="7d">Last 7d</option>
  </select>
  <button
    id="clearTimelineFilters"
    class="btn-secondary"
    data-testid="timeline-clear-filters"
    onclick={handleClear}
  >
    Clear
  </button>
  {#if authAccount.value?.role === 'evidence_collector' || authAccount.value?.role === 'administrator'}<button type="button" class="btn-secondary" onclick={() => downloadJson('timeline', { filters: timelineFilters, records: timelineItems })} disabled={timelineItems.length === 0}>Export JSON</button>{/if}
</div>

{#if timelineStatus.itemsError}<p role="alert">{timelineStatus.itemsError}</p>{/if}
{#if timelineStatus.servicesError}<p role="status">{timelineStatus.servicesError}</p>{/if}
{#if timelineStatus.servicesTruncated}
  <p role="status">Showing the first 500 recorded service names, plus services in these results and your current selection.</p>
  <label for="exact-service-filter">Filter by exact service name</label>
  <input id="exact-service-filter" value={timelineFilters.tool} onchange={handleToolChange} />
{/if}

<EventGroups items={timelineItems} bind:by={groupBy} bind:selected={selectedGroup} />

<div class="split-layout">
  <div class="panel-left">
    <TimelineList items={groupedItems} />
  </div>
  <TimelineDetail />
</div>
