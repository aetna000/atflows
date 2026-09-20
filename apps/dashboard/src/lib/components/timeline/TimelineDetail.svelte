<script lang="ts">
  import { selectedItem, selectedItemData, relatedLogs } from '$lib/stores/timeline.svelte'
  import JsonCode from '$lib/components/shared/JsonCode.svelte'
  import { downloadJson } from '$lib/utils/export'
  import { authAccount } from '$lib/stores/auth.svelte'
</script>

<div class="panel-right" data-testid="timeline-detail-panel">
  <div class="detail-header">
    <h2 data-testid="timeline-detail-title">
      {#if selectedItem.value}
        {selectedItem.value.title}
      {:else}
        Select an item
      {/if}
    </h2>
    <span class="detail-meta" data-testid="timeline-detail-meta">
      {#if selectedItem.value}
        {[selectedItem.value.type, selectedItem.value.model, selectedItem.value.service_name]
          .filter(Boolean)
          .join(' · ')}
      {/if}
    </span>
    {#if selectedItem.value && (authAccount.value?.role === 'evidence_collector' || authAccount.value?.role === 'administrator')}
      <button type="button" class="btn-secondary" onclick={() => downloadJson('timeline-detail', { item: selectedItem.value, detail: selectedItemData.value, related_logs: relatedLogs })}>Export JSON</button>
    {/if}
  </div>
  <div class="detail-body">
    <div class="detail-section">
      <JsonCode text={JSON.stringify(selectedItemData.value || {}, null, 2)} testId="timeline-detail-data" />
    </div>
    {#if relatedLogs.length > 0}
      <div class="detail-section">
        <h3>Related Logs</h3>
        <div data-testid="related-logs">
          {#each relatedLogs as log}
            <div class="related-log-item">
              <JsonCode text={JSON.stringify(log, null, 2)} />
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .related-log-item {
    padding: 8px;
    background: var(--bg-tertiary);
    border-radius: 4px;
    margin-bottom: 8px;
  }

</style>
