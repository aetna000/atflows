<script lang="ts">
  import { authAccount } from '$lib/stores/auth.svelte'

  let currentPassword = $state('')
  let newPassword = $state('')
  let repeatPassword = $state('')
  let showPasswords = $state(false)
  let busy = $state(false)
  let message = $state('')
  let error = $state('')

  async function changePassword(event: SubmitEvent) {
    event.preventDefault()
    if (newPassword !== repeatPassword) { error = 'Passwords do not match'; return }
    busy = true
    message = ''
    error = ''
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not change password')
      authAccount.value = result.account
      currentPassword = newPassword = repeatPassword = ''
      message = 'Password changed. Your other sessions have been signed out.'
    } catch (cause) { error = (cause as Error).message }
    finally { busy = false }
  }
</script>

<section class="account-settings">
  <div class="account-heading"><span>Configuration</span><h2>My account</h2><p>Manage your local sign-in</p></div>
  <div class="account-card">
    <div class="account-summary"><strong>{authAccount.value?.display_name}</strong><span>{authAccount.value?.username} · {authAccount.value?.role.replace('_', ' ')}</span></div>
    <form onsubmit={changePassword}>
      <h3>Change password</h3>
      <label>Current password<input required type={showPasswords ? 'text' : 'password'} autocomplete="current-password" bind:value={currentPassword} /></label>
      <label>New password<input required type={showPasswords ? 'text' : 'password'} autocomplete="new-password" bind:value={newPassword} /></label>
      <label>Repeat new password<input required type={showPasswords ? 'text' : 'password'} autocomplete="new-password" bind:value={repeatPassword} /></label>
      <label class="show-passwords"><input type="checkbox" bind:checked={showPasswords} /> Show passwords</label>
      <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button>
      {#if error}<p class="error" role="alert">{error}</p>{/if}
      {#if message}<p class="success" role="status">{message}</p>{/if}
    </form>
  </div>
</section>

<style>
  .account-settings { padding: 24px; max-width: 800px; }
  .account-heading { border-bottom: 1px solid var(--border-secondary); padding-bottom: 18px; margin-bottom: 24px; }
  .account-heading span { color: var(--accent-primary); text-transform: uppercase; font: 800 11px ui-monospace, monospace; letter-spacing: .1em; }
  h2 { font: 700 26px ui-monospace, monospace; margin: 10px 0 4px; }
  .account-heading p, .account-summary span { color: var(--text-secondary); }
  .account-card { border: 1px solid var(--border-secondary); background: var(--bg-secondary); }
  .account-summary { padding: 18px; border-bottom: 1px solid var(--border-secondary); display: grid; gap: 4px; }
  .account-summary strong { font-size: 16px; }
  .account-card form { padding: 18px; display: grid; gap: 12px; }
  h3 { font-size: 16px; }
  label { display: grid; gap: 5px; font-weight: 600; color: var(--text-secondary); }
  input:not([type=checkbox]) { border: 1px solid var(--border-secondary); background: var(--bg-primary); color: var(--text-primary); min-height: 38px; padding: 8px; font: inherit; }
  .show-passwords { display: flex; align-items: center; gap: 8px; font-weight: 400; }
  button { width: fit-content; border: 1px solid var(--accent-primary); background: var(--accent-primary); color: var(--bg-primary); padding: 9px 14px; font: inherit; font-weight: 700; cursor: pointer; }
  button:disabled { opacity: .5; cursor: default; }
  .error { color: var(--error); } .success { color: var(--success); }
  @media (max-width: 550px) { .account-settings { padding: 14px; } }
</style>
