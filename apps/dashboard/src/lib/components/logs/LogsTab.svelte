<script lang="ts">
  import { onMount } from 'svelte'
  import { tabState } from '$lib/stores/tabs.svelte'
  import JsonCode from '$lib/components/shared/JsonCode.svelte'
  import { formatLocalIso, formatUtcIso } from '$lib/utils/format'
  import { downloadJson } from '$lib/utils/export'
  import { authAccount } from '$lib/stores/auth.svelte'
  import {
    logs, selectedLog, selectedLogId, logFilters, filterOptions,
    loadLogs, loadFilterOptions, selectLog, clearSelection, clearFilters, initLogsSync,
  } from '$lib/stores/logs.svelte'

  onMount(() => {
    loadFilterOptions()
    initLogsSync()
  })
  $effect(() => {
    if (tabState.current === 'logs') loadLogs()
  })
</script>

<div class="filter-bar" data-testid="logs-filters">
  <input type="text" placeholder="Search logs" aria-label="Search logs" bind:value={logFilters.q} oninput={loadLogs} />
  <select aria-label="Service" bind:value={logFilters.service_name} onchange={loadLogs}>
    <option value="">All services</option>
    {#each filterOptions.services as service}<option value={service}>{service}</option>{/each}
  </select>
  <select aria-label="Event" bind:value={logFilters.event_name} onchange={loadLogs}>
    <option value="">All events</option>
    {#each filterOptions.event_names as event}<option value={event}>{event}</option>{/each}
  </select>
  <button class="btn-secondary" onclick={clearFilters}>Clear</button>
  {#if authAccount.value?.role === 'evidence_collector' || authAccount.value?.role === 'administrator'}<button type="button" class="btn-secondary" onclick={() => downloadJson('logs', { filters: logFilters, records: logs })} disabled={logs.length === 0}>Export JSON</button>{/if}
</div>
<div class="logs-layout">
  <div class="table-container">
    <table>
      <thead><tr><th>Time</th><th>Severity</th><th>Service</th><th>Message</th></tr></thead>
      <tbody data-testid="logs-body">
        {#each logs as log (log.id)}
          <tr class="trace-row" class:selected={selectedLogId.value === log.id} onclick={() => selectLog(log.id)}>
            <td class="log-time"><time datetime={formatUtcIso(log.timestamp)} title={`UTC: ${formatUtcIso(log.timestamp)}`}>{formatLocalIso(log.timestamp)}</time></td>
            <td>{log.severity_text || '—'}</td>
            <td>{log.service_name || '—'}</td>
            <td class="log-body-preview">{log.body || log.event_name || '—'}</td>
          </tr>
        {:else}
          <tr><td colspan="4">No logs yet.</td></tr>
        {/each}
      </tbody>
    </table>
  </div>
  {#if selectedLog.value}
    <aside class="log-detail">
      {#if authAccount.value?.role === 'evidence_collector' || authAccount.value?.role === 'administrator'}<button type="button" class="btn-secondary" onclick={() => downloadJson('log-detail', selectedLog.value)}>Export JSON</button>{/if}
      <button class="btn-secondary" onclick={clearSelection}>Close</button>
      <h2>Log detail</h2>
      <p class="log-timestamp">Local: {formatLocalIso(selectedLog.value.timestamp)}<br />UTC: {formatUtcIso(selectedLog.value.timestamp)}</p>
      <p>{selectedLog.value.body || selectedLog.value.event_name || '—'}</p>
      <JsonCode text={JSON.stringify(selectedLog.value, null, 2)} />
    </aside>
  {/if}
</div>
<style>
  .logs-layout { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 16px; }
  .table-container { overflow-x: auto; }
  .log-detail { width: min(400px, 40vw); border: 1px solid var(--border-primary); padding: 16px; overflow: auto; }
  .log-time { white-space: nowrap; font-variant-numeric: tabular-nums; font-size: 11px; }
  .log-timestamp { color: var(--text-secondary); font: 11px/1.5 ui-monospace, SFMono-Regular, Consolas, monospace; overflow-wrap: anywhere; }
  @media (max-width: 700px) { .logs-layout { display: block; } .log-detail { width: 100%; } }
</style>
