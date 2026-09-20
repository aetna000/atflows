<script lang="ts">
  import { traces, selectedTraceId, selectTrace, type Trace } from '$lib/stores/traces.svelte'
  import { formatNumber, formatCost, formatLatency, formatLocalIso, formatUtcIso } from '$lib/utils/format'
  import EmptyState from '$lib/components/shared/EmptyState.svelte'

  function getSpanTypeClass(type?: string): string {
    if (!type) return 'custom'
    const t = type.toLowerCase()
    if (t.includes('llm')) return 'llm'
    if (t.includes('agent')) return 'agent'
    if (t.includes('chain')) return 'chain'
    if (t.includes('tool')) return 'tool'
    if (t.includes('retrieval')) return 'retrieval'
    if (t.includes('embedding')) return 'embedding'
    return 'trace'
  }

  function handleRowClick(trace: Trace) {
    selectTrace(trace.id)
  }

  function handleKeyDown(e: KeyboardEvent, trace: Trace) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      selectTrace(trace.id)
    }
  }

</script>

<table class="trace-table" data-testid="traces-table">
  <colgroup><col class="col-time" /><col class="col-type" /><col class="col-name" /><col class="col-model" /><col class="col-tokens" /><col class="col-cost" /><col class="col-latency" /><col class="col-status" /></colgroup>
  <thead>
    <tr>
      <th>Time</th>
      <th>Type</th>
      <th>Name</th>
      <th>Model</th>
      <th>Tokens</th>
      <th>Cost</th>
      <th>Latency</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody id="tracesBody" data-testid="traces-body">
    {#if traces.length === 0}
      <tr>
        <td colspan="8"
          ><EmptyState
            message="No traces found. Send requests through the proxy on port 8080"
          /></td
        >
      </tr>
    {:else}
      {#each traces as trace (trace.id)}
        <tr
          class="trace-row"
          class:selected={trace.id === selectedTraceId.value}
          data-testid="trace-row"
          data-trace-id={trace.id}
          onclick={() => handleRowClick(trace)}
          onkeydown={(e) => handleKeyDown(e, trace)}
          tabindex="0"
          role="button"
        >
          <td class="trace-time" data-testid="trace-time"><time datetime={formatUtcIso(trace.timestamp)} title={`UTC: ${formatUtcIso(trace.timestamp)}`}>{formatLocalIso(trace.timestamp)}</time></td>
          <td data-testid="trace-type">
            <span class="span-badge span-{getSpanTypeClass(trace.span_type)}">
              {trace.span_type || 'LLM'}
            </span>
          </td>
          <td data-testid="trace-name"><span class="trace-name" title={trace.span_name || trace.service_name || trace.model || 'Unnamed span'}>{trace.span_name || trace.service_name || trace.model || 'Unnamed span'}</span></td>
          <td data-testid="trace-model"><span class="trace-model" title={trace.model || ''}>{trace.model || '—'}</span></td>
          <td data-testid="trace-tokens"
            >{trace.total_tokens ? formatNumber(trace.total_tokens) : '—'}</td
          >
          <td data-testid="trace-cost"
            >{trace.estimated_cost ? formatCost(trace.estimated_cost) : '—'}</td
          >
          <td data-testid="trace-latency"
            >{trace.duration_ms != null ? formatLatency(trace.duration_ms) : '—'}</td
          >
          <td data-testid="trace-status">
            {#if trace.error}
              <span class="status-error">Error</span>
            {:else if trace.status && trace.status >= 400}
              <span class="status-error">{trace.status}</span>
            {:else if trace.status}
              <span class="status-success">OK</span>
            {:else}
              <span class="trace-muted">—</span>
            {/if}
          </td>
        </tr>
      {/each}
    {/if}
  </tbody>
</table>

<style>
  .trace-table { min-width: 1100px; table-layout: fixed; }
  .col-time { width: 246px; }
  .col-type { width: 92px; }
  .col-name { width: auto; }
  .col-model { width: 150px; }
  .col-tokens { width: 84px; }
  .col-cost { width: 88px; }
  .col-latency { width: 94px; }
  .col-status { width: 80px; }
  .trace-table :global(th), .trace-table :global(td) { white-space: nowrap; }
  .trace-time { font-variant-numeric: tabular-nums; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 11px; }
  .trace-name, .trace-model { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .trace-name { font-weight: 600; }
  .trace-model, .trace-muted { color: var(--text-secondary); }
  .trace-table :global(tr.trace-row) { height: 42px; }
  .trace-table :global(tr.trace-row.selected) { box-shadow: inset 3px 0 var(--accent-primary); }
</style>
