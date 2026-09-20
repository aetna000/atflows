import { expect, test } from 'bun:test'
import { createAtMemAuth } from '../src/atmem-auth'

test('AtMem delegation uses live account roles and revocation without a second user store', async () => {
    let enabled = true
    let loggedOut = false
    let forwardedCookie = ''
    const server = Bun.serve({
        hostname: '127.0.0.1', port: 0,
        fetch(req) {
            forwardedCookie = req.headers.get('cookie') || ''
            if (new URL(req.url).pathname === '/api/auth/logout') {
                if (req.headers.get('x-csrf-token') !== 'fixture-csrf' || req.headers.get('origin') !== `http://127.0.0.1:${server.port}`) return new Response('denied', { status: 403 })
                loggedOut = true
                return Response.json({ logged_out: true })
            }
            return Response.json({
                format: 'atmem-local-auth-status-v1', authenticated: enabled && !loggedOut,
                account: enabled && !loggedOut ? { username: 'researcher', display_name: 'Researcher', role: 'investigator', enabled: true, password_change_required: false } : null,
                csrf_token: 'fixture-csrf',
            })
        },
    })
    try {
        const origin = `http://127.0.0.1:${server.port}`
        const auth = createAtMemAuth(origin, '127.0.0.1')
        const request = (pathname: string, method = 'GET') => new Request(`http://127.0.0.1:1337${pathname}`, {
            method, headers: { Cookie: 'atmem_session=fixture_session_token_123456789; unrelated=private', Origin: 'http://127.0.0.1:1337' },
        })
        expect((await auth.account(request('/api/traces')))?.role).toBe('investigator')
        expect(forwardedCookie).toBe('atmem_session=fixture_session_token_123456789')
        const status = await auth.route(request('/api/auth/status'))
        expect((await status?.json()).mode).toBe('atmem')
        expect((await auth.route(request('/api/users')))?.status).toBe(403)
        expect((await auth.route(request('/api/auth/login', 'POST')))?.status).toBe(409)
        enabled = false
        expect(await auth.account(request('/api/traces'))).toBeNull()
        enabled = true
        const logout = await auth.route(request('/api/auth/logout', 'POST'))
        expect(logout?.status).toBe(200)
        expect(logout?.headers.get('set-cookie')).toContain('atmem_session=;')
        expect(loggedOut).toBe(true)
        expect(await auth.account(request('/api/traces'))).toBeNull()
    } finally {
        server.stop(true)
    }
})

test('delegation refuses remote or differently hosted AtMem authorities', () => {
    expect(() => createAtMemAuth('https://example.com', '127.0.0.1')).toThrow()
    expect(() => createAtMemAuth('http://127.0.0.1:57329', 'localhost')).toThrow()
    expect(() => createAtMemAuth('http://127.0.0.1:57329/path', '127.0.0.1')).toThrow()
})
