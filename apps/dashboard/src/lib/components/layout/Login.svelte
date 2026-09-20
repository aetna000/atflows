<script lang="ts">
  let { onsignedin, mustChange = false }: { onsignedin: (changeRequired: boolean) => void; mustChange?: boolean } = $props()
  let username = $state('administrator')
  let password = $state('')
  let busy = $state(false)
  let error = $state('')
  let newPassword = $state('')
  let repeatPassword = $state('')

  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    username = params.get('username') || 'administrator'
    password = params.get('password') || ''
    if (params.has('password')) {
      params.delete('password')
      params.delete('username')
      history.replaceState(null, '', `${window.location.pathname}${params.size ? `?${params}` : ''}${window.location.hash}`)
    }
  }

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
      onsignedin(!!result.password_change_required)
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
      newPassword = repeatPassword = ''
      onsignedin(false)
    } catch (cause) { error = (cause as Error).message }
    finally { busy = false }
  }
</script>

<div class="login-shell">
  <div class="login-brand"><span class="brand-mark" aria-hidden="true">◇</span><strong>AtFlows</strong></div>
  <form class="login-card" onsubmit={mustChange ? changePassword : signIn}>
    <span class="login-eyebrow">LOCAL OBSERVABILITY</span>
    <h1>{mustChange ? 'Choose your password' : 'Sign in to AtFlows'}</h1>
    <p>{mustChange ? 'Replace the temporary password to finish setup.' : 'Use the Local Administrator account for this installation.'}</p>
    {#if mustChange}
      <label for="new-password">New password</label>
      <input id="new-password" type="password" autocomplete="new-password" minlength="12" bind:value={newPassword} required />
      <label for="repeat-password">Repeat new password</label>
      <input id="repeat-password" type="password" autocomplete="new-password" minlength="12" bind:value={repeatPassword} required />
    {:else}
      <label for="login-username">Username</label>
      <input id="login-username" autocomplete="username" bind:value={username} required />
      <label for="login-password">Password</label>
      <input id="login-password" type="password" autocomplete="current-password" bind:value={password} required />
    {/if}
    {#if error}<p class="login-error" role="alert">{error}</p>{/if}
    <button type="submit" disabled={busy}>{busy ? 'Working…' : mustChange ? 'Set password' : 'Sign in'}</button>
    <small>First install? Run <code>atflows init</code>. It opens this form with the temporary Administrator password filled in.</small>
    <small>Lost access? Run <code>atflows users recover-administrator</code> in the local terminal. It creates a new temporary password.</small>
  </form>
</div>

<style>
  .login-shell { min-height: 100vh; display: grid; grid-template-rows: auto 1fr; }
  .login-brand { display: flex; align-items: center; gap: 12px; height: 64px; padding: 0 28px; border-bottom: 1px solid var(--border-primary); font-size: 21px; }
  .brand-mark { color: var(--accent-primary); font-size: 31px; line-height: 1; }
  .login-card { width: min(100% - 32px, 430px); align-self: center; justify-self: center; display: grid; gap: 10px; padding: 32px; border: 1px solid var(--border-secondary); background: var(--bg-secondary); }
  .login-eyebrow { color: var(--accent-primary); font-size: 11px; font-weight: 700; letter-spacing: .13em; }
  h1 { font-size: 25px; margin: 2px 0; }
  p, small { color: var(--text-secondary); }
  label { margin-top: 10px; color: var(--text-primary); font-weight: 600; }
  input { padding: 11px; border: 1px solid var(--border-secondary); background: var(--bg-primary); color: var(--text-primary); font: inherit; }
  button { margin-top: 12px; padding: 12px; border: 1px solid var(--accent-primary); background: var(--accent-primary); color: var(--bg-primary); font: inherit; font-weight: 700; cursor: pointer; }
  button:disabled { opacity: .6; cursor: wait; }
  .login-error { color: var(--error); }
  small { margin-top: 14px; line-height: 1.5; }
</style>
