<script lang="ts">
  import type { TimelineItem } from '$lib/stores/timeline.svelte'
  import { groupEvents, type EventGrouping } from '$lib/utils/event-groups'
  let { items, by = $bindable('tool'), selected = $bindable('') }: {
    items: TimelineItem[]; by: EventGrouping; selected: string
  } = $props()
  let groups = $derived(groupEvents(items, by))
  let max = $derived(Math.max(1, ...groups.map(group => group.count)))
  function label(key: string) {
    return by === 'hour' && key !== 'Not recorded'
      ? new Date(key).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : key
  }
</script>

<section class="event-groups" aria-label="Event overview">
  <div class="group-heading">
    <h2>Event overview</h2>
    <label>Group by <select bind:value={by} onchange={() => selected = ''}>
      <option value="tool">Tool</option><option value="service_name">Service</option>
      <option value="model">Model</option><option value="type">Event type</option>
      <option value="hour">Hour</option>
    </select></label>
  </div>
  <p>{items.length} loaded events · Latest 100 matching your filters, not all-history totals. Click a bar to inspect its events. Hours use local time.</p>
  {#if groups.length === 0}<p>No matching events yet.</p>{/if}
  <div class="group-bars">
    {#each groups as group (group.key)}
      <button class:chosen={selected === group.key} aria-pressed={selected === group.key}
        onclick={() => selected = selected === group.key ? '' : group.key}
        aria-label={`${label(group.key)}: ${group.count} events`}>
        <span class="group-label" title={label(group.key)}>{label(group.key)}</span>
        <span class="track" aria-hidden="true"><span style:width={`${group.count / max * 100}%`}></span></span>
        <strong>{group.count}</strong>
      </button>
    {/each}
  </div>
  {#if selected}<button class="btn-secondary" onclick={() => selected = ''}>Show all loaded events</button>{/if}
</section>

<style>
  .event-groups { margin: 0 0 16px; padding: 16px; border: 1px solid var(--border-primary); }
  .group-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  h2 { font-size: 18px; } p { font-size: 12px; color: var(--text-secondary); margin: 8px 0; }
  select { background: var(--bg-primary); color: var(--text-primary); border: 1px solid var(--border-secondary); padding: 6px; }
  .group-bars { max-height: 240px; overflow: auto; margin-bottom: 8px; }
  .group-bars button { display: grid; grid-template-columns: minmax(90px, 1fr) 2fr 40px; gap: 12px; align-items: center; width: 100%; padding: 7px; background: transparent; color: var(--text-primary); border: 1px solid transparent; text-align: left; cursor: pointer; }
  .group-bars button:hover, .group-bars button.chosen { background: var(--bg-selected); border-color: var(--accent-primary); }
  .group-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .track { height: 14px; background: var(--bg-tertiary); }
  .track span { display: block; height: 100%; background: var(--accent-primary); }
  strong { font-family: var(--font-mono); text-align: right; }
</style>
