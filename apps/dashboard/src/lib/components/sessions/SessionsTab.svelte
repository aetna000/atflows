<script lang="ts">
  import { onMount } from 'svelte'
  import { sessionsState, loadSessions } from '$lib/stores/sessions.svelte'
  import { setTab } from '$lib/stores/tabs.svelte'
  import { downloadJson } from '$lib/utils/export'
  import { authAccount } from '$lib/stores/auth.svelte'
  import SessionList from './SessionList.svelte'
  import SessionDetail from './SessionDetail.svelte'

  let view = $state<'list' | 'detail'>('list')

  onMount(() => loadSessions())

  function openSession(_id: string) {
    view = 'detail'
  }

  function openTrace(traceId: string) {
    // Cross-tab navigation: jump to Traces tab.
    // (Selecting the specific trace is left to the existing TracesTab —
    //  setting the hash gives a hook for that integration later.)
    setTab('traces')
    window.location.hash = `#traces?trace=${encodeURIComponent(traceId)}`
  }
</script>

<div class="sessions-tab">
  {#if authAccount.value?.role === 'evidence_collector' || authAccount.value?.role === 'administrator'}<div class="session-export"><button type="button" class="btn-secondary" onclick={() => downloadJson(view === 'detail' ? 'session-detail' : 'sessions', view === 'detail' ? sessionsState.selected : { records: sessionsState.list, total: sessionsState.total })} disabled={view === 'detail' ? !sessionsState.selected : sessionsState.list.length === 0}>Export JSON</button></div>{/if}
  {#if view === 'list'}
    <SessionList onSelect={openSession} />
  {:else}
    <button class="back" onclick={() => (view = 'list')}>← back to sessions</button>
    <SessionDetail onOpenTrace={openTrace} />
  {/if}
</div>

<style>
  .sessions-tab {
    height: 100%;
    overflow: auto;
  }
  .session-export { display: flex; justify-content: flex-end; padding: 8px 16px; }
  .back {
    background: none;
    border: 0;
    padding: 8px 16px;
    cursor: pointer;
    font-size: 12px;
    color: var(--muted);
  }
</style>
