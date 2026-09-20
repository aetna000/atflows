import { expect, test } from 'bun:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createLocalAuth, requiredDashboardRole, allowsRole } from '../src/auth'

test('dashboard routes enforce the four role levels', () => {
    expect(requiredDashboardRole('/api/stats', 'GET')).toBe('viewer')
    expect(requiredDashboardRole('/api/analytics', 'GET')).toBe('viewer')
    expect(requiredDashboardRole('/api/logs', 'GET')).toBe('investigator')
    expect(requiredDashboardRole('/api/traces/example', 'GET')).toBe('investigator')
    expect(requiredDashboardRole('/api/settings/database', 'GET')).toBe('administrator')
    expect(requiredDashboardRole('/api/integrations', 'GET')).toBe('administrator')
    expect(requiredDashboardRole('/api/data', 'DELETE')).toBe('administrator')
    expect(allowsRole('viewer', 'investigator')).toBe(false)
    expect(allowsRole('investigator', 'administrator')).toBe(false)
    expect(allowsRole('evidence_collector', 'investigator')).toBe(true)
})

test('local sign-in uses a protected password record and revocable cookie', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atflows-auth-'))
    const before = process.env.ATFLOWS_ADMIN_PASSWORD
    process.env.ATFLOWS_ADMIN_PASSWORD = 'test-password'
    try {
        const auth = createLocalAuth(dir)
        const target = path.join(dir, 'admin-auth.json')
        expect(fs.statSync(target).mode & 0o777).toBe(0o600)
        expect(fs.readFileSync(target, 'utf8')).not.toContain('test-password')
        const login = (password: string, origin = 'http://localhost:3000') => new Request('http://localhost:3000/api/auth/login', {
            method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'administrator', password }),
        })
        expect((await auth.route(login('test-password', 'http://wrong.test'), '127.0.0.1'))?.status).toBe(403)
        expect((await auth.route(login('wrong'), '127.0.0.1'))?.status).toBe(401)
        const response = await auth.route(login('test-password'), '127.0.0.1')
        expect(response?.status).toBe(200)
        const cookie = response!.headers.get('set-cookie')!
        expect(cookie).toContain('HttpOnly')
        expect(cookie).toContain('SameSite=Strict')
        const request = new Request('http://localhost:3000/api/traces', { headers: { Cookie: cookie.split(';')[0] } })
        expect(auth.authenticated(request)).toBe(true)
        const duplicateCookie = new Request('http://localhost:3000/api/traces', { headers: { Cookie: `atflows_session=invalid; ${cookie.split(';')[0]}` } })
        expect(auth.authenticated(duplicateCookie)).toBe(true)
        const sessionsFile = path.join(dir, 'admin-sessions.json')
        expect(fs.statSync(sessionsFile).mode & 0o777).toBe(0o600)
        expect(fs.readFileSync(sessionsFile, 'utf8')).not.toContain(cookie.split(';')[0].split('=')[1])
        const restarted = createLocalAuth(dir)
        expect(restarted.authenticated(request)).toBe(true)
        const logout = new Request('http://localhost:3000/api/auth/logout', { method: 'POST', headers: { Origin: 'http://localhost:3000', Cookie: cookie.split(';')[0] } })
        expect((await restarted.route(logout, '127.0.0.1'))?.status).toBe(200)
        expect(createLocalAuth(dir).authenticated(request)).toBe(false)
    } finally {
        if (before === undefined) delete process.env.ATFLOWS_ADMIN_PASSWORD
        else process.env.ATFLOWS_ADMIN_PASSWORD = before
        fs.rmSync(dir, { recursive: true, force: true })
    }
})

test('damaged managed account data leaves administrator recovery available', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atflows-damaged-users-'))
    const before = process.env.ATFLOWS_ADMIN_PASSWORD
    process.env.ATFLOWS_ADMIN_PASSWORD = 'admin-test-password'
    try {
        fs.writeFileSync(path.join(dir, 'users.json'), '{invalid', { mode: 0o600 })
        const auth = createLocalAuth(dir)
        const origin = 'http://localhost:3000'
        const login = await auth.route(new Request(`${origin}/api/auth/login`, {
            method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'administrator', password: 'admin-test-password' }),
        }), '127.0.0.1')
        expect(login?.status).toBe(200)
        const cookie = login!.headers.get('set-cookie')!.split(';')[0]
        const users = await auth.route(new Request(`${origin}/api/users`, { headers: { Cookie: cookie } }), '127.0.0.1')
        expect(users?.status).toBe(503)
        expect(fs.readFileSync(path.join(dir, 'users.json'), 'utf8')).toBe('{invalid')
    } finally {
        if (before === undefined) delete process.env.ATFLOWS_ADMIN_PASSWORD
        else process.env.ATFLOWS_ADMIN_PASSWORD = before
        fs.rmSync(dir, { recursive: true, force: true })
    }
})

test('damaged Administrator record can be repaired with a configured password', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atflows-damaged-admin-'))
    const previous = process.env.ATFLOWS_ADMIN_PASSWORD
    process.env.ATFLOWS_ADMIN_PASSWORD = 'recovery-password'
    try {
        fs.writeFileSync(path.join(dir, 'admin-auth.json'), '{invalid', { mode: 0o600 })
        const auth = createLocalAuth(dir)
        const origin = 'http://localhost:3000'
        const response = await auth.route(new Request(`${origin}/api/auth/login`, {
            method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'administrator', password: 'recovery-password' }),
        }), '127.0.0.1')
        expect(response?.status).toBe(200)
        expect(fs.readFileSync(path.join(dir, 'admin-auth.json'), 'utf8')).not.toContain('recovery-password')
    } finally {
        if (previous === undefined) delete process.env.ATFLOWS_ADMIN_PASSWORD
        else process.env.ATFLOWS_ADMIN_PASSWORD = previous
        fs.rmSync(dir, { recursive: true, force: true })
    }
})

test('init prefill uses a local one-time token instead of putting the password in the URL', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atflows-setup-prefill-'))
    const previous = {
        admin: process.env.ATFLOWS_ADMIN_PASSWORD,
        token: process.env.ATFLOWS_SETUP_TOKEN,
        password: process.env.ATFLOWS_SETUP_PREFILL_PASSWORD,
    }
    delete process.env.ATFLOWS_ADMIN_PASSWORD
    process.env.ATFLOWS_SETUP_TOKEN = 'setup-token-value'
    process.env.ATFLOWS_SETUP_PREFILL_PASSWORD = 'temporary-password'
    try {
        const auth = createLocalAuth(dir)
        const request = (token: string, origin = 'http://localhost:3000') => new Request('http://localhost:3000/api/auth/setup-prefill', {
            method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
        })
        expect((await auth.route(request('setup-token-value', 'http://other.test'), '127.0.0.1'))?.status).toBe(403)
        expect((await auth.route(request('setup-token-value'), '192.0.2.10'))?.status).toBe(403)
        expect((await auth.route(request('wrong'), '127.0.0.1'))?.status).toBe(404)
        const response = await auth.route(request('setup-token-value'), '127.0.0.1')
        expect(response?.status).toBe(200)
        expect((await response!.json()).password).toBe('temporary-password')
        expect(response?.headers.get('cache-control')).toBe('no-store')
        expect((await auth.route(request('setup-token-value'), '127.0.0.1'))?.status).toBe(404)
    } finally {
        if (previous.admin === undefined) delete process.env.ATFLOWS_ADMIN_PASSWORD
        else process.env.ATFLOWS_ADMIN_PASSWORD = previous.admin
        if (previous.token === undefined) delete process.env.ATFLOWS_SETUP_TOKEN
        else process.env.ATFLOWS_SETUP_TOKEN = previous.token
        if (previous.password === undefined) delete process.env.ATFLOWS_SETUP_PREFILL_PASSWORD
        else process.env.ATFLOWS_SETUP_PREFILL_PASSWORD = previous.password
        fs.rmSync(dir, { recursive: true, force: true })
    }
})

test('administrator may choose a short password but not an empty one', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atflows-short-password-'))
    const before = process.env.ATFLOWS_ADMIN_PASSWORD
    process.env.ATFLOWS_ADMIN_PASSWORD = 'initial-password'
    try {
        const auth = createLocalAuth(dir)
        const origin = 'http://localhost:3000'
        const login = await auth.route(new Request(`${origin}/api/auth/login`, {
            method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'administrator', password: 'initial-password' }),
        }), '127.0.0.1')
        const cookie = login!.headers.get('set-cookie')!.split(';')[0]
        const change = (newPassword: string) => new Request(`${origin}/api/auth/change-password`, {
            method: 'POST', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
            body: JSON.stringify({ new_password: newPassword, current_password: 'initial-password' }),
        })
        expect((await auth.route(change(''), '127.0.0.1'))?.status).toBe(400)
        expect((await auth.route(change('a'), '127.0.0.1'))?.status).toBe(200)
        const freshLogin = await auth.route(new Request(`${origin}/api/auth/login`, {
            method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'administrator', password: 'a' }),
        }), '127.0.0.1')
        const freshCookie = freshLogin!.headers.get('set-cookie')!.split(';')[0]
        expect((await auth.route(new Request(`${origin}/api/auth/change-password`, {
            method: 'POST', headers: { Origin: origin, Cookie: freshCookie, 'Content-Type': 'application/json' },
            body: JSON.stringify({ current_password: 'wrong', new_password: 'other' }),
        }), '127.0.0.1'))?.status).toBe(403)
        expect(fs.readFileSync(path.join(dir, 'admin-auth.json'), 'utf8')).not.toContain('"a"')
        expect((await auth.route(new Request(`${origin}/api/auth/login`, {
            method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'administrator', password: 'a' }),
        }), '127.0.0.1'))?.status).toBe(200)
    } finally {
        if (before === undefined) delete process.env.ATFLOWS_ADMIN_PASSWORD
        else process.env.ATFLOWS_ADMIN_PASSWORD = before
        fs.rmSync(dir, { recursive: true, force: true })
    }
})

test('administrator manages role-bound accounts and changes revoke sessions', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atflows-users-'))
    const before = process.env.ATFLOWS_ADMIN_PASSWORD
    process.env.ATFLOWS_ADMIN_PASSWORD = 'admin-test-password'
    const origin = 'http://localhost:3000'
    const request = (pathname: string, body?: unknown, cookie?: string) => new Request(`${origin}${pathname}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { ...(body === undefined ? {} : { Origin: origin, 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
    })
    try {
        const auth = createLocalAuth(dir)
        const adminLogin = await auth.route(request('/api/auth/login', { username: 'administrator', password: 'admin-test-password' }), '127.0.0.1')
        const adminCookie = adminLogin!.headers.get('set-cookie')!.split(';')[0]
        const created = await auth.route(request('/api/users/create', { username: 'auditor-1', display_name: 'Audit team', role: 'viewer' }, adminCookie), '127.0.0.1')
        expect(created?.status).toBe(201)
        const password = (await created!.json()).temporary_password
        expect(fs.readFileSync(path.join(dir, 'users.json'), 'utf8')).not.toContain(password)
        const userLogin = await auth.route(request('/api/auth/login', { username: 'auditor-1', password }), '127.0.0.1')
        const userCookie = userLogin!.headers.get('set-cookie')!.split(';')[0]
        expect((await userLogin!.json()).password_change_required).toBe(true)
        const changed = await auth.route(request('/api/auth/change-password', { new_password: 'new-user-password' }, userCookie), '127.0.0.1')
        expect(changed?.status).toBe(200)
        const changedCookie = changed!.headers.get('set-cookie')!.split(';')[0]
        expect(auth.authenticated(request('/api/stats', undefined, userCookie))).toBe(false)
        const userRequest = request('/api/stats', undefined, changedCookie)
        expect(auth.ready(userRequest)).toBe(true)
        expect(auth.role(userRequest)).toBe('viewer')
        expect((await auth.route(request('/api/users', undefined, changedCookie), '127.0.0.1'))?.status).toBe(403)
        const promoted = await auth.route(request('/api/users/update', { username: 'auditor-1', role: 'investigator' }, adminCookie), '127.0.0.1')
        expect(promoted?.status).toBe(200)
        expect(auth.authenticated(userRequest)).toBe(false)
        const restarted = createLocalAuth(dir)
        expect((await restarted.route(request('/api/users', undefined, adminCookie), '127.0.0.1'))?.status).toBe(200)
        const relogin = await restarted.route(request('/api/auth/login', { username: 'auditor-1', password: 'new-user-password' }), '127.0.0.1')
        const freshCookie = relogin!.headers.get('set-cookie')!.split(';')[0]
        expect(restarted.role(request('/api/stats', undefined, freshCookie))).toBe('investigator')
        await restarted.route(request('/api/users/update', { username: 'auditor-1', enabled: false }, adminCookie), '127.0.0.1')
        expect(restarted.authenticated(request('/api/stats', undefined, freshCookie))).toBe(false)
        expect((await restarted.route(request('/api/auth/login', { username: 'auditor-1', password: 'new-user-password' }), '127.0.0.1'))?.status).toBe(401)
    } finally {
        if (before === undefined) delete process.env.ATFLOWS_ADMIN_PASSWORD
        else process.env.ATFLOWS_ADMIN_PASSWORD = before
        fs.rmSync(dir, { recursive: true, force: true })
    }
})
