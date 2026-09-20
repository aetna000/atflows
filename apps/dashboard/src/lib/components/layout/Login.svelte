<script lang="ts">
  import { onMount } from 'svelte'
  import type { Account } from '$lib/stores/auth.svelte'
  let { onsignedin, mustChange = false }: { onsignedin: (changeRequired: boolean, account: Account) => void; mustChange?: boolean } = $props()
  let username = $state('administrator')
  let password = $state('')
  let busy = $state(false)
  let error = $state('')
  let newPassword = $state('')
  let repeatPassword = $state('')
  let showPassword = $state(false)
  let showNewPassword = $state(false)
  let showRepeatPassword = $state(false)

  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    username = params.get('username') || 'administrator'
  }

  onMount(() => {
    const setup = new URLSearchParams(window.location.hash.slice(1)).get('setup')
    if (!setup) return
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    void (async () => {
      try {
        const response = await fetch('/api/auth/setup-prefill', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: setup }),
        })
        if (!response.ok) throw new Error('Setup link expired. Use the temporary password shown in your terminal.')
        const result = await response.json()
        username = result.username
        password = result.password
      } catch (cause) { error = (cause as Error).message }
    })()
  })

  async function signIn(event: SubmitEvent) {
    event.preventDefault()
    busy = true
    error = ''
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!response.ok) {
        const body = await response.json()
        throw new Error(body.error || 'Sign in failed')
      }
      const result = await response.json()
      password = ''
      onsignedin(!!result.password_change_required, result.account)
    } catch (cause) {
      error = (cause as Error).message
    } finally {
      busy = false
    }
  }

  async function changePassword(event: SubmitEvent) {
    event.preventDefault()
    if (newPassword !== repeatPassword) { error = 'Passwords do not match'; return }
    busy = true
    error = ''
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: newPassword }),
      })
      if (!response.ok) { const body = await response.json(); throw new Error(body.error || 'Could not change password') }
      const result = await response.json()
      newPassword = repeatPassword = ''
      onsignedin(false, result.account)
    } catch (cause) { error = (cause as Error).message }
    finally { busy = false }
  }
</script>

<div class="login-shell">
  <div class="login-brand">
    <svg class="brand-mark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 6.5 L5.5 17.5 M12 6.5 L18.5 17.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
      <circle cx="12" cy="5" r="2.6" fill="currentColor" />
      <circle cx="5" cy="18.5" r="2.2" fill="none" stroke="currentColor" stroke-width="1.4" />
      <circle cx="19" cy="18.5" r="2.2" fill="none" stroke="currentColor" stroke-width="1.4" />
    </svg>
    <strong>AtMem.ai <span class="brand-separator">|</span> AtFlows</strong>
  </div>
  <form class="login-card" onsubmit={mustChange ? changePassword : signIn}>
    <span class="login-eyebrow">LOCAL OBSERVABILITY</span>
    <h1>{mustChange ? 'Choose your password' : 'Sign in to AtFlows'}</h1>
    <p>{mustChange ? 'Replace the temporary password to finish setup.' : 'Use your AtFlows account to sign in.'}</p>
    {#if mustChange}
      <label for="new-password">New password</label>
      <div class="password-field">
        <input id="new-password" type={showNewPassword ? 'text' : 'password'} autocomplete="new-password" bind:value={newPassword} required />
        <button type="button" class="password-toggle" aria-label={showNewPassword ? 'Hide new password' : 'Show new password'} aria-pressed={showNewPassword} onclick={() => showNewPassword = !showNewPassword}>{showNewPassword ? 'Hide' : 'Show'}</button>
      </div>
      <label for="repeat-password">Repeat new password</label>
      <div class="password-field">
        <input id="repeat-password" type={showRepeatPassword ? 'text' : 'password'} autocomplete="new-password" bind:value={repeatPassword} required />
        <button type="button" class="password-toggle" aria-label={showRepeatPassword ? 'Hide repeated password' : 'Show repeated password'} aria-pressed={showRepeatPassword} onclick={() => showRepeatPassword = !showRepeatPassword}>{showRepeatPassword ? 'Hide' : 'Show'}</button>
      </div>
    {:else}
      <label for="login-username">Username</label>
      <input id="login-username" autocomplete="username" bind:value={username} required />
      <label for="login-password">Password</label>
      <div class="password-field">
        <input id="login-password" type={showPassword ? 'text' : 'password'} autocomplete="current-password" bind:value={password} required />
        <button type="button" class="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onclick={() => showPassword = !showPassword}>{showPassword ? 'Hide' : 'Show'}</button>
      </div>
    {/if}
    {#if error}<p class="login-error" role="alert">{error}</p>{/if}
    <button type="submit" disabled={busy}>{busy ? 'Working…' : mustChange ? 'Set password' : 'Sign in'}</button>
    <small>First install? Run <code>atflows init</code>. It opens this form with the temporary Administrator password filled in.</small>
    <small>Lost access? Run <code>atflows users recover-administrator</code> in the local terminal. It creates a new temporary password.</small>
  </form>
</div>

<style>
  .login-shell { flex: 1; display: grid; grid-template-rows: auto 1fr; }
  .login-brand { display: flex; align-items: center; gap: 12px; height: 64px; padding: 0 28px; border-bottom: 1px solid var(--border-primary); font-size: 21px; }
  .brand-mark { width: 24px; height: 24px; color: var(--accent-primary); flex: none; }
  .brand-separator { color: var(--text-secondary); padding: 0 4px; }
  .login-card { width: min(100% - 32px, 430px); align-self: center; justify-self: center; display: grid; gap: 10px; padding: 32px; border: 1px solid var(--border-secondary); background: var(--bg-secondary); }
  .login-eyebrow { color: var(--accent-primary); font-size: 11px; font-weight: 700; letter-spacing: .13em; }
  h1 { font-size: 25px; margin: 2px 0; }
  p, small { color: var(--text-secondary); }
  label { margin-top: 10px; color: var(--text-primary); font-weight: 600; }
  input { padding: 11px; border: 1px solid var(--border-secondary); background: var(--bg-primary); color: var(--text-primary); font: inherit; }
  .password-field { display: flex; min-width: 0; }
  .password-field input { flex: 1; min-width: 0; }
  .password-toggle { margin: 0; padding: 0 12px; border: 1px solid var(--border-secondary); border-left: 0; background: var(--bg-tertiary); color: var(--text-primary); font: inherit; cursor: pointer; }
  button { margin-top: 12px; padding: 12px; border: 1px solid var(--accent-primary); background: var(--accent-primary); color: var(--bg-primary); font: inherit; font-weight: 700; cursor: pointer; }
  button:disabled { opacity: .6; cursor: wait; }
  .login-error { color: var(--error); }
  small { margin-top: 14px; line-height: 1.5; }
</style>
