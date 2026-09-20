<script lang="ts">
  import SpanWaterfall from '$lib/components/trace-viewer/SpanWaterfall.svelte'
  import SpanDetailPanel from '$lib/components/trace-viewer/SpanDetailPanel.svelte'
  import type { SpanInput } from '$lib/trace/viewport.svelte'
  import { formatLatency, formatNumber } from '$lib/utils/format'
  import { selectedTrace, type Span } from '$lib/stores/traces.svelte'

  let selectedId = $state<string | null>(null)
  let expanded = $state(false)
  const viewportSpans = $derived.by(() => {
    const result: SpanInput[] = []
    const visit = (span: Span) => {
      result.push({
        ...span,
        name: span.span_name || span.name || 'Unnamed span',
        start_time: span.start_time ?? span.timestamp ?? selectedTrace.value?.trace.timestamp ?? 0,
        duration_ms: span.duration_ms ?? 0,
      })
      span.children?.forEach(visit)
    }
    selectedTrace.value?.spans?.forEach(visit)
    return result
  })
  const selectedSpan = $derived(viewportSpans.find((span) => span.id === selectedId) ?? viewportSpans[0] ?? null)
</script>

<div class="trace-detail" class:expanded data-testid="traces-detail-panel">
  {#if selectedTrace.value && viewportSpans.length > 0}
    <div class="waterfall-pane">
      <div class="waterfall-chart" style:height="{Math.min(220, 24 + viewportSpans.length * 28)}px">
        <SpanWaterfall spans={viewportSpans} onSelect={(id) => (selectedId = id)} />
      </div>
      <div class="trace-overview">
        <div><span>Spans</span><strong>{viewportSpans.length}</strong></div>
        <div><span>Duration</span><strong>{formatLatency(selectedTrace.value.trace.duration_ms)}</strong></div>
        <div><span>Tokens</span><strong>{selectedTrace.value.trace.total_tokens ? formatNumber(selectedTrace.value.trace.total_tokens) : '—'}</strong></div>
        <div><span>Trace ID</span><code title={selectedTrace.value.trace.id}>{selectedTrace.value.trace.id.slice(0, 12)}…</code></div>
      </div>
    </div>
    <div class="detail-pane">
      <div class="detail-toolbar">
        <strong>Span details</strong>
        <button type="button" onclick={() => expanded = !expanded}>{expanded ? 'Show span tree' : 'Expand details'}</button>
      </div>
      <div class="detail-content"><SpanDetailPanel span={selectedSpan ? { ...selectedSpan } : null} /></div>
    </div>
  {:else}
    <div class="empty-state">
      {#if !selectedTrace.value}
        <p>Select a trace to view spans</p>
      {:else}
        <p>No spans found</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .trace-detail {
    display: grid;
    grid-template-columns: minmax(300px, 36%) minmax(0, 1fr);
    height: clamp(300px, 38vh, 420px);
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }
  .trace-detail.expanded { grid-template-columns: minmax(0, 1fr); }
  .trace-detail.expanded .waterfall-pane { display: none; }
  .waterfall-pane { min-height: 0; min-width: 0; overflow: auto; border-right: 1px solid var(--border-primary); }
  .waterfall-chart { min-height: 52px; max-height: 220px; overflow: hidden; }
  .trace-overview { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; padding: 14px 16px; border-top: 1px solid var(--border-primary); }
  .trace-overview div { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .trace-overview span { color: var(--text-secondary); font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
  .trace-overview strong, .trace-overview code { color: var(--text-primary); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .detail-pane { display: flex; flex-direction: column; min-height: 0; min-width: 0; overflow: hidden; }
  .detail-toolbar { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 36px; padding: 4px 12px; border-bottom: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-primary); font-size: 12px; }
  .detail-toolbar button { padding: 4px 8px; border: 1px solid var(--border-secondary); background: var(--bg-secondary); color: var(--text-primary); font: inherit; cursor: pointer; }
  .detail-toolbar button:hover { color: var(--accent-primary); border-color: var(--accent-primary); }
  .detail-content { flex: 1; min-height: 0; overflow: hidden; }
  @media (max-width: 800px) {
    .trace-detail { grid-template-columns: minmax(0, 1fr); grid-template-rows: 110px minmax(0, 1fr); height: 430px; }
    .trace-detail.expanded { grid-template-rows: minmax(0, 1fr); }
    .waterfall-pane { border-right: 0; border-bottom: 1px solid var(--border-primary); }
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--muted);
    font-size: 14px;
  }
</style>
