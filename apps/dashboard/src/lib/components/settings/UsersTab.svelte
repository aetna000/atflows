<script lang="ts">
  import { onMount } from 'svelte'
  import { authAccount, type Account, type Role } from '$lib/stores/auth.svelte'
  import { formatLocalIso } from '$lib/utils/format'

  type AuditEvent = { recorded_at: string; actor: string; operation: string; subject: string }
  const roles: { value: Role; name: string; description: string }[] = [
    { value: 'viewer', name: 'Viewer', description: 'Aggregate metadata and trends' },
    { value: 'investigator', name: 'Investigator', description: 'Inspect traces, logs, and sessions' },
    { value: 'evidence_collector', name: 'Evidence Collector', description: 'Inspect and export activity' },
    { value: 'administrator', name: 'Administrator', description: 'All activity, settings, and users' },
  ]
  let users = $state<Account[]>([])
  let audit = $state<AuditEvent[]>([])
  let username = $state('')
  let displayName = $state('')
  let role = $state<Role>('viewer')
  let credential = $state<{ username: string; password: string } | null>(null)
  let error = $state('')
  let busy = $state(false)

  async function request<T>(url: string, body?: unknown): Promise<T> {
    const response = await fetch(url, body === undefined ? undefined : {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || `Request failed (${response.status})`)
    return result as T
  }
  async function load() {
    try {
      const [accounts, history] = await Promise.all([
        request<{ users: Account[] }>('/api/users'),
        request<{ events: AuditEvent[] }>('/api/users/audit'),
      ])
      users = accounts.users
      audit = history.events
      error = ''
    } catch (cause) { error = (cause as Error).message }
  }
  onMount(load)
  async function create(event: SubmitEvent) {
    event.preventDefault()
    if (busy) return
    busy = true
    try {
      const result = await request<{ temporary_password: string }>('/api/users/create', { username, display_name: displayName, role })
      credential = { username, password: result.temporary_password }
      username = ''
      displayName = ''
      role = 'viewer'
      await load()
    } catch (cause) { error = (cause as Error).message }
    finally { busy = false }
  }
  async function update(user: Account, changes: Record<string, unknown>) {
    if (busy) return
    busy = true
    try { await request('/api/users/update', { username: user.username, ...changes }); await load() }
    catch (cause) { error = (cause as Error).message }
    finally { busy = false }
  }
  async function reset(user: Account) {
    if (!confirm(`Reset ${user.username}'s password and sign out their active sessions?`)) return
    busy = true
    try {
      const result = await request<{ temporary_password: string }>('/api/users/reset-password', { username: user.username })
      credential = { username: user.username, password: result.temporary_password }
      await load()
    } catch (cause) { error = (cause as Error).message }
    finally { busy = false }
  }
</script>

<section class="users-settings">
  <div class="users-heading"><span class="eyebrow">Configuration</span><h2>Users &amp; access</h2><p>Accounts and roles</p></div>
  <div class="role-grid">
    {#each roles as option}
      <div class="role-card" class:active={authAccount.value?.role === option.value}>
        <strong>{option.name}</strong><span>{option.description}</span>
      </div>
    {/each}
  </div>
  <form class="create-user" onsubmit={create}>
    <label>Username<input required pattern="[a-zA-Z0-9][a-zA-Z0-9._-]*" maxlength="64" placeholder="auditor-1" bind:value={username} /></label>
    <label>Display name<input maxlength="100" placeholder="Audit team" bind:value={displayName} /></label>
    <label>Role<select bind:value={role}>{#each roles as option}<option value={option.value}>{option.name}</option>{/each}</select></label>
    <button type="submit" disabled={busy}>Create user</button>
  </form>
  {#if credential}
    <div class="credential" role="status">
      <div><strong>Temporary password for {credential.username}</strong><p>Copy it now. It will not be shown again. The user must change it at first sign-in.</p></div>
      <code>{credential.password}</code>
      <button type="button" onclick={() => navigator.clipboard.writeText(credential!.password)}>Copy</button>
      <button type="button" onclick={() => (credential = null)}>Done</button>
    </div>
  {/if}
  {#if error}<p class="users-error" role="alert">{error}</p>{/if}
  <div class="user-list">
    <h3>Accounts</h3>
    {#each users as user (user.username)}
      <div class="user-row">
        <div class="user-name"><strong>{user.display_name}</strong><span>{user.username} · {user.enabled ? 'Active' : 'Disabled'}{user.password_change_required ? ' · Password change required' : ''}</span></div>
        <div class="user-actions">
          <select aria-label={`Role for ${user.username}`} value={user.role} disabled={busy || user.username === 'administrator'} onchange={(event) => update(user, { role: event.currentTarget.value })}>{#each roles as option}<option value={option.value}>{option.name}</option>{/each}</select>
          <button type="button" disabled={busy || user.username === 'administrator'} onclick={() => update(user, { enabled: !user.enabled })}>{user.enabled ? 'Disable' : 'Enable'}</button>
          <button type="button" disabled={busy || user.username === authAccount.value?.username} onclick={() => reset(user)}>Reset password</button>
        </div>
      </div>
    {/each}
  </div>
  <details class="audit"><summary>Account security audit</summary>
    {#each [...audit].reverse() as event}<div>{formatLocalIso(event.recorded_at)} · {event.actor} · {event.operation.replace('_', ' ')} · {event.subject}</div>{/each}
    {#if audit.length === 0}<p>No account changes yet.</p>{/if}
  </details>
</section>

<style>
  .users-settings { padding: 24px; color: var(--text-primary); }
  .users-heading { border-bottom: 1px solid var(--border-secondary); padding-bottom: 18px; margin-bottom: 24px; }
  .eyebrow { color: var(--accent-primary); text-transform: uppercase; font: 800 11px ui-monospace, monospace; letter-spacing: .1em; }
  h2 { font: 700 26px ui-monospace, monospace; margin: 10px 0 4px; }
  .users-heading p, .role-card span, .user-name span, .credential p { color: var(--text-secondary); }
  .role-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
  .role-card { border: 1px solid var(--border-secondary); border-radius: 8px; padding: 16px; display: grid; gap: 8px; }
  .role-card.active { border-color: var(--accent-primary); background: var(--bg-selected); }
  .role-card strong { font-size: 16px; }
  .create-user { border: 1px solid var(--border-secondary); border-radius: 8px; padding: 16px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) auto; align-items: end; gap: 10px; }
  label { display: grid; gap: 6px; color: var(--text-secondary); font-weight: 600; }
  input, select, button { border: 1px solid var(--border-secondary); background: var(--bg-secondary); color: var(--text-primary); font: inherit; min-height: 38px; padding: 7px 10px; }
  button { cursor: pointer; white-space: nowrap; }
  button:hover:not(:disabled) { border-color: var(--accent-primary); }
  button:disabled { opacity: .5; cursor: default; }
  .create-user button[type=submit] { background: var(--accent-primary); color: var(--bg-primary); border-color: var(--accent-primary); font-weight: 700; }
  .credential { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; border: 1px solid var(--accent-primary); background: var(--bg-selected); padding: 14px; margin: 16px 0; }
  .credential div { flex: 1 1 260px; }
  .credential code { font-size: 14px; overflow-wrap: anywhere; }
  .users-error { color: var(--error); margin: 12px 0; }
  .user-list { margin-top: 24px; border: 1px solid var(--border-secondary); }
  .user-list h3 { padding: 12px 16px; border-bottom: 1px solid var(--border-secondary); }
  .user-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--border-primary); }
  .user-row:last-child { border-bottom: 0; }
  .user-name { display: grid; gap: 3px; }
  .user-actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .audit { margin-top: 20px; border-top: 1px solid var(--border-secondary); padding: 16px 0; }
  .audit summary { cursor: pointer; font-weight: 700; }
  .audit div { padding: 7px 0; color: var(--text-secondary); }
  @media (max-width: 900px) { .role-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .create-user { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 550px) { .users-settings { padding: 14px; } .role-grid, .create-user { grid-template-columns: 1fr; } .user-actions select { width: 100%; } }
</style>
