<script lang="ts">
  import { onMount } from 'svelte'
  import { api } from '$lib/api/client'

  interface Integration {
    id: string
    name: string
    category: string
    mode: string
    status: 'available' | 'needs-validation' | 'planned'
    summary: string
    captures: string
    prerequisite: string
    guide: string
    endpoint?: string
    steps: string[]
    snippet?: string
    canAutoConfigure: boolean
  }

  let integrations = $state<Integration[]>([])
  let selectedId = $state('codex-cli')
  let query = $state('')
  let error = $state('')
  let copiedField = $state('')
  let localControlsError = $state('')
  let codexStatus = $state<{ config_path: string; config_found: boolean; configured: boolean; managed: boolean; endpoint_stale: boolean; latest_change_id: string | null; last_event: { signal: string; timestamp: number } | null; connection: { nickname: string | null; models: string[] } } | null>(null)
  let nickname = $state('')
  let preview = $state<{ preview_id: string; config_path: string; settings: string; changed: boolean } | null>(null)
  let changeId = $state('')
  let setupBusy = $state(false)
  let setupMessage = $state('')

  let filtered = $derived(integrations.filter((item) =>
    `${item.name} ${item.category} ${item.mode}`.toLowerCase().includes(query.toLowerCase()),
  ))
  let selected = $derived(integrations.find((item) => item.id === selectedId))

  onMount(async () => {
    try {
      const response = await api.get<{ integrations: Integration[] }>('/api/integrations')
      integrations = response.integrations
      try {
        const status = await api.get<NonNullable<typeof codexStatus>>('/api/integrations/codex-cli/status')
        codexStatus = status
        nickname = status.connection.nickname || ''
        changeId = status.latest_change_id || ''
      } catch {
        localControlsError = 'Automatic Codex setup is available only when this dashboard is opened on the computer running AtFlows. Use the guide for manual setup.'
      }
    } catch {
      error = 'Could not load integration guidance. Check that AtFlows is running.'
    }
  })

  async function copy(value: string, field: string) {
    try {
      await navigator.clipboard.writeText(value)
      copiedField = field
      window.setTimeout(() => (copiedField = ''), 2000)
    } catch {
      error = 'Clipboard access failed. Select and copy the text below.'
    }
  }

  function statusLabel(status: Integration['status']) {
    if (status === 'available') return 'Available'
    if (status === 'needs-validation') return 'Needs validation'
    return 'Planned'
  }

  async function setupPost<T>(action: 'preview' | 'apply' | 'undo' | 'nickname', body: unknown): Promise<T> {
    const response = await fetch(`/api/integrations/codex-cli/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-AtFlows-Action': 'configure-codex' },
      body: JSON.stringify(body),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Configuration failed')
    return result
  }

  async function previewCodex() {
    setupBusy = true
    setupMessage = ''
    try {
      preview = await setupPost('preview', {})
      if (preview && !preview.changed) setupMessage = 'Codex is already configured for this AtFlows endpoint.'
    } catch (cause) {
      setupMessage = (cause as Error).message
    } finally {
      setupBusy = false
    }
  }

  async function applyCodex() {
    if (!preview?.changed) return
    setupBusy = true
    setupMessage = ''
    try {
      const result = await setupPost<{ applied: boolean; change_id: string | null }>('apply', { preview_id: preview.preview_id })
      if (result.change_id) {
        changeId = result.change_id
      }
      codexStatus = await api.get('/api/integrations/codex-cli/status')
      preview = null
      setupMessage = 'Codex configured. Restart Codex, run a new session, then check Logs and Traces.'
    } catch (cause) {
      setupMessage = (cause as Error).message
    } finally {
      setupBusy = false
    }
  }

  async function undoCodex() {
    if (!changeId || !window.confirm('Remove the AtFlows Codex configuration from this file?')) return
    setupBusy = true
    setupMessage = ''
    try {
      await setupPost('undo', { change_id: changeId })
      changeId = ''
      codexStatus = await api.get('/api/integrations/codex-cli/status')
      setupMessage = 'AtFlows settings removed. Restart Codex to stop exporting here.'
    } catch (cause) {
      setupMessage = (cause as Error).message
    } finally {
      setupBusy = false
    }
  }

  async function saveNickname() {
    setupBusy = true
    setupMessage = ''
    try {
      await setupPost('nickname', { nickname })
      codexStatus = await api.get('/api/integrations/codex-cli/status')
      setupMessage = 'Connection name saved. It stays the same when Codex changes models.'
    } catch (cause) {
      setupMessage = (cause as Error).message
    } finally {
      setupBusy = false
    }
  }
</script>

<section class="connect-layout" data-testid="connect-tab">
  <div class="connect-intro">
    <h2>Connect a tool</h2>
    <p>Choose your tool. AtFlows shows the recommended route and the exact address for this running server.</p>
  </div>

  {#if error}<p class="connect-error" role="alert">{error}</p>{/if}
  {#if localControlsError}<p class="connect-error" role="status">{localControlsError}</p>{/if}

  <div class="connect-columns">
    <aside class="connect-list">
      <label for="connect-search">Find a tool or provider</label>
      <input id="connect-search" type="search" placeholder="Codex, OpenClaw, OpenAI…" bind:value={query} />
      {#each filtered as item (item.id)}
        <button type="button" class:selected={selectedId === item.id} onclick={() => (selectedId = item.id)}>
          <span>{item.name}</span>
          <small>{item.category} · {statusLabel(item.status)}</small>
        </button>
      {/each}
      {#if integrations.length && !filtered.length}<p>No matching integrations.</p>{/if}
    </aside>

    <div class="connect-detail">
      {#if selected}
        <div class="connect-heading">
          <div>
            <h3>{selected.name}</h3>
            <p>{selected.summary}</p>
          </div>
          <span class="connect-badge" class:pending={selected.status !== 'available'}>{statusLabel(selected.status)}</span>
        </div>

        <div class="connect-facts">
          <div><strong>Recommended route</strong><span>{selected.mode === 'telemetry' ? 'Telemetry export' : selected.mode === 'proxy' ? 'Model proxy' : selected.mode === 'export' ? 'Outbound export' : 'SDK spans'}</span></div>
          <div><strong>What appears</strong><span>{selected.captures}</span></div>
          <div><strong>Before you start</strong><span>{selected.prerequisite}</span></div>
        </div>

        {#if selected.id === 'codex-cli' && codexStatus}
          <div class="connect-path">
            <strong>Your Codex configuration file</strong>
            <code>{codexStatus.config_path}</code>
            <small>{codexStatus.config_found ? 'File found' : 'File will be created when you configure Codex'} · User-level file, not this project’s .codex folder</small>
            <details>
              <summary>File locations on other systems</summary>
              <ul>
                <li>macOS and Linux: <code>~/.codex/config.toml</code></li>
                <li>Native Windows: <code>%USERPROFILE%\.codex\config.toml</code></li>
                <li>WSL: <code>~/.codex/config.toml</code> inside the Linux distribution</li>
                <li>If <code>CODEX_HOME</code> is set, use <code>config.toml</code> inside that directory.</li>
              </ul>
            </details>
          </div>
          <div class="connect-path">
            <strong>Connection check</strong>
            <span>{codexStatus.configured ? 'Configuration points to this AtFlows server.' : codexStatus.endpoint_stale ? 'Configuration points to an old AtFlows port. Preview an update.' : 'Codex is not configured for this AtFlows server.'}</span>
            {#if codexStatus.last_event}
              <span>Last Codex {codexStatus.last_event.signal} event: {new Date(codexStatus.last_event.timestamp).toLocaleString()}</span>
            {:else}
              <span>AtFlows is ready; no Codex event has arrived yet. Restart Codex and run a new session.</span>
            {/if}
          </div>
          <div class="connect-path">
            <strong>Name this Codex connection</strong>
            <div class="connect-name-row">
              <label for="codex-connection-name">Connection name</label>
              <input id="codex-connection-name" type="text" maxlength="80" placeholder="My coding Codex" bind:value={nickname} />
              <button type="button" onclick={saveNickname} disabled={setupBusy}>Save name</button>
            </div>
            <small>The name groups this local Codex service. Its model remains separate on each trace. If several Codex installations export here, this source name alone cannot distinguish them.</small>
            {#if codexStatus.connection.models.length}
              <span>Models seen: {codexStatus.connection.models.join(', ')}</span>
            {/if}
          </div>
          <div class="connect-setup">
            {#if !codexStatus.configured || codexStatus.managed}
              <button type="button" onclick={previewCodex} disabled={setupBusy}>Review Codex setup</button>
            {:else}
              <p>Codex already points here through settings you manage. AtFlows will leave that configuration untouched.</p>
            {/if}
            {#if changeId}<button type="button" onclick={undoCodex} disabled={setupBusy}>Undo AtFlows setup</button>{/if}
            {#if setupMessage}<p role="status">{setupMessage}</p>{/if}
            {#if preview}
              <p>AtFlows will edit only its marked telemetry block in <code>{preview.config_path}</code>. A protected backup will be saved for 30 days. The updated file will be readable only by your account. Prompts remain excluded.</p>
              <pre>{preview.settings}</pre>
              {#if preview.changed}<button type="button" onclick={applyCodex} disabled={setupBusy}>Apply this change</button>{/if}
            {/if}
          </div>
        {/if}

        <ol class="connect-steps">
          {#each selected.steps as step}<li>{step}</li>{/each}
        </ol>

        {#if selected.endpoint}
          <div class="connect-copy">
            <strong>Address</strong>
            <code>{selected.endpoint}</code>
            <button type="button" onclick={() => copy(selected.endpoint!, 'address')}>{copiedField === 'address' ? 'Copied' : 'Copy address'}</button>
          </div>
        {/if}
        {#if selected.snippet}
          <div class="connect-copy">
            <strong>Configuration example</strong>
            <pre>{selected.snippet}</pre>
            <button type="button" onclick={() => copy(selected.snippet!, 'example')}>{copiedField === 'example' ? 'Copied' : 'Copy example'}</button>
          </div>
        {/if}

        <a class="connect-guide" href={selected.guide} target="_blank" rel="noopener noreferrer">Read the full setup guide ↗</a>
      {:else}
        <p>Loading integrations…</p>
      {/if}
    </div>
  </div>
</section>

<style>
  .connect-layout { padding: 16px 8px 32px; }
  .connect-intro { margin-bottom: 18px; }
  h2, h3 { color: var(--text-primary); margin: 0 0 6px; }
  h2 { font-size: 22px; }
  h3 { font-size: 18px; }
  p { color: var(--text-secondary); margin: 0; line-height: 1.5; }
  .connect-error { color: var(--error); margin-bottom: 12px; }
  .connect-columns { display: grid; grid-template-columns: minmax(220px, 280px) minmax(0, 1fr); gap: 16px; }
  .connect-list, .connect-detail { border: 1px solid var(--border-primary); background: var(--bg-secondary); padding: 16px; }
  .connect-list { display: flex; flex-direction: column; gap: 6px; max-height: 72vh; overflow: auto; }
  .connect-list label, .connect-copy strong, .connect-path strong { font-size: 12px; color: var(--text-tertiary); }
  .connect-list input { padding: 8px; background: var(--bg-primary); border: 1px solid var(--border-primary); color: var(--text-primary); margin-bottom: 8px; }
  .connect-list button { display: flex; flex-direction: column; text-align: left; gap: 3px; background: transparent; border: 1px solid transparent; color: var(--text-primary); padding: 9px; cursor: pointer; font: inherit; }
  .connect-list button:hover, .connect-list button.selected { border-color: var(--accent-primary); background: var(--bg-tertiary); }
  .connect-list small { color: var(--text-tertiary); }
  .connect-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 18px; }
  .connect-badge { color: var(--accent-primary); font-size: 11px; border: 1px solid currentColor; padding: 4px 7px; white-space: nowrap; }
  .connect-badge.pending { color: var(--text-tertiary); }
  .connect-facts { display: grid; gap: 12px; margin-bottom: 18px; }
  .connect-facts div { display: grid; grid-template-columns: 145px 1fr; gap: 10px; }
  .connect-facts strong { color: var(--text-tertiary); font-size: 12px; }
  .connect-facts span { color: var(--text-primary); font-size: 13px; }
  .connect-path, .connect-copy { display: flex; flex-direction: column; gap: 8px; padding: 12px; border: 1px solid var(--border-primary); margin-bottom: 12px; color: var(--text-primary); }
  .connect-path code, .connect-copy code, .connect-copy pre { display: block; overflow-x: auto; overflow-wrap: anywhere; background: var(--bg-primary); padding: 9px; color: var(--accent-primary); font-size: 12px; }
  .connect-path small { color: var(--text-tertiary); }
  .connect-path details { color: var(--text-secondary); font-size: 12px; }
  .connect-path summary { cursor: pointer; }
  .connect-path li { margin-top: 6px; }
  .connect-name-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .connect-name-row input { min-width: 200px; padding: 7px; background: var(--bg-primary); border: 1px solid var(--border-primary); color: var(--text-primary); }
  .connect-name-row button { padding: 7px 10px; background: var(--bg-tertiary); border: 1px solid var(--border-primary); color: var(--text-primary); cursor: pointer; }
  .connect-setup { border: 1px solid var(--accent-primary); padding: 12px; margin-bottom: 16px; display: flex; flex-wrap: wrap; gap: 10px; }
  .connect-setup button { padding: 7px 10px; border: 1px solid var(--accent-primary); background: var(--bg-tertiary); color: var(--text-primary); cursor: pointer; }
  .connect-setup button:disabled { opacity: .5; cursor: default; }
  .connect-setup p, .connect-setup pre { width: 100%; }
  .connect-setup pre { overflow-x: auto; background: var(--bg-primary); padding: 10px; color: var(--accent-primary); font-size: 12px; }
  .connect-copy button { align-self: flex-start; padding: 6px 10px; background: var(--bg-tertiary); border: 1px solid var(--border-primary); color: var(--text-primary); cursor: pointer; }
  .connect-copy button:hover { border-color: var(--accent-primary); }
  .connect-steps { color: var(--text-primary); line-height: 1.7; padding-left: 22px; margin: 0 0 16px; }
  .connect-guide { color: var(--accent-primary); }
  @media (max-width: 760px) { .connect-columns { grid-template-columns: 1fr; } .connect-list { max-height: 260px; } .connect-facts div { grid-template-columns: 1fr; gap: 2px; } }
</style>
