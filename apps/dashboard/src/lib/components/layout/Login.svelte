<script lang="ts">
  let { onsignedin }: { onsignedin: () => void } = $props()
  let username = $state('administrator')
  let password = $state('')
  let busy = $state(false)
  let error = $state('')

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
      password = ''
      onsignedin()
    } catch (cause) {
      error = (cause as Error).message
    } finally {
      busy = false
    }
  }
</script>

<div class="login-shell">
  <div class="login-brand"><span class="brand-mark" aria-hidden="true">◇</span><strong>AtFlows</strong></div>
  <form class="login-card" onsubmit={signIn}>
    <span class="login-eyebrow">LOCAL OBSERVABILITY</span>
    <h1>Sign in to AtFlows</h1>
    <p>Use the Local Administrator account for this installation.</p>
    <label for="login-username">Username</label>
    <input id="login-username" autocomplete="username" bind:value={username} required />
    <label for="login-password">Password</label>
    <input id="login-password" type="password" autocomplete="current-password" bind:value={password} required />
    {#if error}<p class="login-error" role="alert">{error}</p>{/if}
    <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    <small>The initial password is printed in the AtFlows terminal once. Set <code>ATFLOWS_ADMIN_PASSWORD</code> and restart to replace it.</small>
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
