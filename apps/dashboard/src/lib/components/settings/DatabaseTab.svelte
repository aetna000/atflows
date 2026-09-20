<script lang="ts">
  import { onMount } from 'svelte'
  import { api } from '$lib/api/client'

  type DatabaseSettings = {
    engine: string
    location: string
    data_directory: string
    configured_by: 'default' | 'DATA_DIR' | 'DB_PATH'
    external_database_supported: boolean
  }

  let settings = $state<DatabaseSettings | null>(null)
  let error = $state('')

  onMount(async () => {
    try {
      settings = await api.get<DatabaseSettings>('/api/settings/database')
    } catch {
      error = 'Could not load database settings.'
    }
  })
</script>

<section class="database-settings" data-testid="database-tab">
  <div class="database-intro">
    <h2>Database</h2>
    <p>Where this AtFlows server stores traces, logs, metrics, and connections.</p>
  </div>
  {#if error}
    <p role="alert">{error}</p>
  {:else if settings}
    <div class="database-card">
      <div class="database-field"><span>Current database</span><strong>{settings.engine}</strong></div>
      <div class="database-field"><span>Database file</span><code>{settings.location}</code></div>
      <div class="database-field"><span>Data directory</span><code>{settings.data_directory}</code></div>
      <div class="database-field"><span>Path source</span><strong>{settings.configured_by === 'default' ? 'Default location' : settings.configured_by + ' environment variable'}</strong></div>
    </div>
    <p class="database-note">External databases are planned. This page shows the active storage location; database changes are not available here yet.</p>
  {:else}
    <p>Loading database settings…</p>
  {/if}
</section>

<style>
  .database-settings { padding: 16px 8px 32px; max-width: 900px; }
  .database-intro { margin-bottom: 18px; }
  h2 { margin: 0 0 6px; color: var(--text-primary); font-size: 22px; }
  p { margin: 0; color: var(--text-secondary); }
  .database-card { border: 1px solid var(--border-primary); background: var(--bg-secondary); }
  .database-field { display: grid; grid-template-columns: 160px minmax(0, 1fr); gap: 12px; padding: 13px 16px; border-bottom: 1px solid var(--border-primary); }
  .database-field:last-child { border-bottom: 0; }
  .database-field span { color: var(--text-secondary); }
  .database-field strong { color: var(--text-primary); font-weight: 600; }
  .database-field code { color: var(--accent-primary); overflow-wrap: anywhere; }
  .database-note { margin-top: 16px; }
  @media (max-width: 640px) { .database-field { grid-template-columns: 1fr; gap: 4px; } }
</style>
