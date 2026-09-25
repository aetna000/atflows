<script lang="ts">
  import { onMount } from 'svelte'
  import { api } from '$lib/api/client'
  type Workflow = { workflow_id: string; runs: number; attempts: number; retries: number; recovery_attempts: number; known_cost_microusd: number; known_extra_cost_microusd:number; unknown_cost_attempts: number; events: {event_id:string; event:string; operation_id:string; run_id:string; time:number}[] }
  let workflows = $state<Workflow[]>([])
  let error = $state('')
  let loading = $state(true)
  let requestNumber = 0
  async function refresh() {
    const request = ++requestNumber
    try { const result = await api.get<{workflows:Workflow[]}>('/api/continuity'); if (request === requestNumber) { workflows = result.workflows; error = '' } }
    catch { if (request === requestNumber) { workflows = []; error = 'Recovery history is unavailable. Check your connection and access.' } }
    finally { if (request === requestNumber) loading = false }
  }
  onMount(() => { refresh(); const timer = setInterval(refresh, 15000); return () => clearInterval(timer) })
</script>

<section class="continuity">
  <header><div><h2>Resume work</h2><p>What restarted, what was retried, and what it cost.</p></div><button class="btn-secondary" onclick={refresh}>Refresh</button></header>
  {#if error}<p role="alert">{error}</p>{:else if loading}<p>Loading recovery history…</p>{:else if !workflows.length}
    <p>No recovery events received yet. Connect your agent's AtMem continuity observer to this AtFlows instance.</p>
    <p>AtMem decides whether work may continue. AtFlows records the attempts; it does not execute or approve them.</p>
  {/if}
  {#each workflows as workflow}
    <article>
      <h3>{workflow.workflow_id}</h3>
      <p>{workflow.runs} runs · {workflow.attempts} attempts · {workflow.retries} retries · {workflow.recovery_attempts} recovery attempts</p>
      <p><strong>${(workflow.known_cost_microusd / 1000000).toFixed(6)} known estimated cost</strong> + {workflow.unknown_cost_attempts} attempts with missing prices.</p>
      <p>Of the known cost, ${(workflow.known_extra_cost_microusd / 1000000).toFixed(6)} came from retry or recovery attempts.</p>
      <p class="muted">Reported charges only, not a complete bill. Retry and recovery can overlap; a charge is counted once. History includes received events only.</p>
      <details><summary>See attempts and timing</summary>
        <div class="table-scroll"><table><thead><tr><th>Local time</th><th>What happened</th><th>Operation</th><th>Run</th></tr></thead><tbody>
          {#each workflow.events as event}<tr><td>{new Date(event.time * 1000).toLocaleString()}</td><td>{event.event === 'unknown' ? 'Needs confirmation' : event.event === 'completed' ? 'Completion reported' : event.event === 'query' ? 'Checking previous action' : event.event === 'execute' ? 'Attempt started' : event.event}</td><td>{event.operation_id}</td><td>{event.run_id}</td></tr>{/each}
        </tbody></table></div>
      </details>
    </article>
  {/each}
</section>

<style>
  .continuity { padding: 20px; overflow: auto; height: 100%; }
  header { display: flex; justify-content: space-between; gap: 16px; align-items: start; }
  h2 { font-size: 20px; margin: 0 0 8px; } h3 { font-size: 15px; overflow-wrap: anywhere; }
  p { font-size: 14px; line-height: 1.5; } .muted { color: var(--muted); }
  article { border-top: 1px solid var(--border, #526465); padding: 16px 0; }
  summary { cursor: pointer; padding: 8px 0; } .table-scroll { overflow-x: auto; }
  table { border-collapse: collapse; font-size: 13px; width: 100%; }
  th, td { text-align: left; padding: 8px; border-bottom: 1px solid var(--border, #526465); }
</style>
