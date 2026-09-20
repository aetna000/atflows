<script lang="ts">
  import { onMount } from 'svelte'
  import TracesTable from './TracesTable.svelte'
  import TraceDetail from './TraceDetail.svelte'
  import {
    traceFilters,
    filterOptions,
    loadTraces,
    loadFilterOptions,
    clearFilters,
    traces,
    selectedTraceId,
    selectedTrace,
    clearSelection,
    initTracesSync,
  } from '$lib/stores/traces.svelte'
  import { tabState } from '$lib/stores/tabs.svelte'
  import { downloadJson } from '$lib/utils/export'
  import { authAccount } from '$lib/stores/auth.svelte'

  let searchInput = $state('')
  let debounceTimer: ReturnType<typeof setTimeout>

  function handleSearchInput(e: Event) {
    const value = (e.target as HTMLInputElement).value
    searchInput = value
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      traceFilters.q = value
      loadTraces()
    }, 300)
  }

  function handleModelChange(e: Event) {
    traceFilters.model = (e.target as HTMLSelectElement).value
    loadTraces()
  }

  function handleStatusChange(e: Event) {
    traceFilters.status = (e.target as HTMLSelectElement).value
    loadTraces()
  }

  function handleDateChange(e: Event) {
    traceFilters.dateRange = (e.target as HTMLSelectElement).value
    loadTraces()
  }

  function handleClear() {
    searchInput = ''
    clearFilters()
  }

  onMount(() => {
    loadFilterOptions()
    initTracesSync()
  })

  $effect(() => {
    if (tabState.current === 'traces') {
      loadTraces()
    }
  })
</script>

<div class="filter-bar traces-filter-bar" data-testid="traces-filters">
  <input
    type="text"
    id="searchInput"
    data-testid="traces-search"
    placeholder="Search... (press /)"
    value={searchInput}
    oninput={handleSearchInput}
  />
  <select
    id="modelFilter"
    data-testid="traces-model-filter"
    value={traceFilters.model}
    onchange={handleModelChange}
  >
    <option value="">All Models</option>
    {#each filterOptions.models as model}
      <option value={model}>{model}</option>
    {/each}
  </select>
  <select
    id="statusFilter"
    data-testid="traces-status-filter"
    value={traceFilters.status}
    onchange={handleStatusChange}
  >
    <option value="">All Status</option>
    <option value="success">Success</option>
    <option value="error">Error</option>
  </select>
  <select
    id="dateFilter"
    data-testid="traces-date-filter"
    value={traceFilters.dateRange}
    onchange={handleDateChange}
  >
    <option value="">All Time</option>
    <option value="1h">Last Hour</option>
    <option value="24h">Last 24h</option>
    <option value="7d">Last 7d</option>
  </select>
  <button
    id="clearFilters"
    class="btn-secondary"
    data-testid="traces-clear-filters"
    onclick={handleClear}
  >
    Reset filters
  </button>
  {#if authAccount.value?.role === 'evidence_collector' || authAccount.value?.role === 'administrator'}<button type="button" class="btn-secondary" onclick={() => downloadJson('traces', { filters: traceFilters, records: traces })} disabled={traces.length === 0}>Export JSON</button>{/if}
</div>

<div class="traces-workspace">
  <section class="traces-list-panel" aria-label="Recent traces">
    <div class="traces-panel-heading"><strong>Recent traces</strong><span>{traces.length} shown</span></div>
    <TracesTable />
  </section>
  {#if selectedTraceId.value}
    <section class="traces-selected-panel" aria-label="Selected trace">
      <div class="traces-panel-heading"><strong>Trace details</strong><span class="traces-panel-actions">{#if authAccount.value?.role === 'evidence_collector' || authAccount.value?.role === 'administrator'}<button type="button" class="btn-secondary" onclick={() => downloadJson('trace-detail', selectedTrace.value)} disabled={!selectedTrace.value}>Export JSON</button>{/if}<button type="button" class="btn-secondary" onclick={clearSelection}>Close</button></span></div>
      {#if selectedTrace.value}<TraceDetail />{:else}<p class="traces-loading">Loading trace…</p>{/if}
    </section>
  {/if}
</div>

<style>
  .traces-filter-bar { flex-wrap: wrap; }
  .traces-filter-bar input { flex: 1 1 230px; width: auto; min-width: 180px; }
  .traces-filter-bar select { flex: 0 1 150px; min-width: 125px; }
  .traces-workspace { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
  .traces-list-panel, .traces-selected-panel { min-width: 0; border: 1px solid var(--border-primary); background: var(--bg-secondary); }
  .traces-list-panel { max-height: 62vh; overflow: auto; }
  .traces-panel-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 8px 12px; border-bottom: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-primary); font-size: 12px; }
  .traces-panel-heading span { color: var(--text-secondary); }
  .traces-panel-actions { display: flex; gap: 6px; }
  .traces-panel-heading .btn-secondary { padding: 4px 10px; }
  .traces-loading { padding: 16px; color: var(--text-secondary); }
</style>
