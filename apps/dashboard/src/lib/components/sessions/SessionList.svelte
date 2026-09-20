<script lang="ts">
  import { sessionsState, loadSession } from '$lib/stores/sessions.svelte'
  import { formatLocalIso, formatUtcIso } from '$lib/utils/format'

  interface Props {
    onSelect: (id: string) => void
  }

  let { onSelect }: Props = $props()

</script>

<table class="sessions-table">
  <thead>
    <tr>
      <th>Session</th>
      <th>Agent / Service</th>
      <th>Traces</th>
      <th>Tokens</th>
      <th>Cost</th>
      <th>Last seen</th>
    </tr>
  </thead>
  <tbody>
    {#each sessionsState.list as s (s.session_id)}
      <tr
        onclick={() => {
          loadSession(s.session_id)
          onSelect(s.session_id)
        }}
      >
        <td class="mono">{s.session_id}</td>
        <td>{s.agent_name ?? s.service_name ?? '—'}</td>
        <td>{s.trace_count}</td>
        <td>{s.total_tokens.toLocaleString()}</td>
        <td>${s.total_cost.toFixed(4)}</td>
        <td><time datetime={formatUtcIso(s.last_seen)} title={`UTC: ${formatUtcIso(s.last_seen)}`}>{formatLocalIso(s.last_seen)}</time></td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  .sessions-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  th,
  td {
    padding: 8px 12px;
    text-align: left;
    border-bottom: 1px solid var(--row-border);
  }
  th {
    font-weight: 600;
    color: var(--muted);
  }
  tbody tr {
    cursor: pointer;
  }
  tbody tr:hover {
    background: var(--row-hover);
  }
  .mono {
    font-family: var(--font-mono);
    font-size: 12px;
  }
</style>
