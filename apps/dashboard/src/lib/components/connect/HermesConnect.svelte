<script lang="ts">
  import { onMount } from 'svelte'
  let home = $state('')
  let status = $state<any>(null)
  let preview = $state<any>(null)
  let busy = $state(false)
  let message = $state('')
  async function request(action: string, body?: unknown) {
    const response = await fetch(`/api/integrations/hermes/${action}${action === 'status' && home ? `?home=${encodeURIComponent(home)}` : ''}`, body === undefined ? {} : {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-AtFlows-Action': 'configure-hermes' }, body: JSON.stringify(body),
    })
    const value = await response.json()
    if (!response.ok) throw Error(String(value.error || 'Request failed').replaceAll('_', ' '))
    return value
  }
  async function act(action: string) {
    busy = true; message = ''
    try {
      if (action === 'status') status = await request('status')
      if (action === 'preview') preview = await request('preview', home ? { home } : {})
      if (action === 'apply' || action === 'undo') {
        await request(action, action === 'apply' ? { preview_id: preview.preview_id } : home ? { home } : {})
        preview = null
        status = await request('status')
        message = 'Saved. Restart Hermes, run a conversation, then check again.'
      }
    } catch (error) { message = (error as Error).message }
    finally { busy = false }
  }
  onMount(() => { void act('status') })
</script>

<section aria-label="Hermes connection" class="hermes-connect">
  <h3>Connect local Hermes</h3>
  <p>Your model and memory provider stay unchanged. Only call and tool metadata is sent.</p>
  <label>Hermes Home (optional)<input bind:value={home} oninput={() => { preview = null; status = null }} placeholder="Default Hermes Home" /></label>
  <div class="actions">
    <button disabled={busy} onclick={() => act('status')}>Check Hermes connection</button>
    <button disabled={busy} onclick={() => act('preview')}>Review Hermes setup</button>
  </div>
  {#if message}<p role="status">{message}</p>{/if}
  {#if status}
    <p><strong>{String(status.state).replaceAll('_', ' ')}</strong></p>
    {#if status.endpoint}<p>Receiver: <code>{status.endpoint}</code></p>{/if}
    {#if status.state === 'awaiting_traffic'}<p>Configured, but no event received yet. Restart Hermes and send a message.</p>{/if}
    {#if status.summary}
      <p>Counts cover retained events (up to 10,000 across connections), not lifetime totals.</p>
      {#if status.summary.last_event}<p>Last event: {new Date(status.summary.last_event).toLocaleString()}. Re-check with a new conversation after upgrading Hermes.</p>{/if}
      <dl>
        <div><dt>Sessions</dt><dd>{status.summary.sessions}</dd></div>
        <div><dt>Model attempts</dt><dd>{status.summary.calls}</dd></div>
        <div><dt>Failed attempts</dt><dd>{status.summary.failures}</dd></div>
        <div><dt>Tool calls</dt><dd>{status.summary.tools}</dd></div>
      </dl>
      <p>Reported tokens: {status.summary.input_tokens + status.summary.output_tokens}. Usage missing for {status.summary.unknown_usage} attempts. Cost: unknown.</p>
      <p>Dropped events: {Math.max(status.summary.dropped_total, status.observer?.dropped || 0)}. Open Timeline → Hermes events to inspect calls and group activity.</p>
      <p>Native Hermes events are shown in Timeline and here; legacy Stats and Costs totals exclude them.</p>
      <button disabled={busy} onclick={() => { if (window.confirm('Undo the AtFlows setup and revoke its observer credential? Hermes must restart.')) void act('undo') }}>Undo Hermes setup</button>
    {/if}
  {/if}
  {#if preview}
    <h4>Review before applying</h4>
    <p>{preview.home} → {preview.endpoint}</p>
    <ul>{#each preview.changes as change}<li>{change}</li>{/each}</ul>
    <p>{preview.capture}</p>
    <button disabled={busy} onclick={() => act('apply')}>Apply Hermes setup</button>
  {/if}
</section>

<style>
  .hermes-connect { border-top: 1px solid var(--border-primary); padding-top: 16px; }
  p, label, li { color: var(--text-secondary); font-size: 14px; }
  label { display: grid; gap: 6px; }
  input, button { padding: 8px 12px; border: 1px solid var(--border-primary); color: var(--text-primary); background: var(--bg-secondary); font: inherit; }
  .actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
  button { cursor: pointer; } button:disabled { opacity: .5; }
  dl { display: flex; flex-wrap: wrap; gap: 24px; } dd { margin: 4px 0; font-size: 20px; }
</style>
