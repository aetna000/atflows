import { expect, test } from 'bun:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createLocalAuth } from '../src/auth'

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
        const logout = new Request('http://localhost:3000/api/auth/logout', { method: 'POST', headers: { Origin: 'http://localhost:3000', Cookie: cookie.split(';')[0] } })
        expect((await auth.route(logout, '127.0.0.1'))?.status).toBe(200)
        expect(auth.authenticated(request)).toBe(false)
    } finally {
        if (before === undefined) delete process.env.ATFLOWS_ADMIN_PASSWORD
        else process.env.ATFLOWS_ADMIN_PASSWORD = before
        fs.rmSync(dir, { recursive: true, force: true })
    }
})
